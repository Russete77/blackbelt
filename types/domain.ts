// Espelha o Modelo de Dados do PRD §8. Trocar mock por Supabase = trocar a fonte, não estes tipos.
export type Papel = "admin" | "artista" | "colaborador";
export type TipoProjeto = "single" | "ep" | "album" | "feat";
export type EstagioPipeline =
  | "ideia" | "gravacao" | "mixagem" | "masterizacao" | "aprovado" | "lancado";
export type TipoVersao = "beat" | "vocal" | "mix" | "master";
export type CategoriaComentario = "beat" | "mix" | "master" | "letra" | "geral";
export type Prioridade = "alta" | "media" | "baixa";
export type RotuloEstrutura = "intro" | "verso" | "refrao" | "ponte" | "outro";

export interface Usuario {
  id: string; nome: string; papel: Papel; artistaVinculado?: string; avatarUrl?: string;
}
export interface Projeto {
  id: string; nome: string; tipo: TipoProjeto; artistas: string[];
  statusGeral: EstagioPipeline; capaUrl?: string;
}
export interface Faixa {
  id: string; projetoId: string; titulo: string; genero?: string; estagio: EstagioPipeline;
}
export interface VersaoFaixa {
  id: string; faixaId: string; tipo: TipoVersao; rotulo: string;
  arquivoUrl: string; duracaoSegundos: number; enviadoPor: string; data: string;
}
export interface Comentario {
  id: string; versaoId: string; timestampSegundos: number;
  categoria: CategoriaComentario; prioridade: Prioridade; responsavel?: string;
  autor: string; texto: string; resolvido: boolean;
}
export interface EstruturaFaixa {
  id: string; faixaId: string; rotulo: RotuloEstrutura; inicioSegundos: number; fimSegundos: number;
}
