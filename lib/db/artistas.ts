import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Artista } from "@/types/domain";
import { mapArtista } from "./_shared";

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
