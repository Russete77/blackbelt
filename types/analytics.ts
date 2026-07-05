// Tipos do módulo Analytics & Royalties — métrica com nomes resolvidos e os
// agregados usados no painel do selo / número do artista.
// Mantidos fora de types/domain.ts pelo mesmo motivo de types/shows.ts: não
// conflitar com trabalho paralelo em cima do Metrica "cru".
import type { Metrica } from "@/types/domain";
import type { LinhaEstimativaPlataforma } from "@/lib/estimativa";

// Métrica com artista/faixa resolvidos via join (ver lib/db.ts).
export interface MetricaDetalhada extends Metrica {
  artistaNome?: string;
  faixaTitulo?: string;
}

export interface TotaisMetricas {
  streams: number;
  receita: number;
}

// Linha agregada por plataforma, faixa, artista ou mês — mesma forma para
// as quatro visões (o `chave` identifica o agrupamento; `rotulo` é o texto
// exibido).
export interface LinhaAgregada {
  chave: string;
  rotulo: string;
  streams: number;
  receita: number;
}

// Linha "por faixa" da tabela do painel — resultado do LEFT JOIN entre TODAS
// as faixas relevantes (catálogo) e seus agregados de métrica. Não estende
// LinhaAgregada porque aqui streams/receita podem ser null: a faixa existe
// no catálogo mas ainda não tem nenhuma métrica importada/sincronizada — a
// UI mostra "—" em vez de somir a linha (ver lib/metricas.ts#porFaixa).
export interface LinhaFaixaAgregada {
  chave: string;
  rotulo: string;
  streams: number | null;
  receita: number | null;
  receitaPor1kStreams: number | null;
  // true quando `receita` veio (total ou parcialmente) da estimativa por
  // plataforma (lib/estimativa.ts#estimarReceitaPorFaixa) em vez de receita
  // real importada — a UI mostra um selo "est." nesse caso.
  receitaEstimada?: boolean;
  // Detalhamento de `receita` por plataforma (real e/ou estimada) — base do
  // "quais plataformas contribuíram" mostrado na tabela. Ausente/vazio
  // quando a linha não passou pela estimativa por plataforma.
  porPlataforma?: LinhaEstimativaPlataforma[];
}

// Linha "por faixa" da página Números do artista (getFaixasComSplitDoArtista):
// além de streams/receita da faixa INTEIRA (todos os participantes), traz o
// papel e o percentual do artista e o recebimento dele nessa faixa
// (receita × percentual/100) — é assim que um feat aparece com o valor
// certo, não a receita da faixa inteira.
export interface LinhaFaixaSplit {
  chave: string;
  rotulo: string;
  papel: string | null;
  percentual: number | null;
  streams: number | null;
  receita: number | null;
  receitaEstimada: boolean;
  // Detalhamento de `receita` por plataforma — ver LinhaFaixaAgregada.porPlataforma.
  porPlataforma?: LinhaEstimativaPlataforma[];
  recebimento: number | null;
}
