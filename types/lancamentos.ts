// Tipos do módulo Lançamentos — planejamento de release (datas, plataformas,
// ISRC, checklist D-30 -> D0) da tabela própria `lancamentos`. Distinto de
// "faixas com estagio='lancado'" (ver getFaixasDoArtista em lib/db.ts), que
// continua existindo para outros usos (aba Projetos/Faixas). Mantido fora de
// types/domain.ts para não conflitar com trabalho paralelo (mesmo motivo de
// types/demandas.ts).

export type TipoLancamento = "single" | "ep" | "album";
export type StatusLancamento = "planejado" | "agendado" | "lancado";

export interface ChecklistItem {
  tarefa: string;
  feito: boolean;
}

export interface Lancamento {
  id: string;
  artistaId: string;
  faixaId?: string;
  titulo: string;
  tipo: TipoLancamento;
  dataLancamento?: string; // "YYYY-MM-DD"
  plataformas: string[];
  isrc?: string;
  capaUrl?: string;
  status: StatusLancamento;
  checklist: ChecklistItem[];
  criadoEm: string;
}
