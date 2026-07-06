import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Projeto, Faixa } from "@/types/domain";
import { mapFaixa } from "./_shared";
import { getProjetosDoArtista, getTodosProjetos } from "./projetos";

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
export const getFaixasDoArtista = cache(async (artistaId: string): Promise<Faixa[]> => {
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
});

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
