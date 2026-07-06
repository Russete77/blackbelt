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

// Helper interno que centraliza o padrão repetido em toda chamada à YouTube
// Data API v3: checar a apiKey, montar a URL com os params, fazer o fetch,
// checar resposta.ok e parsear o JSON — tudo com try/catch e log, nunca
// lançando. Retorna null em qualquer falha (chave ausente, resposta não-ok
// ou erro de rede/parse); quem chama decide o que fazer com esse null.
async function fetchYoutubeApi<T>(
  caminho: string,
  params: Record<string, string>,
): Promise<T | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn(`[youtube] YOUTUBE_API_KEY ausente — pulando chamada a ${caminho}.`);
    return null;
  }

  try {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${caminho}`);
    for (const [chave, valor] of Object.entries(params)) {
      url.searchParams.set(chave, valor);
    }
    url.searchParams.set("key", apiKey);

    const resposta = await fetch(url.toString());
    if (!resposta.ok) {
      console.error(`[youtube] API respondeu ${resposta.status} em ${caminho}.`);
      return null;
    }

    return (await resposta.json()) as T;
  } catch (err) {
    console.error(`[youtube] falha ao chamar ${caminho}:`, err);
    return null;
  }
}

export async function buscarViewCountYoutube(
  videoId: string,
): Promise<EstatisticasVideoYoutube | null> {
  if (!videoId.trim()) return null;

  const json = await fetchYoutubeApi<{
    items?: { statistics?: { viewCount?: string }; snippet?: { title?: string } }[];
  }>("videos", { part: "statistics,snippet", id: videoId.trim() });
  if (!json) return null;

  const item = json.items?.[0];
  if (!item?.statistics?.viewCount) return null;

  const viewCount = Number(item.statistics.viewCount);
  if (!Number.isFinite(viewCount)) return null;

  return { videoId, titulo: item.snippet?.title ?? "", viewCount };
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

// ------------------------------------------------------------------
// Canal (importação de "todo o footprint" de um artista no YouTube):
// resolver @handle/URL/id em channelId + playlist de uploads, e paginar essa
// playlist inteira com estatísticas de view — usado pelo fluxo de "Conectar
// canal" (canal PRÓPRIO do selo/artista, ex.: @BLACKBEELT).
// ------------------------------------------------------------------

export interface CanalYoutube {
  channelId: string;
  titulo: string;
  uploadsPlaylistId: string;
}

const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

type IdentificadorCanal =
  | { tipo: "id"; valor: string }
  | { tipo: "handle"; valor: string }
  | { tipo: "username"; valor: string };

// Aceita: id de canal solto (UC...), @handle solto ou prefixado, ou uma URL
// completa (youtube.com/@handle, /channel/ID, /c/nome, /user/nome).
function extrairIdentificadorCanal(input: string): IdentificadorCanal | null {
  const bruto = input.trim();
  if (!bruto) return null;

  if (CHANNEL_ID_RE.test(bruto)) return { tipo: "id", valor: bruto };

  if (!bruto.includes("://") && !bruto.includes(".") && !bruto.includes("/")) {
    // Token solto sem indício de URL: trata como handle (com ou sem @).
    return { tipo: "handle", valor: bruto.startsWith("@") ? bruto : `@${bruto}` };
  }

  let url: URL;
  try {
    url = new URL(bruto.includes("://") ? bruto : `https://${bruto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  if (host !== "youtube.com") return null;

  const partes = url.pathname.split("/").filter(Boolean);
  if (partes.length === 0) return null;

  if (partes[0] === "channel" && partes[1]) {
    return CHANNEL_ID_RE.test(partes[1]) ? { tipo: "id", valor: partes[1] } : null;
  }
  if (partes[0].startsWith("@")) return { tipo: "handle", valor: partes[0] };
  if (partes[0] === "c" && partes[1]) return { tipo: "handle", valor: `@${partes[1]}` };
  if (partes[0] === "user" && partes[1]) return { tipo: "username", valor: partes[1] };
  return null;
}

// Resolve um @handle, URL do canal ou id (UC...) para o channelId real + a
// playlist de uploads (a única forma de listar "todos os vídeos" de um canal
// pela Data API — não existe endpoint direto de "vídeos do canal").
export async function resolverCanalYoutube(handleOuUrl: string): Promise<CanalYoutube | null> {
  const identificador = extrairIdentificadorCanal(handleOuUrl);
  if (!identificador) return null;

  const params: Record<string, string> = { part: "snippet,contentDetails" };
  if (identificador.tipo === "id") params.id = identificador.valor;
  else if (identificador.tipo === "handle") params.forHandle = identificador.valor;
  else params.forUsername = identificador.valor;

  const json = await fetchYoutubeApi<{
    items?: {
      id?: string;
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  }>("channels", params);
  if (!json) return null;

  const item = json.items?.[0];
  const channelId = item?.id;
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;
  if (!channelId || !uploadsPlaylistId) return null;

  return { channelId, titulo: item?.snippet?.title ?? "", uploadsPlaylistId };
}

export interface VideoCanalYoutube {
  videoId: string;
  titulo: string;
  viewCount: number;
  publishedAt: string;
}

// Teto de segurança: canal muito grande (>200 vídeos) não trava a
// importação — pega os 200 primeiros (ordem da playlist de uploads, mais
// recentes primeiro) e loga um aviso em vez de paginar indefinidamente.
const LIMITE_VIDEOS_CANAL = 200;

// Lista TODOS os vídeos de um canal (via playlist de uploads), com
// viewCount e data de publicação — pagina playlistItems (50/página) e depois
// busca estatísticas em lotes de 50 ids via videos.list.
export async function listarVideosCanal(uploadsPlaylistId: string): Promise<VideoCanalYoutube[]> {
  const playlistId = uploadsPlaylistId.trim();
  if (!playlistId) return [];

  const idsOrdenados: { videoId: string; publishedAt: string }[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = { part: "contentDetails", playlistId, maxResults: "50" };
    if (pageToken) params.pageToken = pageToken;

    const json = await fetchYoutubeApi<{
      items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string } }[];
      nextPageToken?: string;
    }>("playlistItems", params);
    if (!json) break;

    for (const item of json.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) idsOrdenados.push({ videoId, publishedAt: item.contentDetails?.videoPublishedAt ?? "" });
    }
    pageToken = json.nextPageToken;
  } while (pageToken && idsOrdenados.length < LIMITE_VIDEOS_CANAL);

  if (idsOrdenados.length >= LIMITE_VIDEOS_CANAL) {
    console.warn(`[youtube] canal com mais de ${LIMITE_VIDEOS_CANAL} vídeos — importando só os ${LIMITE_VIDEOS_CANAL} primeiros.`);
  }

  const limitados = idsOrdenados.slice(0, LIMITE_VIDEOS_CANAL);
  if (limitados.length === 0) return [];

  const publishedPorId = new Map(limitados.map((v) => [v.videoId, v.publishedAt]));
  const resultado: VideoCanalYoutube[] = [];

  for (let i = 0; i < limitados.length; i += 50) {
    const lote = limitados.slice(i, i + 50).map((v) => v.videoId);

    const json = await fetchYoutubeApi<{
      items?: { id?: string; statistics?: { viewCount?: string }; snippet?: { title?: string } }[];
    }>("videos", { part: "statistics,snippet", id: lote.join(",") });
    if (!json) continue;

    for (const item of json.items ?? []) {
      if (!item.id) continue;
      const viewCount = Number(item.statistics?.viewCount ?? "0");
      resultado.push({
        videoId: item.id,
        titulo: item.snippet?.title ?? "",
        viewCount: Number.isFinite(viewCount) ? viewCount : 0,
        publishedAt: publishedPorId.get(item.id) ?? "",
      });
    }
  }

  return resultado;
}

// ------------------------------------------------------------------
// Busca cross-channel ("footprint" do artista): um artista do selo aparece
// em canais de terceiros (gravadoras, outros artistas de feat, clipes
// oficiais de parceiros) — não dá pra assumir que tudo está no canal
// próprio. `search.list` cobre isso: busca por termo em QUALQUER canal,
// ordenado por popularidade. Fica atrás de curadoria humana na UI (a busca
// por nome é ruidosa — covers, lyric videos de fã, homônimos).
// ------------------------------------------------------------------

export interface VideoBuscaYoutube {
  videoId: string;
  titulo: string;
  canalTitulo: string;
  viewCount: number;
  publishedAt: string;
}

export async function buscarVideosArtistaYoutube(
  termo: string,
  maxResults = 25,
): Promise<VideoBuscaYoutube[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("[youtube] YOUTUBE_API_KEY ausente — pulando busca cross-channel.");
    return [];
  }
  const q = termo.trim();
  if (!q) return [];

  const limite = Math.min(Math.max(Math.trunc(maxResults) || 25, 1), 50);
  let videoIds: string[] = [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "viewCount");
    url.searchParams.set("q", q);
    url.searchParams.set("maxResults", String(limite));
    url.searchParams.set("key", apiKey);

    const resposta = await fetch(url.toString());
    if (!resposta.ok) {
      console.error(`[youtube] API respondeu ${resposta.status} na busca cross-channel.`);
      return [];
    }
    const json = (await resposta.json()) as { items?: { id?: { videoId?: string } }[] };
    videoIds = (json.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => Boolean(id));
  } catch (err) {
    console.error("[youtube] falha na busca cross-channel:", err);
    return [];
  }

  if (videoIds.length === 0) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,snippet");
    url.searchParams.set("id", videoIds.join(","));
    url.searchParams.set("key", apiKey);

    const resposta = await fetch(url.toString());
    if (!resposta.ok) {
      console.error(`[youtube] API respondeu ${resposta.status} ao detalhar busca cross-channel.`);
      return [];
    }
    const json = (await resposta.json()) as {
      items?: {
        id?: string;
        statistics?: { viewCount?: string };
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string };
      }[];
    };
    return (json.items ?? []).flatMap((item) => {
      if (!item.id) return [];
      const viewCount = Number(item.statistics?.viewCount ?? "0");
      return [{
        videoId: item.id,
        titulo: item.snippet?.title ?? "",
        canalTitulo: item.snippet?.channelTitle ?? "",
        viewCount: Number.isFinite(viewCount) ? viewCount : 0,
        publishedAt: item.snippet?.publishedAt ?? "",
      }];
    });
  } catch (err) {
    console.error("[youtube] falha ao detalhar busca cross-channel:", err);
    return [];
  }
}
