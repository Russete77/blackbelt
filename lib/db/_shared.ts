// Camada de dados real (Supabase) — infra compartilhada entre os módulos db/*.
// Row types (snake_case) do schema e mapeadores snake_case -> camelCase
// (types/domain.ts). PRIVADO à pasta lib/db: não é re-exportado pelo barrel
// lib/db.ts (só os módulos de domínio são). Server-only: os módulos que usam
// isto dependem de lib/supabase/server.ts (cookies()).
import type {
  Artista, Projeto, Faixa, VersaoFaixa, Comentario, Metrica,
  TipoProjeto, EstagioPipeline, TipoVersao, CategoriaComentario, Prioridade, OrigemFaixa, Moeda,
} from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";
import type { MetricaDetalhada } from "@/types/analytics";
import { normalizarStatusShow, parseRiderCamarim, parseRiderTecnico,
  riderCamarimTemConteudo, riderTecnicoTemConteudo } from "@/lib/shows";

// ------------------------------------------------------------------
// Formatos das linhas (snake_case) — sem `Database` gerado ainda
// (supabase gen types); shapes mínimos o bastante para os mapeadores.
// ------------------------------------------------------------------

export interface ArtistaRow {
  id: string; nome: string; slug: string;
  bio: string | null; foto_url: string | null; capa_url: string | null;
  deezer_artist_id?: string | null; youtube_channel_id?: string | null;
}
export interface ProjetoRow {
  id: string; nome: string; tipo: TipoProjeto; status_geral: EstagioPipeline; capa_url: string | null;
}
export interface FaixaRow {
  id: string; projeto_id: string; titulo: string; genero: string | null;
  estagio: EstagioPipeline; capa_url: string | null; letra: string | null;
  origem?: OrigemFaixa | null;
  youtube_video_id?: string | null;
  spotify_track_id?: string | null;
  deezer_track_id?: string | null;
}
export interface VersaoRow {
  id: string; faixa_id: string; tipo: TipoVersao; rotulo: string;
  arquivo_path: string | null; duracao_segundos: number | string | null;
  enviado_por: string | null; created_at: string;
}
export interface ComentarioRow {
  id: string; versao_id: string; timestamp_segundos: number | string;
  categoria: CategoriaComentario; prioridade: Prioridade; responsavel: string | null;
  autor: string | null; texto: string; resolvido: boolean;
}
export interface ShowRow {
  id: string; artista_id: string; data: string | null; local: string | null;
  cache: number | string | null; status: string | null;
  rider_tecnico: unknown; rider_camarim: unknown;
  // Join opcional `artistas(nome)` — presente em getShows/getShow.
  artistas?: { nome: string } | null;
}
export interface MetricaRow {
  id: string; artista_id: string; faixa_id: string | null; plataforma: string;
  data: string; streams: number | string | null; receita: number | string | null;
  moeda?: Moeda | null;
}
// Join opcional `artistas(nome)`/`faixas(titulo)` — presente em getMetricas/getMetricasDoArtista.
export interface MetricaJoinRow extends MetricaRow {
  artistas?: { nome: string } | null;
  faixas?: { titulo: string } | null;
}
export interface VinculoProjetoArtistaRow {
  projeto_id: string;
  artistas: { nome: string } | null;
}

// ------------------------------------------------------------------
// Mapeadores snake_case (linha do banco) -> camelCase (types/domain.ts)
// ------------------------------------------------------------------

export function mapArtista(row: ArtistaRow): Artista {
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    bio: row.bio ?? undefined,
    fotoUrl: row.foto_url ?? undefined,
    capaUrl: row.capa_url ?? undefined,
    deezerArtistId: row.deezer_artist_id ?? undefined,
    youtubeChannelId: row.youtube_channel_id ?? undefined,
  };
}

export function mapProjeto(row: ProjetoRow, artistasNomes: string[]): Projeto {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    artistas: artistasNomes,
    statusGeral: row.status_geral,
    capaUrl: row.capa_url ?? undefined,
  };
}

export function mapFaixa(row: FaixaRow): Faixa {
  return {
    id: row.id,
    projetoId: row.projeto_id,
    titulo: row.titulo,
    genero: row.genero ?? undefined,
    estagio: row.estagio,
    capaUrl: row.capa_url ?? undefined,
    letra: row.letra ?? undefined,
    origem: row.origem ?? "estudio",
    youtubeVideoId: row.youtube_video_id ?? undefined,
    spotifyTrackId: row.spotify_track_id ?? undefined,
    deezerTrackId: row.deezer_track_id ?? undefined,
  };
}

export function mapVersao(row: VersaoRow, arquivoUrl: string | null): VersaoFaixa {
  return {
    id: row.id,
    faixaId: row.faixa_id,
    tipo: row.tipo,
    rotulo: row.rotulo,
    arquivoPath: row.arquivo_path ?? undefined,
    arquivoUrl: arquivoUrl ?? "",
    duracaoSegundos: row.duracao_segundos != null ? Number(row.duracao_segundos) : 0,
    enviadoPor: row.enviado_por ?? "",
    data: row.created_at ? String(row.created_at).slice(0, 10) : "",
  };
}

export function mapComentario(row: ComentarioRow, autorNome?: string): Comentario {
  return {
    id: row.id,
    versaoId: row.versao_id,
    timestampSegundos: Number(row.timestamp_segundos),
    categoria: row.categoria,
    prioridade: row.prioridade,
    responsavel: row.responsavel ?? undefined,
    autor: row.autor ?? "",
    autorNome,
    texto: row.texto,
    resolvido: row.resolvido,
  };
}

export function mapShow(row: ShowRow): ShowDetalhado {
  // Riders vêm de jsonb livre: normaliza para o shape da app e trata rider
  // sem nenhum conteúdo como ausente (null) — a UI mostra "não preenchido".
  const riderTecnico = parseRiderTecnico(row.rider_tecnico);
  const riderCamarim = parseRiderCamarim(row.rider_camarim);
  return {
    id: row.id,
    artistaId: row.artista_id,
    artistaNome: row.artistas?.nome,
    data: row.data ?? undefined,
    local: row.local ?? undefined,
    cache: row.cache != null ? Number(row.cache) : undefined,
    status: normalizarStatusShow(row.status),
    riderTecnico: riderTecnicoTemConteudo(riderTecnico) ? riderTecnico : null,
    riderCamarim: riderCamarimTemConteudo(riderCamarim) ? riderCamarim : null,
  };
}

export function mapMetrica(row: MetricaRow): Metrica {
  return {
    id: row.id,
    artistaId: row.artista_id,
    faixaId: row.faixa_id ?? undefined,
    plataforma: row.plataforma,
    data: row.data,
    streams: row.streams != null ? Number(row.streams) : undefined,
    receita: row.receita != null ? Number(row.receita) : undefined,
    moeda: row.moeda ?? "BRL",
  };
}

export function mapMetricaDetalhada(row: MetricaJoinRow): MetricaDetalhada {
  return {
    ...mapMetrica(row),
    artistaNome: row.artistas?.nome,
    faixaTitulo: row.faixas?.titulo,
  };
}
