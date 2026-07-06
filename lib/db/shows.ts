import { createClient } from "@/lib/supabase/server";
import type { ShowDetalhado } from "@/types/shows";
import { mapShow } from "./_shared";

// ------------------------------------------------------------------
// Shows (agenda do selo e do artista)
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
