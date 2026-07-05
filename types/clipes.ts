// Tipos do módulo Clipes — pipeline de videoclipe/curadoria audiovisual do
// artista (tabela própria `clipes`). Reusa CueSheetItem de types/registro.ts
// (mesmo shape trecho/duração/titular já usado no Videograma de Registro &
// Direitos). Mantido fora de types/domain.ts para não conflitar com trabalho
// paralelo (mesmo motivo de types/demandas.ts).
import type { CueSheetItem } from "@/types/registro";

export type StatusClipe = "ideia" | "pre_producao" | "gravacao" | "pos_producao" | "lancado";

export interface Clipe {
  id: string;
  artistaId: string;
  faixaId?: string;
  titulo: string;
  status: StatusClipe;
  dataGravacao?: string; // "YYYY-MM-DD"
  dataEstreia?: string; // "YYYY-MM-DD"
  videoUrl?: string;
  diretor?: string;
  demandas: string[];
  cueSheet: CueSheetItem[];
  criadoEm: string;
}
