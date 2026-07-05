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

// Um video id do YouTube tem sempre 11 caracteres alfanuméricos (+ - e _).
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Aceita um id solto (11 chars) ou uma URL do YouTube em qualquer formato
// comum (watch, youtu.be, shorts, embed, /v/, com ou sem www/m., com ou sem
// esquema, com parâmetros extras como &t= ou ?si=). Nunca lança — entrada
// inválida vira null, para o form mostrar "link inválido" em vez de quebrar.
export function extrairYoutubeVideoId(input: string): string | null {
  const bruto = input.trim();
  if (!bruto) return null;

  if (VIDEO_ID_RE.test(bruto)) return bruto;

  let url: URL;
  try {
    url = new URL(bruto.includes("://") ? bruto : `https://${bruto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  let candidato: string | null = null;

  if (host === "youtu.be") {
    candidato = url.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      candidato = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      candidato = url.pathname.slice("/shorts/".length).split("/")[0] || null;
    } else if (url.pathname.startsWith("/embed/")) {
      candidato = url.pathname.slice("/embed/".length).split("/")[0] || null;
    } else if (url.pathname.startsWith("/v/")) {
      candidato = url.pathname.slice("/v/".length).split("/")[0] || null;
    }
  }

  if (candidato && VIDEO_ID_RE.test(candidato)) return candidato;
  return null;
}
