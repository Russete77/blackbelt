// YouTube (estrutura) — busca pontual do viewCount de um vídeo via YouTube
// Data API v3. NÃO é um scraper automático de todas as plataformas: é só um
// atalho opcional para o YouTube, que tem API pública de estatísticas.
//
// Sem YOUTUBE_API_KEY no ambiente: pula graciosamente (retorna null, loga um
// aviso, nunca lança). Nunca hardcodear a chave — ela só vem de env.
export interface EstatisticasVideoYoutube {
  videoId: string;
  titulo: string;
  viewCount: number;
}

export function youtubeConfigurado(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export async function buscarViewCountYoutube(
  videoId: string,
): Promise<EstatisticasVideoYoutube | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY ausente — pulando busca automática de views.");
    return null;
  }
  if (!videoId.trim()) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,snippet");
    url.searchParams.set("id", videoId.trim());
    url.searchParams.set("key", apiKey);

    const resposta = await fetch(url.toString());
    if (!resposta.ok) {
      console.error(`[youtube] API respondeu ${resposta.status} para o vídeo ${videoId}.`);
      return null;
    }

    const json = (await resposta.json()) as {
      items?: { statistics?: { viewCount?: string }; snippet?: { title?: string } }[];
    };
    const item = json.items?.[0];
    if (!item?.statistics?.viewCount) return null;

    const viewCount = Number(item.statistics.viewCount);
    if (!Number.isFinite(viewCount)) return null;

    return { videoId, titulo: item.snippet?.title ?? "", viewCount };
  } catch (err) {
    console.error("[youtube] falha ao buscar estatísticas:", err);
    return null;
  }
}
