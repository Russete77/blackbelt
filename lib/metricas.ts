// Utilitários puros do módulo Analytics & Royalties — agregação, formatação
// e a paleta categórica dos gráficos. Sem imports server-only: usado em
// Server Components (painel/números) e nos componentes de gráfico (client).
import type { MetricaDetalhada, TotaisMetricas, LinhaAgregada, LinhaFaixaAgregada } from "@/types/analytics";

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

// Só entram faixas resolvidas (faixaId presente) — metricas sem faixa
// vinculada aparecem só nos totais/por-plataforma, não nesta tabela.
export function porFaixa(metricas: MetricaDetalhada[]): LinhaFaixaAgregada[] {
  const linhas = agrupar(
    metricas.filter((m) => m.faixaId),
    (m) => m.faixaId ?? null,
    (chave, m) => m.faixaTitulo ?? chave,
  ).sort((a, b) => b.receita - a.receita);

  return linhas.map((l) => ({ ...l, receitaPor1kStreams: receitaPor1kStreams(l.receita, l.streams) }));
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
// Formatação (pt-BR)
// ------------------------------------------------------------------

export function formatarReceita(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function formatarStreams(valor: number): string {
  return valor.toLocaleString("pt-BR");
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
