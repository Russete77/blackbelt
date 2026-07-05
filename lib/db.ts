// Camada de dados real (Supabase) — substitui mock/data.ts.
// Todas as funções retornam os shapes camelCase de types/domain.ts, mapeando
// a partir das tabelas snake_case do schema (ver supabase/migrations/).
// Server-only: usa lib/supabase/server.ts (cookies()), então só pode ser
// chamado a partir de Server Components, Server Actions ou Route Handlers.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Artista, Projeto, Faixa, VersaoFaixa, Comentario, Metrica,
  TipoProjeto, EstagioPipeline, TipoVersao, CategoriaComentario, Prioridade,
} from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";
import type { MetricaDetalhada } from "@/types/analytics";
import { normalizarStatusShow, parseRiderCamarim, parseRiderTecnico,
  riderCamarimTemConteudo, riderTecnicoTemConteudo } from "@/lib/shows";

// ------------------------------------------------------------------
// Formatos das linhas (snake_case) — sem `Database` gerado ainda
// (supabase gen types); shapes mínimos o bastante para os mapeadores.
// ------------------------------------------------------------------

interface ArtistaRow {
  id: string; nome: string; slug: string;
  bio: string | null; foto_url: string | null; capa_url: string | null;
}
interface ProjetoRow {
  id: string; nome: string; tipo: TipoProjeto; status_geral: EstagioPipeline; capa_url: string | null;
}
interface FaixaRow {
  id: string; projeto_id: string; titulo: string; genero: string | null;
  estagio: EstagioPipeline; capa_url: string | null; letra: string | null;
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
