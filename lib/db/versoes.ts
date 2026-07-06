import { createClient } from "@/lib/supabase/server";
import type { VersaoFaixa } from "@/types/domain";
import { mapVersao } from "./_shared";

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
