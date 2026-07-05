// Deezer (catálogo) — busca de artista e faixas via API pública. Ao
// contrário do YouTube, a Deezer API não exige chave para os endpoints de
// leitura usados aqui (search/artist, artist/top, artist/albums,
// album/tracks) — mas ela também não manda cabeçalhos CORS, então SÓ pode
// ser chamada a partir do servidor (Server Action), nunca direto do browser.
// Mesma postura do lib/youtube.ts: nunca lança pra cima do chamador — falha
// vira log + retorno vazio, pra Server Action mostrar mensagem amigável.

export interface CandidatoArtistaDeezer {
  id: string;
  nome: string;
  fas: number;
  fotoUrl?: string;
}

export interface FaixaCatalogoDeezer {
  titulo: string;
  album?: string;
  deezerTrackId: string;
  releaseDate?: string;
  coverUrl?: string;
}

interface DeezerArtistaRow {
  id: number;
  name: string;
  nb_fan?: number;
  picture?: string;
  picture_medium?: string;
}

interface DeezerTrackRow {
  id: number;
  title: string;
  album?: { id: number; title?: string; cover_medium?: string; release_date?: string };
}

interface DeezerAlbumRow {
  id: number;
  title: string;
  release_date?: string;
  cover_medium?: string;
}

interface DeezerErro {
  error?: { type?: string; message?: string; code?: number };
}

// Wrapper único de fetch: trata erro de rede, resposta não-ok e o formato de
// erro próprio da Deezer (200 OK com `{ error: {...} }` no corpo — comum
// quando o id do artista/álbum não existe).
async function deezerFetch<T>(url: string): Promise<T | null> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      console.error(`[deezer] API respondeu ${resposta.status} para ${url}`);
      return null;
    }
    const json = (await resposta.json()) as T & DeezerErro;
    if (json && typeof json === "object" && "error" in json && json.error) {
      console.error(`[deezer] erro da API: ${json.error.message ?? json.error.type ?? "desconhecido"}`);
      return null;
    }
    return json;
  } catch (err) {
    console.error("[deezer] falha de rede:", err);
    return null;
  }
}

export async function buscarArtistasDeezer(nome: string): Promise<CandidatoArtistaDeezer[]> {
  const termo = nome.trim();
  if (!termo) return [];

  const url = new URL("https://api.deezer.com/search/artist");
  url.searchParams.set("q", termo);

  const json = await deezerFetch<{ data?: DeezerArtistaRow[] }>(url.toString());
  if (!json?.data) return [];

  return json.data.map((a) => ({
    id: String(a.id),
    nome: a.name,
    fas: a.nb_fan ?? 0,
    fotoUrl: a.picture_medium || a.picture || undefined,
  }));
}

// Catálogo completo de um artista Deezer: top 100 + todas as faixas de todos
// os álbuns, deduplicado por título (case/espaço-insensitive) — o top e os
// álbuns costumam se sobrepor (singles que também entram num álbum depois).
export async function catalogoDeezer(deezerArtistId: string): Promise<FaixaCatalogoDeezer[]> {
  const id = deezerArtistId.trim();
  if (!id) return [];

  const encontradas = new Map<string, FaixaCatalogoDeezer>();
  const normalizar = (titulo: string) => titulo.trim().toLowerCase();

  function adicionar(track: DeezerTrackRow, releaseDate?: string, coverUrl?: string) {
    if (!track.title) return;
    const chave = normalizar(track.title);
    if (encontradas.has(chave)) return;
    encontradas.set(chave, {
      titulo: track.title,
      album: track.album?.title,
      deezerTrackId: String(track.id),
      releaseDate: releaseDate ?? track.album?.release_date,
      coverUrl: coverUrl ?? track.album?.cover_medium,
    });
  }

  const top = await deezerFetch<{ data?: DeezerTrackRow[] }>(
    `https://api.deezer.com/artist/${encodeURIComponent(id)}/top?limit=100`,
  );
  for (const track of top?.data ?? []) adicionar(track);

  const albuns = await deezerFetch<{ data?: DeezerAlbumRow[] }>(
    `https://api.deezer.com/artist/${encodeURIComponent(id)}/albums?limit=100`,
  );

  const faixasPorAlbum = await Promise.all(
    (albuns?.data ?? []).map(async (album) => {
      const faixas = await deezerFetch<{ data?: DeezerTrackRow[] }>(
        `https://api.deezer.com/album/${album.id}/tracks`,
      );
      return { album, tracks: faixas?.data ?? [] };
    }),
  );
  for (const { album, tracks } of faixasPorAlbum) {
    for (const track of tracks) adicionar(track, album.release_date, album.cover_medium);
  }

  return Array.from(encontradas.values());
}
