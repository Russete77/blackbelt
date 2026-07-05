// Camada de dados real (Supabase) — substitui mock/data.ts.
// Todas as funções retornam os shapes camelCase de types/domain.ts, mapeando
// a partir das tabelas snake_case do schema (ver supabase/migrations/).
// Server-only: usa lib/supabase/server.ts (cookies()), então só pode ser
// chamado a partir de Server Components, Server Actions ou Route Handlers.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Artista, Projeto, Faixa, VersaoFaixa, Comentario, Metrica,
  TipoProjeto, EstagioPipeline, TipoVersao, CategoriaComentario, Prioridade, OrigemFaixa, Moeda,
} from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";
import type { MetricaDetalhada } from "@/types/analytics";
import type { RegistrosDaFaixa, StatusRegistroFaixa } from "@/types/registro";
import type { Notificacao } from "@/types/notificacoes";
import type { Demanda } from "@/types/demandas";
import { normalizarStatusShow, parseRiderCamarim, parseRiderTecnico,
  riderCamarimTemConteudo, riderTecnicoTemConteudo } from "@/lib/shows";
import {
  obraCompleta, fonogramaCompleta, videogramaCompleta,
  parseObra, parseFonograma, parseVideograma,
} from "@/lib/registro";

// ------------------------------------------------------------------
// Formatos das linhas (snake_case) — sem `Database` gerado ainda
// (supabase gen types); shapes mínimos o bastante para os mapeadores.
// ------------------------------------------------------------------

interface ArtistaRow {
  id: string; nome: string; slug: string;
  bio: string | null; foto_url: string | null; capa_url: string | null;
  deezer_artist_id?: string | null; youtube_channel_id?: string | null;
}
interface ProjetoRow {
  id: string; nome: string; tipo: TipoProjeto; status_geral: EstagioPipeline; capa_url: string | null;
}
interface FaixaRow {
  id: string; projeto_id: string; titulo: string; genero: string | null;
  estagio: EstagioPipeline; capa_url: string | null; letra: string | null;
  origem?: OrigemFaixa | null;
  youtube_video_id?: string | null;
  spotify_track_id?: string | null;
  deezer_track_id?: string | null;
}
interface VersaoRow {
  id: string; faixa_id: string; tipo: TipoVersao; rotulo: string;
  arquivo_path: string | null; duracao_segundos: number | string | null;
  enviado_por: string | null; created_at: string;
}
interface ComentarioRow {
  id: string; versao_id: string; timestamp_segundos: number | string;
  categoria: CategoriaComentario; prioridade: Prioridade; responsavel: string | null;
  autor: string | null; texto: string; resolvido: boolean;
}
interface ShowRow {
  id: string; artista_id: string; data: string | null; local: string | null;
  cache: number | string | null; status: string | null;
  rider_tecnico: unknown; rider_camarim: unknown;
  // Join opcional `artistas(nome)` — presente em getShows/getShow.
  artistas?: { nome: string } | null;
}
interface MetricaRow {
  id: string; artista_id: string; faixa_id: string | null; plataforma: string;
  data: string; streams: number | string | null; receita: number | string | null;
  moeda?: Moeda | null;
}
// Join opcional `artistas(nome)`/`faixas(titulo)` — presente em getMetricas/getMetricasDoArtista.
interface MetricaJoinRow extends MetricaRow {
  artistas?: { nome: string } | null;
  faixas?: { titulo: string } | null;
}
interface VinculoProjetoArtistaRow {
  projeto_id: string;
  artistas: { nome: string } | null;
}

// ------------------------------------------------------------------
// Mapeadores snake_case (linha do banco) -> camelCase (types/domain.ts)
// ------------------------------------------------------------------

function mapArtista(row: ArtistaRow): Artista {
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

function mapProjeto(row: ProjetoRow, artistasNomes: string[]): Projeto {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    artistas: artistasNomes,
    statusGeral: row.status_geral,
    capaUrl: row.capa_url ?? undefined,
  };
}

function mapFaixa(row: FaixaRow): Faixa {
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

function mapVersao(row: VersaoRow, arquivoUrl: string | null): VersaoFaixa {
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

function mapComentario(row: ComentarioRow, autorNome?: string): Comentario {
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

function mapShow(row: ShowRow): ShowDetalhado {
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

function mapMetrica(row: MetricaRow): Metrica {
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

function mapMetricaDetalhada(row: MetricaJoinRow): MetricaDetalhada {
  return {
    ...mapMetrica(row),
    artistaNome: row.artistas?.nome,
    faixaTitulo: row.faixas?.titulo,
  };
}

// ------------------------------------------------------------------
// Artistas
// ------------------------------------------------------------------

export async function getArtistas(): Promise<Artista[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("artistas").select("*").order("nome");
  if (error) throw error;
  return (data ?? []).map(mapArtista);
}

// cache() dedupe: layout + páginas da rota /artista/[slug]/* chamam a mesma
// consulta no mesmo request; React memoiza o resultado por render pass.
export const getArtista = cache(async (slug: string): Promise<Artista | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("artistas").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapArtista(data) : null;
});

// ------------------------------------------------------------------
// Projetos (+ nomes de artistas vinculados via projeto_artistas)
// ------------------------------------------------------------------

async function attachArtistasNomes(rows: ProjetoRow[]): Promise<Projeto[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const { data: vinculos, error } = await supabase
    .from("projeto_artistas")
    .select("projeto_id, artistas(nome)")
    .in("projeto_id", ids)
    .returns<VinculoProjetoArtistaRow[]>();
  if (error) throw error;

  const nomesPorProjeto = new Map<string, string[]>();
  for (const v of vinculos ?? []) {
    const nome = v.artistas?.nome;
    if (!nome) continue;
    const arr = nomesPorProjeto.get(v.projeto_id) ?? [];
    arr.push(nome);
    nomesPorProjeto.set(v.projeto_id, arr);
  }
  return rows.map((r) => mapProjeto(r, nomesPorProjeto.get(r.id) ?? []));
}

export async function getTodosProjetos(): Promise<Projeto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return attachArtistasNomes(data ?? []);
}

export async function getProjetosDoArtista(artistaId: string): Promise<Projeto[]> {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("projeto_artistas")
    .select("projeto_id")
    .eq("artista_id", artistaId);
  if (error) throw error;

  const projetoIds = (links ?? []).map((l) => l.projeto_id);
  if (projetoIds.length === 0) return [];

  const { data: rows, error: projError } = await supabase.from("projetos").select("*").in("id", projetoIds);
  if (projError) throw projError;
  return attachArtistasNomes(rows ?? []);
}

// Projetos do Selo: sem nenhum vínculo em projeto_artistas (label-wide).
export async function getProjetosDoSelo(): Promise<Projeto[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from("projetos").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // Só os vínculos dos projetos buscados — não a tabela inteira.
  const { data: vinculos, error: vError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id")
    .in("projeto_id", rows.map((r) => r.id));
  if (vError) throw vError;

  const comArtista = new Set((vinculos ?? []).map((v) => v.projeto_id));
  const seloRows = (rows ?? []).filter((r) => !comArtista.has(r.id));
  return seloRows.map((r) => mapProjeto(r, []));
}

// ------------------------------------------------------------------
// Faixas
// ------------------------------------------------------------------

export async function getFaixasDoProjeto(projetoId: string): Promise<Faixa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixas")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapFaixa);
}

// Versão batch: 1 query para N projetos (as listagens faziam 1 query por
// projeto). Retorna mapa projetoId -> faixas, com [] para projetos sem faixa.
export async function getFaixasDosProjetos(projetoIds: string[]): Promise<Map<string, Faixa[]>> {
  const porProjeto = new Map<string, Faixa[]>(projetoIds.map((id) => [id, []]));
  if (projetoIds.length === 0) return porProjeto;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixas")
    .select("*")
    .in("projeto_id", projetoIds)
    .order("created_at");
  if (error) throw error;

  for (const row of data ?? []) {
    porProjeto.get(row.projeto_id)?.push(mapFaixa(row));
  }
  return porProjeto;
}

export async function getFaixa(id: string): Promise<Faixa | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faixas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapFaixa(data) : null;
}

// Todas as faixas visíveis ao usuário (RLS), ordenadas por título — base do
// LEFT JOIN "faixas x métricas" da tabela "Por faixa" (toda faixa aparece,
// mesmo sem métrica ainda importada/sincronizada).
export async function getFaixas(): Promise<Faixa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faixas").select("*").order("titulo");
  if (error) throw error;
  return (data ?? []).map(mapFaixa);
}

// Mesma coisa, restrita às faixas dos projetos vinculados a um artista
// (via projeto_artistas) — usado na página "Números" do artista.
export async function getFaixasDoArtista(artistaId: string): Promise<Faixa[]> {
  const projetos = await getProjetosDoArtista(artistaId);
  const projetoIds = projetos.map((p) => p.id);
  if (projetoIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixas")
    .select("*")
    .in("projeto_id", projetoIds)
    .order("titulo");
  if (error) throw error;
  return (data ?? []).map(mapFaixa);
}

// Projetos "de estúdio" do artista: têm ao menos uma faixa 'estudio'
// (produzida pelo selo), OU não têm faixa footprint nenhuma ainda (projeto
// novo, recém-criado, sem faixa) — exclui projetos "guarda-chuva" 100%
// footprint (Catálogo, Aparições/Footprint, Canal YouTube importados), que
// agora vivem só na aba Feats (ver getFaixasFootprintDoArtista). Função pura
// (sem chamada ao banco): recebe os mesmos `projetos`/`faixasPorProjeto` que
// a página "Projetos/Faixas" já busca, pra não duplicar a consulta.
export function filtrarProjetosEstudio(projetos: Projeto[], faixasPorProjeto: Map<string, Faixa[]>): Projeto[] {
  return projetos.filter((p) => {
    const faixas = faixasPorProjeto.get(p.id) ?? [];
    const temEstudio = faixas.some((f) => f.origem !== "footprint");
    const temFootprint = faixas.some((f) => f.origem === "footprint");
    return temEstudio || !temFootprint;
  });
}

// Faixas footprint (feat/lançamento externo, origem='footprint') do artista,
// agrupadas pelo projeto "guarda-chuva" de origem (Catálogo, Aparições,
// Canal YouTube) — base da aba Feats (app/(app)/artista/[slug]/feats).
// Projetos sem nenhuma faixa footprint ficam de fora (já aparecem em
// Projetos/Faixas via filtrarProjetosEstudio).
export interface GrupoFeatsDoArtista {
  projeto: Projeto;
  faixas: Faixa[];
}

export async function getFaixasFootprintDoArtista(artistaId: string): Promise<GrupoFeatsDoArtista[]> {
  const projetos = await getProjetosDoArtista(artistaId);
  if (projetos.length === 0) return [];
  const faixasPorProjeto = await getFaixasDosProjetos(projetos.map((p) => p.id));
  return projetos
    .map((projeto) => ({
      projeto,
      faixas: (faixasPorProjeto.get(projeto.id) ?? []).filter((f) => f.origem === "footprint"),
    }))
    .filter((grupo) => grupo.faixas.length > 0);
}

// Faixas "lançadas" (estagio = lancado) dentre os projetos do artista.
export async function getLancamentosDoArtista(artistaId: string): Promise<Faixa[]> {
  const projetos = await getProjetosDoArtista(artistaId);
  const projetoIds = projetos.map((p) => p.id);
  if (projetoIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixas")
    .select("*")
    .in("projeto_id", projetoIds)
    .eq("estagio", "lancado")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapFaixa);
}

// Faixa de estúdio (origem !== 'footprint') com o nome do artista do projeto
// anexado — item de card do Kanban de produção da página Estúdio (ver
// app/(app)/estudio/page.tsx). `artistaNome` é o primeiro artista vinculado
// ao projeto, ou "Selo" para projeto sem vínculo (projeto do selo).
export interface FaixaEstudioComArtista {
  faixa: Faixa;
  artistaNome: string;
}

// Todas as faixas realmente em produção no selo, para o Kanban por estágio
// da página Estúdio: reusa getTodosProjetos + getFaixasDosProjetos (mesma
// query em lote já usada na antiga listagem) e filtrarProjetosEstudio (regra
// pura que já exclui projetos 100% footprint, ver acima). Dentro dos
// projetos restantes, mantém só as faixas com origem !== 'footprint' — as
// faixas footprint desses projetos (se houver) já vivem na aba Feats do
// artista, não aqui.
export async function getFaixasEstudioComArtista(): Promise<FaixaEstudioComArtista[]> {
  const projetos = await getTodosProjetos();
  const faixasPorProjeto = await getFaixasDosProjetos(projetos.map((p) => p.id));
  const projetosEstudio = filtrarProjetosEstudio(projetos, faixasPorProjeto);

  return projetosEstudio.flatMap((projeto) => {
    const artistaNome = projeto.artistas[0] ?? "Selo";
    return (faixasPorProjeto.get(projeto.id) ?? [])
      .filter((f) => f.origem !== "footprint")
      .map((faixa) => ({ faixa, artistaNome }));
  });
}

// ------------------------------------------------------------------
// Versões + áudio (Storage, bucket privado `audio`)
// ------------------------------------------------------------------

export async function getSignedAudioUrl(arquivoPath: string, expiresIn = 3600): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("audio").createSignedUrl(arquivoPath, expiresIn);
  if (error) {
    console.error("getSignedAudioUrl:", error.message);
    return null;
  }
  return data.signedUrl;
}

// ------------------------------------------------------------------
// Capas (Storage, bucket privado `covers`)
// ------------------------------------------------------------------

// Resolve o caminho salvo em capa_url/foto_url para uma URL exibível.
// URLs http(s) completas (dados legados/seed) passam direto; caminhos do
// bucket `covers` viram signed URL.
export async function getSignedCoverUrl(capaPath: string, expiresIn = 3600): Promise<string | null> {
  if (/^https?:\/\//i.test(capaPath)) return capaPath;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("covers").createSignedUrl(capaPath, expiresIn);
  if (error) {
    console.error("getSignedCoverUrl:", error.message);
    return null;
  }
  return data.signedUrl;
}

export async function getVersoesDaFaixa(faixaId: string): Promise<VersaoFaixa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("versoes")
    .select("*")
    .eq("faixa_id", faixaId)
    .order("created_at");
  if (error) throw error;

  const rows = data ?? [];
  // Assina todas as URLs numa chamada só (era 1 chamada de Storage por versão).
  const paths = rows.map((r) => r.arquivo_path).filter((p): p is string => Boolean(p));
  const urlPorPath = new Map<string, string | null>();
  if (paths.length > 0) {
    const { data: assinadas, error: signError } = await supabase.storage
      .from("audio")
      .createSignedUrls(paths, 3600);
    if (signError) {
      console.error("getVersoesDaFaixa/createSignedUrls:", signError.message);
    }
    for (const item of assinadas ?? []) {
      if (item.path) urlPorPath.set(item.path, item.error ? null : item.signedUrl);
    }
  }

  return rows.map((row) =>
    mapVersao(row, row.arquivo_path ? (urlPorPath.get(row.arquivo_path) ?? null) : null),
  );
}

// ------------------------------------------------------------------
// Comentários (join manual com profiles — não há FK direta comentarios->profiles)
// ------------------------------------------------------------------

export async function getComentariosDaVersao(versaoId: string): Promise<Comentario[]> {
  const porVersao = await getComentariosDeVersoes([versaoId]);
  return porVersao[versaoId] ?? [];
}

// Versão batch: 1 query de comentários + 1 de profiles para N versões
// (a página da faixa fazia 2 queries por versão).
export async function getComentariosDeVersoes(
  versaoIds: string[],
): Promise<Record<string, Comentario[]>> {
  const porVersao: Record<string, Comentario[]> = {};
  for (const id of versaoIds) porVersao[id] = [];
  if (versaoIds.length === 0) return porVersao;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("comentarios")
    .select("*")
    .in("versao_id", versaoIds)
    .order("timestamp_segundos");
  if (error) throw error;

  const autorIds = Array.from(new Set((rows ?? []).map((r) => r.autor).filter(Boolean)));
  let nomes = new Map<string, string>();
  if (autorIds.length > 0) {
    const { data: perfis, error: perfisError } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", autorIds);
    if (perfisError) throw perfisError;
    nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
  }

  for (const r of rows ?? []) {
    porVersao[r.versao_id]?.push(mapComentario(r, nomes.get(r.autor) ?? undefined));
  }
  return porVersao;
}

// ------------------------------------------------------------------
// Shows (agenda do selo e do artista) e Métricas
// ------------------------------------------------------------------

// Agenda do selo: todos os shows visíveis ao usuário (RLS: admin vê tudo,
// artista vê os próprios), com o nome do artista resolvido no join.
export async function getShows(): Promise<ShowDetalhado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shows")
    .select("*, artistas(nome)")
    .order("data", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(mapShow);
}

export async function getShowsDoArtista(artistaId: string): Promise<ShowDetalhado[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shows")
    .select("*, artistas(nome)")
    .eq("artista_id", artistaId)
    .order("data", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(mapShow);
}

export async function getShow(id: string): Promise<ShowDetalhado | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shows")
    .select("*, artistas(nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapShow(data) : null;
}

// Consolidado do selo (Analytics): todas as métricas visíveis ao usuário
// (RLS: admin vê tudo, artista vê as próprias), com artista e faixa
// resolvidos no join — a UI nunca precisa de uma segunda consulta por nome.
export async function getMetricas(): Promise<MetricaDetalhada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("*, artistas(nome), faixas(titulo)")
    .order("data", { ascending: false })
    .returns<MetricaJoinRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapMetricaDetalhada);
}

export async function getMetricasDoArtista(artistaId: string): Promise<MetricaDetalhada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("*, faixas(titulo)")
    .eq("artista_id", artistaId)
    .order("data", { ascending: false })
    .returns<MetricaJoinRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapMetricaDetalhada);
}

// Views/streams agregados de UMA faixa, por plataforma — base dos "Números"
// da FootprintView (ver components/faixa/FootprintView.tsx). Soma todas as
// linhas de metricas da faixa (todas as datas), uma por plataforma.
export async function getMetricasDaFaixaPorPlataforma(
  faixaId: string,
): Promise<{ plataforma: string; streams: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("plataforma, streams")
    .eq("faixa_id", faixaId)
    .returns<{ plataforma: string; streams: number | string | null }[]>();
  if (error) throw error;

  const porPlataforma = new Map<string, number>();
  for (const row of data ?? []) {
    const atual = porPlataforma.get(row.plataforma) ?? 0;
    porPlataforma.set(row.plataforma, atual + (row.streams != null ? Number(row.streams) : 0));
  }
  return Array.from(porPlataforma.entries())
    .map(([plataforma, streams]) => ({ plataforma, streams }))
    .sort((a, b) => b.streams - a.streams);
}

// Views/streams TOTAIS (todas as plataformas somadas) por faixa, para N
// faixas de uma vez — base do número exibido nos cards de faixa footprint
// (ver components/estudio/ProjetoCard.tsx). Faixa sem nenhuma métrica ainda
// simplesmente não aparece no mapa (UI mostra "—").
export async function getViewsPorFaixa(faixaIds: string[]): Promise<Record<string, number>> {
  const resultado: Record<string, number> = {};
  if (faixaIds.length === 0) return resultado;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("faixa_id, streams")
    .in("faixa_id", faixaIds)
    .returns<{ faixa_id: string | null; streams: number | string | null }[]>();
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.faixa_id) continue;
    const atual = resultado[row.faixa_id] ?? 0;
    resultado[row.faixa_id] = atual + (row.streams != null ? Number(row.streams) : 0);
  }
  return resultado;
}

// ------------------------------------------------------------------
// Links externos (YouTube) por faixa — usado pela sincronização de views.
// ------------------------------------------------------------------

// Faixa com vídeo do YouTube vinculado, já resolvida para o primeiro
// artista do seu projeto (via projeto_artistas) — o dono da métrica
// `metricas.artista_id`. Faixa de projeto do Selo (sem artista vinculado)
// entra com artistaId null.
export interface FaixaComYoutube {
  id: string;
  titulo: string;
  projetoId: string;
  youtubeVideoId: string;
  artistaId: string | null;
}

export async function getFaixasComYoutube(): Promise<FaixaComYoutube[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixas")
    .select("id, titulo, projeto_id, youtube_video_id")
    .not("youtube_video_id", "is", null)
    .returns<{ id: string; titulo: string; projeto_id: string; youtube_video_id: string | null }[]>();
  if (error) throw error;

  const comVideo = (data ?? []).filter(
    (r): r is typeof r & { youtube_video_id: string } => Boolean(r.youtube_video_id?.trim()),
  );
  if (comVideo.length === 0) return [];

  const projetoIds = Array.from(new Set(comVideo.map((r) => r.projeto_id)));
  const { data: vinculos, error: vinculosError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id, artista_id")
    .in("projeto_id", projetoIds);
  if (vinculosError) throw vinculosError;

  // Primeiro artista vinculado por projeto (ordem de retorno do banco) —
  // suficiente para o caso comum de 1 artista por projeto/faixa.
  const artistaPorProjeto = new Map<string, string>();
  for (const v of vinculos ?? []) {
    if (!artistaPorProjeto.has(v.projeto_id)) artistaPorProjeto.set(v.projeto_id, v.artista_id);
  }

  return comVideo.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    projetoId: r.projeto_id,
    youtubeVideoId: r.youtube_video_id,
    artistaId: artistaPorProjeto.get(r.projeto_id) ?? null,
  }));
}

// ------------------------------------------------------------------
// Splits por faixa (faixa_artistas) — participantes + percentual de cada
// artista numa faixa. Base do recebimento real por artista: numa faixa com
// feat, a receita é do dono do vídeo/fonograma, e cada artista recebe só o
// seu percentual (ver lib/metricas.ts#recebimentoArtista).
// ------------------------------------------------------------------

export interface SplitFaixa {
  artistaId: string;
  artistaNome: string;
  papel: string | null;
  percentual: number;
}

interface FaixaArtistaRow {
  artista_id: string;
  papel: string | null;
  percentual: number | string;
  artistas: { nome: string } | null;
}

export async function getSplitsDaFaixa(faixaId: string): Promise<SplitFaixa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixa_artistas")
    .select("artista_id, papel, percentual, artistas(nome)")
    .eq("faixa_id", faixaId)
    .returns<FaixaArtistaRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    artistaId: r.artista_id,
    artistaNome: r.artistas?.nome ?? "",
    papel: r.papel,
    percentual: Number(r.percentual),
  }));
}

// Faixas onde o artista aparece em faixa_artistas (inclui feats — faixas de
// OUTRO dono onde ele só tem um percentual), com o percentual dele e o
// streams/receita AGREGADO da faixa inteira (todas as métricas da faixa,
// não só as do artista — a receita de um feat pertence à faixa como um
// todo, e o recebimento de cada um é essa receita × seu percentual).
export interface FaixaComSplit {
  id: string;
  titulo: string;
  papel: string | null;
  percentual: number | null;
  streams: number | null;
  receita: number | null;
  // Streams/receita real (já em BRL) agregados por plataforma — base da
  // estimativa de receita por plataforma (ver lib/estimativa.ts). Faixa sem
  // nenhuma métrica ainda: ambos vazios.
  streamsPorPlataforma: Record<string, number>;
  receitaPorPlataforma: Record<string, number>;
}

interface VinculoFaixaArtistaRow {
  faixa_id: string;
  papel: string | null;
  percentual: number | string;
  faixas: { titulo: string } | null;
}

// `taxaBrl` = cotação do dia (ver lib/cambio.ts#cotacaoDolar) — necessária
// aqui porque a receita é somada DENTRO desta função (não passa pelo mesmo
// `converterReceitaParaBRL` usado antes de porFaixa/totaisMetricas nas
// páginas): sem converter USD -> BRL antes de somar, uma faixa com métricas
// em moedas diferentes teria a receita somada "cegamente", misturando US$ e
// R$ num único número sem sentido.
export async function getFaixasComSplitDoArtista(artistaId: string, taxaBrl: number): Promise<FaixaComSplit[]> {
  const supabase = await createClient();
  const { data: vinculos, error } = await supabase
    .from("faixa_artistas")
    .select("faixa_id, papel, percentual, faixas(titulo)")
    .eq("artista_id", artistaId)
    .returns<VinculoFaixaArtistaRow[]>();
  if (error) throw error;
  if (!vinculos || vinculos.length === 0) return [];

  const faixaIds = vinculos.map((v) => v.faixa_id);
  const { data: metricasRows, error: metError } = await supabase
    .from("metricas")
    .select("faixa_id, plataforma, streams, receita, moeda")
    .in("faixa_id", faixaIds)
    .returns<{ faixa_id: string | null; plataforma: string; streams: number | string | null; receita: number | string | null; moeda?: Moeda | null }[]>();
  if (metError) throw metError;

  // Agrega streams/receita por faixa (total, base do split) E por
  // plataforma dentro da faixa (base da estimativa por plataforma, ver
  // lib/estimativa.ts) — somando TODAS as métricas da faixa (independente
  // de qual artista_id a métrica foi importada). Receita em USD é
  // convertida pra BRL antes de somar em ambos os níveis.
  const agregadoPorFaixa = new Map<string, {
    streams: number; receita: number; temMetrica: boolean;
    streamsPorPlataforma: Record<string, number>; receitaPorPlataforma: Record<string, number>;
  }>();
  for (const m of metricasRows ?? []) {
    if (!m.faixa_id) continue;
    const atual = agregadoPorFaixa.get(m.faixa_id)
      ?? { streams: 0, receita: 0, temMetrica: false, streamsPorPlataforma: {}, receitaPorPlataforma: {} };
    const receitaBruta = m.receita != null ? Number(m.receita) : 0;
    const receitaBRL = (m.moeda ?? "BRL") === "USD" ? receitaBruta * taxaBrl : receitaBruta;
    const streamsNum = m.streams != null ? Number(m.streams) : 0;
    atual.streams += streamsNum;
    atual.receita += receitaBRL;
    atual.temMetrica = true;
    atual.streamsPorPlataforma[m.plataforma] = (atual.streamsPorPlataforma[m.plataforma] ?? 0) + streamsNum;
    atual.receitaPorPlataforma[m.plataforma] = (atual.receitaPorPlataforma[m.plataforma] ?? 0) + receitaBRL;
    agregadoPorFaixa.set(m.faixa_id, atual);
  }

  return vinculos.map((v) => {
    const agr = agregadoPorFaixa.get(v.faixa_id);
    return {
      id: v.faixa_id,
      titulo: v.faixas?.titulo ?? v.faixa_id,
      papel: v.papel,
      percentual: Number(v.percentual),
      streams: agr?.temMetrica ? agr.streams : null,
      receita: agr?.temMetrica ? agr.receita : null,
      streamsPorPlataforma: agr?.streamsPorPlataforma ?? {},
      receitaPorPlataforma: agr?.receitaPorPlataforma ?? {},
    };
  });
}

// Como getFaixasComSplitDoArtista, mas parte de TODAS as faixas do artista
// (via seus projetos — inclui footprint/feats), não só as que têm split
// cadastrado. O percentual vem do split quando existir; senão é null e o
// "recebimento" fica "—" (a faixa e seus números continuam aparecendo).
export async function getFaixasDoArtistaComNumeros(artistaId: string, taxaBrl: number): Promise<FaixaComSplit[]> {
  const faixas = await getFaixasDoArtista(artistaId);
  if (faixas.length === 0) return [];
  const faixaIds = faixas.map((f) => f.id);

  const supabase = await createClient();
  const [splitsRes, metricasRes] = await Promise.all([
    supabase
      .from("faixa_artistas")
      .select("faixa_id, papel, percentual")
      .eq("artista_id", artistaId)
      .in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; papel: string | null; percentual: number | string }[]>(),
    supabase
      .from("metricas")
      .select("faixa_id, plataforma, streams, receita, moeda")
      .in("faixa_id", faixaIds)
      .returns<{ faixa_id: string | null; plataforma: string; streams: number | string | null; receita: number | string | null; moeda?: Moeda | null }[]>(),
  ]);
  if (splitsRes.error) throw splitsRes.error;
  if (metricasRes.error) throw metricasRes.error;

  const splitPorFaixa = new Map<string, { papel: string | null; percentual: number }>();
  for (const s of splitsRes.data ?? []) splitPorFaixa.set(s.faixa_id, { papel: s.papel, percentual: Number(s.percentual) });

  const agregado = new Map<string, {
    streams: number; receita: number; temMetrica: boolean;
    streamsPorPlataforma: Record<string, number>; receitaPorPlataforma: Record<string, number>;
  }>();
  for (const m of metricasRes.data ?? []) {
    if (!m.faixa_id) continue;
    const a = agregado.get(m.faixa_id)
      ?? { streams: 0, receita: 0, temMetrica: false, streamsPorPlataforma: {}, receitaPorPlataforma: {} };
    const receitaBruta = m.receita != null ? Number(m.receita) : 0;
    const receitaBRL = (m.moeda ?? "BRL") === "USD" ? receitaBruta * taxaBrl : receitaBruta;
    const streamsNum = m.streams != null ? Number(m.streams) : 0;
    a.streams += streamsNum; a.receita += receitaBRL; a.temMetrica = true;
    a.streamsPorPlataforma[m.plataforma] = (a.streamsPorPlataforma[m.plataforma] ?? 0) + streamsNum;
    a.receitaPorPlataforma[m.plataforma] = (a.receitaPorPlataforma[m.plataforma] ?? 0) + receitaBRL;
    agregado.set(m.faixa_id, a);
  }

  return faixas.map((f) => {
    const agr = agregado.get(f.id);
    const split = splitPorFaixa.get(f.id);
    return {
      id: f.id,
      titulo: f.titulo,
      papel: split?.papel ?? null,
      percentual: split?.percentual ?? null,
      streams: agr?.temMetrica ? agr.streams : null,
      receita: agr?.temMetrica ? agr.receita : null,
      streamsPorPlataforma: agr?.streamsPorPlataforma ?? {},
      receitaPorPlataforma: agr?.receitaPorPlataforma ?? {},
    };
  });
}

// Contagem rápida (head-only, sem baixar linhas) de quantas faixas já têm
// vídeo do YouTube vinculado vs. quantas ainda não — usado no selo do botão
// de sincronização para mostrar o que falta vincular.
export async function contarStatusYoutube(): Promise<{ comVideo: number; semVideo: number }> {
  const supabase = await createClient();
  const { count: total, error: totalError } = await supabase
    .from("faixas")
    .select("id", { count: "exact", head: true });
  if (totalError) throw totalError;

  const { count: comVideo, error: comVideoError } = await supabase
    .from("faixas")
    .select("id", { count: "exact", head: true })
    .not("youtube_video_id", "is", null);
  if (comVideoError) throw comVideoError;

  return { comVideo: comVideo ?? 0, semVideo: (total ?? 0) - (comVideo ?? 0) };
}

// ------------------------------------------------------------------
// Registro & Direitos (registros_obra/registros_fonograma/registros_videograma)
// — obra (composição), fonograma (gravação) e videograma (clipe) por faixa.
// Uma linha por faixa por tipo (sem constraint única no banco — a garantia é
// de aplicação, ver "find-or-create" em app/(app)/registro/actions.ts).
// ------------------------------------------------------------------

interface RegistroObraRow { id: string; faixa_id: string; dados: unknown }
interface RegistroFonogramaRow { id: string; faixa_id: string; isrc: string | null; dados: unknown }
interface RegistroVideogramaRow { id: string; faixa_id: string; dados: unknown }

export async function getRegistrosDaFaixa(faixaId: string): Promise<RegistrosDaFaixa> {
  const supabase = await createClient();
  const [obraRes, fonogramaRes, videogramaRes] = await Promise.all([
    supabase.from("registros_obra").select("*").eq("faixa_id", faixaId).maybeSingle(),
    supabase.from("registros_fonograma").select("*").eq("faixa_id", faixaId).maybeSingle(),
    supabase.from("registros_videograma").select("*").eq("faixa_id", faixaId).maybeSingle(),
  ]);
  if (obraRes.error) throw obraRes.error;
  if (fonogramaRes.error) throw fonogramaRes.error;
  if (videogramaRes.error) throw videogramaRes.error;

  const obraRow = obraRes.data as RegistroObraRow | null;
  const fonogramaRow = fonogramaRes.data as RegistroFonogramaRow | null;
  const videogramaRow = videogramaRes.data as RegistroVideogramaRow | null;

  return {
    obra: obraRow ? { id: obraRow.id, faixaId: obraRow.faixa_id, dados: parseObra(obraRow.dados) } : null,
    fonograma: fonogramaRow
      ? {
          id: fonogramaRow.id, faixaId: fonogramaRow.faixa_id,
          isrc: fonogramaRow.isrc ?? "", dados: parseFonograma(fonogramaRow.dados),
        }
      : null,
    videograma: videogramaRow
      ? { id: videogramaRow.id, faixaId: videogramaRow.faixa_id, dados: parseVideograma(videogramaRow.dados) }
      : null,
  };
}

// Vínculo projeto -> primeiro artista (mesmo critério de getFaixasComYoutube:
// "primeiro artista vinculado por projeto", suficiente pro caso comum de 1
// artista por projeto/faixa) — usado só para resolver o nome/id exibido na
// lista de Registro, não para split real (isso é faixa_artistas).
interface VinculoProjetoArtistaIdRow {
  projeto_id: string;
  artista_id: string;
  artistas: { nome: string } | null;
}

// Status de preenchimento (obra/fonograma/videograma) de TODAS as faixas
// visíveis ao usuário (RLS) — base da lista /registro, com o artista
// resolvido via projeto_artistas (1ª ocorrência por projeto).
export async function getStatusRegistros(): Promise<StatusRegistroFaixa[]> {
  const supabase = await createClient();
  const { data: faixasRows, error: faixasError } = await supabase
    .from("faixas")
    .select("id, titulo, projeto_id")
    .order("titulo")
    .returns<{ id: string; titulo: string; projeto_id: string }[]>();
  if (faixasError) throw faixasError;
  const faixas = faixasRows ?? [];
  if (faixas.length === 0) return [];

  const projetoIds = Array.from(new Set(faixas.map((f) => f.projeto_id)));
  const { data: vinculos, error: vinculosError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id, artista_id, artistas(nome)")
    .in("projeto_id", projetoIds)
    .returns<VinculoProjetoArtistaIdRow[]>();
  if (vinculosError) throw vinculosError;

  const artistaPorProjeto = new Map<string, { id: string; nome: string }>();
  for (const v of vinculos ?? []) {
    if (artistaPorProjeto.has(v.projeto_id)) continue;
    const nome = v.artistas?.nome;
    if (nome) artistaPorProjeto.set(v.projeto_id, { id: v.artista_id, nome });
  }

  const faixaIds = faixas.map((f) => f.id);
  const [obraRes, fonogramaRes, videogramaRes] = await Promise.all([
    supabase.from("registros_obra").select("faixa_id, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; dados: unknown }[]>(),
    supabase.from("registros_fonograma").select("faixa_id, isrc, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; isrc: string | null; dados: unknown }[]>(),
    supabase.from("registros_videograma").select("faixa_id, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; dados: unknown }[]>(),
  ]);
  if (obraRes.error) throw obraRes.error;
  if (fonogramaRes.error) throw fonogramaRes.error;
  if (videogramaRes.error) throw videogramaRes.error;

  const obraOkPorFaixa = new Map<string, boolean>();
  for (const r of obraRes.data ?? []) obraOkPorFaixa.set(r.faixa_id, obraCompleta(parseObra(r.dados)));

  const fonogramaOkPorFaixa = new Map<string, boolean>();
  for (const r of fonogramaRes.data ?? []) {
    fonogramaOkPorFaixa.set(r.faixa_id, fonogramaCompleta(parseFonograma(r.dados), r.isrc));
  }

  const videogramaOkPorFaixa = new Map<string, boolean>();
  for (const r of videogramaRes.data ?? []) {
    videogramaOkPorFaixa.set(r.faixa_id, videogramaCompleta(parseVideograma(r.dados)));
  }

  return faixas.map((f) => {
    const artista = artistaPorProjeto.get(f.projeto_id);
    return {
      faixaId: f.id,
      faixaTitulo: f.titulo,
      artistaId: artista?.id,
      artistaNome: artista?.nome,
      obraOk: obraOkPorFaixa.get(f.id) ?? false,
      fonogramaOk: fonogramaOkPorFaixa.get(f.id) ?? false,
      videogramaOk: videogramaOkPorFaixa.get(f.id) ?? false,
    };
  });
}

// ------------------------------------------------------------------
// Notificações (in-app) — sempre do usuário logado. A RLS já restringe
// select/update à própria linha (ou admin), mas filtramos por user_id aqui
// também: um admin não deve ver o inbox de outra pessoa na própria sino.
// ------------------------------------------------------------------

interface NotificacaoRow {
  id: string; titulo: string; mensagem: string; link: string | null;
  lida: boolean; created_at: string;
}

function mapNotificacao(row: NotificacaoRow): Notificacao {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    link: row.link ?? undefined,
    lida: row.lida,
    criadoEm: row.created_at,
  };
}

export async function getNotificacoes(limit = 20): Promise<Notificacao[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapNotificacao);
}

export async function contarNaoLidas(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("lida", false);
  if (error) throw error;
  return count ?? 0;
}

// ------------------------------------------------------------------
// Demandas — tarefas/pedidos atribuídos a um artista (inclui demandas de
// clipe: são demandas comuns, só com o título "Clipe: ..."). RLS: qualquer
// usuário autenticado com acesso ao workspace do artista pode ver/criar.
// ------------------------------------------------------------------

interface DemandaRow {
  id: string; artista_id: string; titulo: string; descricao: string | null;
  status: Demanda["status"]; prazo: string | null; criado_por: string | null; created_at: string;
}

function mapDemanda(row: DemandaRow): Demanda {
  return {
    id: row.id,
    artistaId: row.artista_id,
    titulo: row.titulo,
    descricao: row.descricao ?? undefined,
    status: row.status,
    prazo: row.prazo ?? undefined,
    criadoPor: row.criado_por ?? undefined,
    criadoEm: row.created_at,
  };
}

export async function getDemandasDoArtista(artistaId: string): Promise<Demanda[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demandas")
    .select("*")
    .eq("artista_id", artistaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDemanda);
}
