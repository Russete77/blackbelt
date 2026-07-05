// Tipos do módulo Shows — agenda + riders (técnico e camarim).
// Os riders são JSON livres nas colunas `rider_tecnico` / `rider_camarim`
// (jsonb); estes shapes são o contrato da aplicação sobre esse JSON.
// Mantidos fora de types/domain.ts para não conflitar com trabalho paralelo.

export type StatusShow = "negociando" | "confirmado" | "realizado" | "cancelado";

// Uma linha da lista de canais do rider técnico (input list).
export interface RiderInput {
  canal: string;      // "1", "2"...
  fonte: string;      // "Kick", "Voz principal"...
  microfone: string;  // "SM58", "DI"...
}

// Shape salvo em shows.rider_tecnico (jsonb).
export interface RiderTecnico {
  pa: string;             // sistema de P.A. exigido
  monitores: string;      // retorno de palco / in-ears
  backline: string[];     // lista de equipamentos
  inputs: RiderInput[];   // mapa de canais
  observacoes: string;
}

// Shape salvo em shows.rider_camarim (jsonb).
export interface RiderCamarim {
  pessoas: number | null; // nº de pessoas na equipe
  alimentacao: string[];
  bebidas: string[];
  itens: string[];        // toalhas, passadeira, espelho...
  observacoes: string;
}

// Show completo, como o módulo consome (camelCase, artista resolvido).
export interface ShowDetalhado {
  id: string;
  artistaId: string;
  artistaNome?: string;
  data?: string;   // timestamptz ISO; undefined = data a definir
  local?: string;
  cache?: number;
  status: StatusShow;
  riderTecnico: RiderTecnico | null;
  riderCamarim: RiderCamarim | null;
}
