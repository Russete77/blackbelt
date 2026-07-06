import { createClient } from "@/lib/supabase/server";
import type { Projeto } from "@/types/domain";
import { mapProjeto } from "./_shared";
import type { ProjetoRow, VinculoProjetoArtistaRow } from "./_shared";

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
