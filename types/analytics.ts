// Tipos do módulo Analytics & Royalties — métrica com nomes resolvidos e os
// agregados usados no painel do selo / número do artista.
// Mantidos fora de types/domain.ts pelo mesmo motivo de types/shows.ts: não
// conflitar com trabalho paralelo em cima do Metrica "cru".
import type { Metrica } from "@/types/domain";

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
}
