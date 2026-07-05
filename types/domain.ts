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
// A "pasta" do artista — eixo central da navegação (ver spec artista-cêntrica).
export interface Artista {
  id: string; nome: string; slug: string; bio?: string; fotoUrl?: string; capaUrl?: string;
  // IDs externos para importar catálogo/canal sem colar link por link (ver
  // app/(app)/importar): Deezer (catálogo, keyless) e YouTube (canal próprio).
  deezerArtistId?: string; youtubeChannelId?: string;
}
export interface Projeto {
  id: string; nome: string; tipo: TipoProjeto;
  // Nomes dos artistas vinculados (via projeto_artistas); vazio = projeto do Selo.
  artistas: string[];
  statusGeral: EstagioPipeline; capaUrl?: string;
}
// 'estudio' = produzida pela gente (versões/beat/mix/comentários, pipeline
// normal). 'footprint' = lançamento externo monitorado (feat em canal/selo de
// terceiro) — só players + números + split, sem UI de produção (ver
// components/faixa/FootprintView.tsx).
export type OrigemFaixa = "estudio" | "footprint";

export interface Faixa {
  id: string; projetoId: string; titulo: string; genero?: string; estagio: EstagioPipeline;
  capaUrl?: string; letra?: string;
  origem: OrigemFaixa;
  // Vídeo do YouTube vinculado (id de 11 chars) — usado para puxar views reais em lib/metricas.
  youtubeVideoId?: string;
  // Ids de faixa nas plataformas de streaming — usados só pela FootprintView
  // para montar o embed do player (ver lib/plataformas.ts).
  spotifyTrackId?: string;
  deezerTrackId?: string;
}
export interface VersaoFaixa {
  id: string; faixaId: string; tipo: TipoVersao; rotulo: string;
  // Caminho no bucket `audio` (Storage) e a URL assinada resolvida a partir dele.
  arquivoPath?: string; arquivoUrl: string;
  duracaoSegundos: number; enviadoPor: string; data: string;
}
export interface Comentario {
  id: string; versaoId: string; timestampSegundos: number;
  categoria: CategoriaComentario; prioridade: Prioridade; responsavel?: string;
  autor: string; autorNome?: string; texto: string; resolvido: boolean;
}
export interface EstruturaFaixa {
  id: string; faixaId: string; rotulo: RotuloEstrutura; inicioSegundos: number; fimSegundos: number;
}
export interface Show {
  id: string; artistaId: string; data?: string; local?: string; cache?: number; status?: string;
}
export interface Metrica {
  id: string; artistaId: string; faixaId?: string; plataforma: string;
  data: string; streams?: number; receita?: number;
}
