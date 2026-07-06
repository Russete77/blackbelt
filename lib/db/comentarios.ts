import { createClient } from "@/lib/supabase/server";
import type { Comentario } from "@/types/domain";
import { mapComentario } from "./_shared";

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
