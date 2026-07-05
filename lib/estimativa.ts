// Estimativa de receita por plataforma — rendimento médio por faixa mesmo
// SEM split ou receita real importada. As taxas abaixo são médias
// aproximadas de mercado (Brasil, uso genérico) e mudam com o tempo, o país
// e o tipo de conta/distribuidora — isto é só uma NOÇÃO de valor, nunca um
// contrato ou garantia de pagamento. Receita REAL importada de planilha
// sempre vence a estimativa, plataforma a plataforma (ver
// estimarReceitaPorFaixa). Sem imports server-only: usado em Server
// Components (Números do artista, Analytics do selo).

export const TAXA_PADRAO_YOUTUBE = 1.5; // R$ por 1.000 views (RPM)
export const TAXA_PADRAO_SPOTIFY = 0.017; // R$ por stream
export const TAXA_PADRAO_DEEZER = 0.01; // R$ por stream

export interface TaxasPlataforma {
  youtube: number; // R$ por 1.000 views
  spotify: number; // R$ por stream
  deezer: number; // R$ por stream
}

export const TAXAS_PADRAO: TaxasPlataforma = {
  youtube: TAXA_PADRAO_YOUTUBE,
  spotify: TAXA_PADRAO_SPOTIFY,
  deezer: TAXA_PADRAO_DEEZER,
};

// Uma linha por plataforma que contribuiu pro total de uma faixa: `real`
// diz se o valor veio de receita importada (true) ou foi calculado a partir
// de streams × taxa (false — estimativa, UI mostra selo "est.").
export interface LinhaEstimativaPlataforma {
  plataforma: string;
  valor: number;
  real: boolean;
}

export interface EstimativaReceitaFaixa {
  // null quando nenhuma plataforma tem streams OU receita real — faixa sem
  // nenhum dado ainda, não "R$ 0".
  total: number | null;
  // true quando PELO MENOS uma plataforma do total é estimativa (não 100%
  // receita real) — a UI mostra o selo "est." nesse caso.
  estimada: boolean;
  porPlataforma: LinhaEstimativaPlataforma[];
}

// Receita estimada de uma faixa = soma, plataforma a plataforma, de receita
// REAL (quando > 0 naquela plataforma) OU streams × taxa da plataforma
// (estimativa) — nunca mistura dentro da MESMA plataforma, e nunca fabrica
// dado pra uma plataforma sem streams nem receita (ex.: Spotify/Deezer sem
// nenhuma métrica importada simplesmente não entram na soma — só o YouTube,
// que tem views reais via sincronização, tende a aparecer estimado hoje).
// `streamsPorPlataforma`/`receitaPorPlataforma`: chave é o nome livre da
// plataforma (metricas.plataforma, ex. "youtube"/"spotify"/"deezer"/outra
// ainda não coberta por taxa padrão — essa cai fora se não tiver receita real).
export function estimarReceitaPorFaixa(
  streamsPorPlataforma: Record<string, number>,
  receitaPorPlataforma: Record<string, number>,
  taxas: TaxasPlataforma = TAXAS_PADRAO,
): EstimativaReceitaFaixa {
  const plataformas = new Set([
    ...Object.keys(streamsPorPlataforma),
    ...Object.keys(receitaPorPlataforma),
  ]);

  const linhas: LinhaEstimativaPlataforma[] = [];
  for (const plataforma of plataformas) {
    const receitaReal = receitaPorPlataforma[plataforma];
    if (receitaReal != null && receitaReal > 0) {
      linhas.push({ plataforma, valor: receitaReal, real: true });
      continue;
    }

    const streams = streamsPorPlataforma[plataforma];
    if (streams == null || streams <= 0) continue;

    const chave = plataforma.toLowerCase();
    const taxa = chave === "youtube" || chave === "spotify" || chave === "deezer" ? taxas[chave] : null;
    if (taxa == null || taxa <= 0) continue;

    const valor = chave === "youtube" ? (streams / 1000) * taxa : streams * taxa;
    linhas.push({ plataforma, valor, real: false });
  }

  if (linhas.length === 0) return { total: null, estimada: false, porPlataforma: [] };
  return {
    total: linhas.reduce((s, l) => s + l.valor, 0),
    estimada: linhas.some((l) => !l.real),
    porPlataforma: linhas.sort((a, b) => b.valor - a.valor),
  };
}

// Lê as taxas efetivas a partir dos search params (?ryt=&rsp=&rdz=) das
// páginas Números/Analytics, com fallback pro padrão de mercado quando
// ausente/inválido. Retrocompatibilidade: ?rpm= (o filtro antigo, só
// YouTube, mesma unidade de ryt: R$/1.000 views) ainda funciona quando ryt
// não foi informado — assim links/favoritos salvos com ?rpm= continuam
// estimando o YouTube do mesmo jeito.
export function taxasDosParams(params: {
  ryt?: string; rsp?: string; rdz?: string; rpm?: string;
}): TaxasPlataforma {
  const numero = (v: string | undefined): number | null => {
    if (!v || !v.trim()) return null;
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    youtube: numero(params.ryt) ?? numero(params.rpm) ?? TAXA_PADRAO_YOUTUBE,
    spotify: numero(params.rsp) ?? TAXA_PADRAO_SPOTIFY,
    deezer: numero(params.rdz) ?? TAXA_PADRAO_DEEZER,
  };
}
