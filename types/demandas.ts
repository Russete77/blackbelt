// Tipos do módulo Demandas — tarefas/pedidos atribuídos a um artista (inclui
// demandas de clipe: são demandas comuns, só com o título "Clipe: ...").
// Mantido fora de types/domain.ts para não conflitar com trabalho paralelo.

export type StatusDemanda = "aberta" | "em_andamento" | "concluida";

export interface Demanda {
  id: string;
  artistaId: string;
  titulo: string;
  descricao?: string;
  status: StatusDemanda;
  prazo?: string; // date (YYYY-MM-DD)
  criadoPor?: string;
  criadoEm: string;
}
