// Módulo puro de PREVISÃO DE LANÇAMENTOS — projeta tendência futura a partir
// do histórico de métricas já importado. É uma ESTIMATIVA estatística
// simples (crescimento médio mês a mês, composto), nunca uma garantia:
// quanto mais meses de histórico real, mais confiável a projeção. Sem
// imports server-only: usado em Server Components (página /previsao) e
// testável isoladamente. A UI é responsável por deixar claro, sempre, que
// tudo aqui é "projeção/estimativa" — nunca um número certo.
import type { MetricaDetalhada } from "@/types/analytics";

// Ponto de uma série mensal já agregada (ver lib/metricas.ts#porMes) — chave
// "YYYY-MM" preserva a ordenação cronológica e é a base para calcular os
// próximos meses; `valor` é streams OU receita, conforme a série que a
// página montar (ver GraficoTendencia/página previsao).
export interface PontoMensal {
  chave: string;
  rotulo: string;
  valor: number;
}

export interface PontoProjetado extends PontoMensal {
  projetado: true;
}

// Taxa de crescimento médio mês a mês (ex.: 0.1 = +10% ao mês, -0.05 = -5%
// ao mês) — média simples das variações percentuais entre meses
// consecutivos, considerando só pares em que o mês anterior tem valor > 0
// (evita dividir por zero / gerar Infinity num mês sem nenhuma métrica
// ainda). Menos de 2 pontos, ou nenhum par válido: sem base nenhuma pra
// taxa, retorna 0 — a projeção então "achata" no último valor conhecido em
// vez de inventar uma tendência a partir de um dado só.
export function taxaCrescimentoMensal(serieMensal: PontoMensal[]): number {
  if (serieMensal.length < 2) return 0;

  const taxas: number[] = [];
  for (let i = 1; i < serieMensal.length; i++) {
    const anterior = serieMensal[i - 1].valor;
    const atual = serieMensal[i].valor;
    if (anterior > 0) taxas.push((atual - anterior) / anterior);
  }
  if (taxas.length === 0) return 0;

  const media = taxas.reduce((soma, t) => soma + t, 0) / taxas.length;
  // Clampa a taxa pra não extrapolar de forma absurda a partir de poucos
  // meses muito voláteis: no mínimo -95% ao mês (nunca projeta "menos que
  // zero" de um jeito instantâneo) e no máximo +300% ao mês (um pico isolado
  // não deveria virar uma reta que explode em poucos meses).
  return Math.max(-0.95, Math.min(3, media));
}

// "YYYY-MM" + N meses -> "YYYY-MM" (usa UTC pra não depender do fuso de
// quem roda o código, mesmo cuidado de lib/metricas.ts#chaveMesMetrica).
function proximaChave(chaveBase: string, incrementoMeses: number): string {
  const [ano, mes] = chaveBase.split("-").map(Number);
  if (!ano || !mes) return chaveBase;
  const data = new Date(Date.UTC(ano, mes - 1 + incrementoMeses, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Mesmo formato de rótulo de lib/metricas.ts#rotuloMes ("jan/26") — duplicado
// aqui (função pequena, não exportada de lá) pra manter lib/previsao.ts sem
// depender de internals de lib/metricas.ts.
function rotuloDaChave(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  const nome = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" })
    .format(new Date(Date.UTC(ano, mes - 1, 1)));
  return `${nome.replace(".", "")}/${String(ano).slice(2)}`;
}

// Projeta os próximos `meses` pontos a partir do último valor conhecido,
// aplicando a taxa de crescimento médio de forma COMPOSTA (o mês 2 cresce em
// cima do mês 1 já projetado, não do último valor real — assim como juros
// compostos). Série vazia ou `meses <= 0`: nada pra projetar, retorna [].
// Nunca projeta valor negativo (streams/receita não existem abaixo de zero).
export function projetar(serieMensal: PontoMensal[], meses: number): PontoProjetado[] {
  if (serieMensal.length === 0 || meses <= 0) return [];

  const taxa = taxaCrescimentoMensal(serieMensal);
  const ultimo = serieMensal[serieMensal.length - 1];

  const pontos: PontoProjetado[] = [];
  let valorAtual = ultimo.valor;
  for (let i = 1; i <= meses; i++) {
    valorAtual = Math.max(0, valorAtual * (1 + taxa));
    const chave = proximaChave(ultimo.chave, i);
    pontos.push({ chave, rotulo: rotuloDaChave(chave), valor: Math.round(valorAtual), projetado: true });
  }
  return pontos;
}

// ------------------------------------------------------------------
// Expectativa de um novo lançamento: média de streams/receita por faixa já
// lançada pelo artista — a melhor noção honesta de "o que uma faixa nova
// tende a fazer" a partir do que já existe, nunca uma promessa (a página
// deve deixar isso explícito, junto com quantas faixas embasam a média).
// ------------------------------------------------------------------

export interface MediaPorFaixa {
  streamsMedios: number;
  receitaMedia: number;
  // Nº de faixas com pelo menos uma métrica somada na média — quanto maior,
  // mais confiável a expectativa (a UI deve mostrar esse número).
  faixasConsideradas: number;
}

// Agrupa por faixaId (métricas sem faixaId — ex. receita consolidada do
// artista sem faixa associada — ficam de fora, não têm "faixa" pra tirar
// média), soma streams/receita por faixa e tira a média simples entre as
// faixas com pelo menos um dado. Sem nenhuma faixa com métrica: tudo zerado.
export function mediaPorFaixa(metricas: MetricaDetalhada[]): MediaPorFaixa {
  const porFaixa = new Map<string, { streams: number; receita: number }>();
  for (const m of metricas) {
    if (!m.faixaId) continue;
    const atual = porFaixa.get(m.faixaId) ?? { streams: 0, receita: 0 };
    atual.streams += m.streams ?? 0;
    atual.receita += m.receita ?? 0;
    porFaixa.set(m.faixaId, atual);
  }

  const faixas = Array.from(porFaixa.values());
  if (faixas.length === 0) return { streamsMedios: 0, receitaMedia: 0, faixasConsideradas: 0 };

  const totalStreams = faixas.reduce((soma, f) => soma + f.streams, 0);
  const totalReceita = faixas.reduce((soma, f) => soma + f.receita, 0);
  return {
    streamsMedios: Math.round(totalStreams / faixas.length),
    receitaMedia: totalReceita / faixas.length,
    faixasConsideradas: faixas.length,
  };
}
