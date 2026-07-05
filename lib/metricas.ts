// Utilitários puros do módulo Analytics & Royalties — agregação, formatação
// e a paleta categórica dos gráficos. Sem imports server-only: usado em
// Server Components (painel/números) e nos componentes de gráfico (client).
import type { MetricaDetalhada, TotaisMetricas, LinhaAgregada, LinhaFaixaAgregada } from "@/types/analytics";

// ------------------------------------------------------------------
// Câmbio USD/BRL — normalização ANTES de agregar
//
// `metricas.moeda` diz em que moeda aquela LINHA foi lançada; as agregações
// abaixo (totaisMetricas/porFaixa/porMes/...) somam `receita` cegamente, e
// somar USD com BRL sem converter primeiro daria um número sem sentido. Em
// vez de espalhar a conversão por cada função de agregação, convertemos a
// receita de toda linha em USD para BRL (pela cotação do dia) ANTES de
// agregar — a partir daí, todo `receita` no pipeline já é BRL, e a exibição
// dual (ver lib/cambio.ts#formatarValorDual) trata esse total como um valor
// em BRL para mostrar o equivalente em US$ ao lado.
export function converterReceitaParaBRL(metricas: MetricaDetalhada[], taxaUsdBrl: number): MetricaDetalhada[] {
  return metricas.map((m) => {
    if ((m.moeda ?? "BRL") !== "USD" || m.receita == null) return { ...m, moeda: "BRL" as const };
    return { ...m, receita: m.receita * taxaUsdBrl, moeda: "BRL" as const };
  });
}

// ------------------------------------------------------------------
// Totais e agregações
// ------------------------------------------------------------------

export function totaisMetricas(metricas: MetricaDetalhada[]): TotaisMetricas {
  return metricas.reduce<TotaisMetricas>(
    (acc, m) => ({
      streams: acc.streams + (m.streams ?? 0),
      receita: acc.receita + (m.receita ?? 0),
    }),
    { streams: 0, receita: 0 },
  );
}

// Agrupamento genérico streams/receita por uma chave qualquer, preservando
// a ordem de primeira aparição (importante para o gráfico de meses).
function agrupar(
  metricas: MetricaDetalhada[],
  chaveDe: (m: MetricaDetalhada) => string | null,
  rotuloDe: (chave: string, m: MetricaDetalhada) => string,
): LinhaAgregada[] {
  const porChave = new Map<string, LinhaAgregada>();
  for (const m of metricas) {
    const chave = chaveDe(m);
    if (chave == null) continue;
    const existente = porChave.get(chave);
    if (existente) {
      existente.streams += m.streams ?? 0;
      existente.receita += m.receita ?? 0;
    } else {
      porChave.set(chave, { chave, rotulo: rotuloDe(chave, m), streams: m.streams ?? 0, receita: m.receita ?? 0 });
    }
  }
  return Array.from(porChave.values());
}

export function porPlataforma(metricas: MetricaDetalhada[]): LinhaAgregada[] {
  return agrupar(metricas, (m) => m.plataforma, (chave) => chave)
    .sort((a, b) => b.receita - a.receita);
}

export function porArtista(metricas: MetricaDetalhada[]): LinhaAgregada[] {
  return agrupar(
    metricas,
    (m) => m.artistaId,
    (chave, m) => m.artistaNome ?? chave,
  ).sort((a, b) => b.receita - a.receita);
}

// LEFT JOIN "faixas do catálogo" x "métricas agregadas por faixa": toda
// faixa em `faixas` aparece uma vez, mesmo sem nenhuma métrica ainda
// importada/sincronizada (streams/receita null -> "—" na UI). Métricas sem
// faixaId continuam de fora (só entram nos totais/por-plataforma); uma
// métrica cujo faixaId não está em `faixas` (não deveria acontecer, mas não
// é motivo para descartar dado real) ainda entra, usando o título resolvido
// no join da query (`faixaTitulo`).
// Ordenação: faixas com número primeiro (streams desc), depois o resto em
// ordem alfabética — assim quem tem dado real fica no topo e o restante
// (ainda sem sincronizar/importar) fica previsível de achar.
export function porFaixa(
  faixas: { id: string; titulo: string }[],
  metricas: MetricaDetalhada[],
): LinhaFaixaAgregada[] {
  const agregadoPorFaixa = new Map<string, { titulo: string; streams: number; receita: number }>();
  for (const m of metricas) {
    if (!m.faixaId) continue;
    const existente = agregadoPorFaixa.get(m.faixaId);
    if (existente) {
      existente.streams += m.streams ?? 0;
      existente.receita += m.receita ?? 0;
    } else {
      agregadoPorFaixa.set(m.faixaId, {
        titulo: m.faixaTitulo ?? m.faixaId,
        streams: m.streams ?? 0,
        receita: m.receita ?? 0,
      });
    }
  }

  const tituloPorId = new Map<string, string>();
  for (const f of faixas) tituloPorId.set(f.id, f.titulo);
  for (const [id, agr] of agregadoPorFaixa) if (!tituloPorId.has(id)) tituloPorId.set(id, agr.titulo);

  const linhas: LinhaFaixaAgregada[] = Array.from(tituloPorId.entries()).map(([id, titulo]) => {
    const agr = agregadoPorFaixa.get(id);
    const streams = agr ? agr.streams : null;
    const receita = agr ? agr.receita : null;
    return {
      chave: id,
      rotulo: titulo,
      streams,
      receita,
      receitaPor1kStreams: streams != null && receita != null ? receitaPor1kStreams(receita, streams) : null,
    };
  });

  const comNumeros = linhas
    .filter((l) => l.streams != null)
    .sort((a, b) => (b.streams as number) - (a.streams as number));
  const semNumeros = linhas
    .filter((l) => l.streams == null)
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  return [...comNumeros, ...semNumeros];
}

// Agrega streams/receita por (faixa, plataforma) — base da estimativa de
// receita por plataforma (ver lib/estimativa.ts#estimarReceitaPorFaixa):
// sem esse nível de detalhe, a estimativa não saberia quanto de
// streams/receita veio do YouTube vs. Spotify vs. Deezer dentro da MESMA
// faixa, e não poderia aplicar a taxa certa nem preservar receita real por
// plataforma. Métrica sem faixaId fica de fora (mesmo critério de porFaixa).
export function porFaixaEPlataforma(
  metricas: MetricaDetalhada[],
): Map<string, { streams: Record<string, number>; receita: Record<string, number> }> {
  const porFaixa = new Map<string, { streams: Record<string, number>; receita: Record<string, number> }>();
  for (const m of metricas) {
    if (!m.faixaId) continue;
    const atual = porFaixa.get(m.faixaId) ?? { streams: {}, receita: {} };
    atual.streams[m.plataforma] = (atual.streams[m.plataforma] ?? 0) + (m.streams ?? 0);
    atual.receita[m.plataforma] = (atual.receita[m.plataforma] ?? 0) + (m.receita ?? 0);
    porFaixa.set(m.faixaId, atual);
  }
  return porFaixa;
}

// Shape para o gráfico de barras empilhado "streams por artista, por
// plataforma": uma linha por artista, uma chave dinâmica por plataforma
// (soma de streams). `series` traz as plataformas na ordem estável passada
// (ver PALETA_CATEGORICA/corCategoria) para a legenda e as cores baterem
// entre re-renderizações mesmo com o filtro trocando o conjunto de artistas.
export function porArtistaEPlataforma(
  metricas: MetricaDetalhada[],
): Record<string, string | number>[] {
  const porArtista = new Map<string, Record<string, string | number>>();
  for (const m of metricas) {
    const linha = porArtista.get(m.artistaId) ?? { chave: m.artistaId, rotulo: m.artistaNome ?? m.artistaId };
    const atual = typeof linha[m.plataforma] === "number" ? (linha[m.plataforma] as number) : 0;
    linha[m.plataforma] = atual + (m.streams ?? 0);
    porArtista.set(m.artistaId, linha);
  }
  return Array.from(porArtista.values()).sort((a, b) => {
    const totalA = Object.values(a).filter((v): v is number => typeof v === "number").reduce((s, v) => s + v, 0);
    const totalB = Object.values(b).filter((v): v is number => typeof v === "number").reduce((s, v) => s + v, 0);
    return totalB - totalA;
  });
}

// Chave "YYYY-MM" a partir de metricas.data (coluna `date` pura, "YYYY-MM-DD").
function chaveMesMetrica(data: string): string {
  return data.slice(0, 7);
}

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  const nome = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" })
    .format(new Date(Date.UTC(ano, mes - 1, 1)));
  return `${nome.replace(".", "")}/${String(ano).slice(2)}`;
}

// Série mensal ordenada cronologicamente — base do gráfico de linha de receita.
export function porMes(metricas: MetricaDetalhada[]): LinhaAgregada[] {
  return agrupar(metricas, (m) => chaveMesMetrica(m.data), (chave) => rotuloMes(chave))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

// R$ por 1.000 streams — só calculável quando há streams > 0; "—" na UI
// quando null (linha só de receita, sem contagem de streams importada).
export function receitaPor1kStreams(receita: number, streams: number): number | null {
  if (!streams || streams <= 0) return null;
  return (receita / streams) * 1000;
}

// ------------------------------------------------------------------
// Estimativa por RPM + recebimento por split (%)
//
// O YouTube entrega VIEWS, não R$ — faixas sincronizadas por lá aparecem
// com receita real 0/nula mesmo tendo audiência real. Quando o usuário
// informa um RPM (R$ por 1.000 views), essas faixas ganham uma receita
// ESTIMADA (streams/1000 × rpm) só para dar uma noção de R$ — a receita
// REAL importada (CSV/planilha) sempre tem prioridade e nunca é sobrescrita.
// ------------------------------------------------------------------

export interface ReceitaComEstimativa {
  valor: number | null;
  estimada: boolean;
}

// receita > 0 é tratada como "real" e vence a estimativa. receita null/0 com
// streams > 0 e rpm > 0 vira estimativa (marcada `estimada: true` para a UI
// exibir o selo "est."). Sem streams ou sem rpm, devolve a receita original
// (null ou 0) sem estimar nada.
export function receitaComEstimativa(
  receita: number | null,
  streams: number | null,
  rpm: number | null,
): ReceitaComEstimativa {
  if (receita != null && receita > 0) return { valor: receita, estimada: false };
  if (rpm != null && rpm > 0 && streams != null && streams > 0) {
    return { valor: (streams / 1000) * rpm, estimada: true };
  }
  return { valor: receita, estimada: false };
}

// Recebimento do artista numa faixa = receita da faixa (real ou estimada) ×
// seu percentual de split. null quando não há nenhuma receita/estimativa
// para basear o cálculo (faixa sem métrica nenhuma ainda).
export function recebimentoArtista(receita: number | null, percentual: number): number | null {
  if (receita == null) return null;
  return receita * (percentual / 100);
}

// ------------------------------------------------------------------
// Formatação (pt-BR)
// ------------------------------------------------------------------

export function formatarReceita(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarStreams(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

// Discriminador usado pelos componentes de gráfico (client): Server
// Components não podem passar funções como prop para Client Components
// (não são serializáveis pelo RSC), então as páginas passam "streams" |
// "receita" e o formatador de fato é escolhido aqui, do lado do client.
export type FormatoValor = "streams" | "receita";

export function formatarValorPorTipo(formato: FormatoValor, valor: number): string {
  return formato === "streams" ? formatarStreams(valor) : formatarReceita(valor);
}

// ------------------------------------------------------------------
// Paleta categórica dos gráficos (dark-only — o app não tem modo claro).
//
// Slot 1 é um passo mais escuro do dourado da marca (tokens.colors.accent
// #F5C518 tem L≈0.84 em OKLCH — claro demais para a faixa 0.48–0.67 que o
// modo dark exige em uma paleta categórica). Os slots 2–5 vêm da paleta de
// referência da skill de dataviz, já validados para o mesmo modo.
//
// Validado com:
//   node scripts/validate_palette.js \
//     "#A9820A,#3987e5,#199e70,#9085e9,#d55181" --mode dark --surface "#151316"
//   -> ALL CHECKS PASS (lightness band, chroma floor, CVD ΔE mín. 15.7, contraste ≥3:1)
// ------------------------------------------------------------------

export const PALETA_CATEGORICA = ["#A9820A", "#3987e5", "#199e70", "#9085e9", "#d55181"] as const;

// Atribui uma cor por categoria (plataforma, artista...) na ordem de
// primeira aparição da lista `chaves` — assim o mesmo nome sempre cai no
// mesmo slot entre re-renderizações, contanto que a ordem de entrada não mude
// (as páginas passam plataformas/artistas já ordenados de forma estável).
export function corCategoria(chave: string, chavesEmOrdem: string[]): string {
  const indice = chavesEmOrdem.indexOf(chave);
  if (indice === -1) return PALETA_CATEGORICA[PALETA_CATEGORICA.length - 1];
  return PALETA_CATEGORICA[indice % PALETA_CATEGORICA.length];
}
