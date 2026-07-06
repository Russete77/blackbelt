import { createClient } from "@/lib/supabase/server";

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

// Versão batch de getSignedCoverUrl: assina todos os caminhos numa chamada só
// (análogo ao createSignedUrls de getVersoesDaFaixa) — evita 1 round-trip de
// Storage por artista/projeto na Home. URLs http(s) completas (dados
// legados/seed) passam direto, sem consumir a chamada em lote.
export async function getSignedCoverUrls(
  paths: string[],
): Promise<Map<string, string | null>> {
  const urlPorPath = new Map<string, string | null>();
  const aAssinar: string[] = [];
  for (const path of paths) {
    if (/^https?:\/\//i.test(path)) {
      urlPorPath.set(path, path);
    } else {
      aAssinar.push(path);
    }
  }
  if (aAssinar.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from("covers").createSignedUrls(aAssinar, 3600);
    if (error) {
      console.error("getSignedCoverUrls:", error.message);
    }
    for (const item of data ?? []) {
      if (item.path) urlPorPath.set(item.path, item.error ? null : item.signedUrl);
    }
  }
  return urlPorPath;
}
