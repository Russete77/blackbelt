// Parsers de link -> id de faixa em plataformas de streaming (Spotify e
// Deezer), pra "vincular plataforma" na FootprintView (ver
// components/faixa/PlayersTabs.tsx + app/(app)/actions.ts#vincularPlataforma).
// Mesmo padrão de extrairYoutubeVideoId em lib/youtube.ts: aceita o id solto
// ou a URL colada em qualquer formato comum, nunca lança — entrada inválida
// vira null pro form mostrar "link inválido" em vez de quebrar.

// Id de faixa do Spotify: 22 caracteres base62 (0-9, A-Z, a-z).
const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;

// Aceita: id solto (22 chars), URI "spotify:track:{id}", ou uma URL
// open.spotify.com/track/{id} — inclusive variantes com prefixo de locale
// (open.spotify.com/intl-pt/track/{id}) e parâmetros extras (?si=...).
export function extrairSpotifyTrackId(input: string): string | null {
  const bruto = input.trim();
  if (!bruto) return null;
  if (SPOTIFY_ID_RE.test(bruto)) return bruto;

  const uri = bruto.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uri) return uri[1];

  let url: URL;
  try {
    url = new URL(bruto.includes("://") ? bruto : `https://${bruto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|open\.)/, "");
  if (host !== "spotify.com") return null;

  const partes = url.pathname.split("/").filter(Boolean);
  const indice = partes.indexOf("track");
  const candidato = indice !== -1 ? partes[indice + 1] : null;
  return candidato && SPOTIFY_ID_RE.test(candidato) ? candidato : null;
}

// Id de faixa do Deezer: numérico.
const DEEZER_ID_RE = /^\d+$/;

// Aceita: id solto (numérico) ou uma URL deezer.com/track/{id} — inclusive
// variantes com prefixo de idioma (deezer.com/en/track/{id},
// deezer.com/pt-br/track/{id}). Links curtos (deezer.page.link) não são
// resolvidos aqui — exigem uma chamada de rede pra seguir o redirecionamento
// (ver lib/deezer.ts#resolverDeezerLinkCurto, usado como fallback na Server
// Action quando o parse direto falha).
export function extrairDeezerTrackId(input: string): string | null {
  const bruto = input.trim();
  if (!bruto) return null;
  if (DEEZER_ID_RE.test(bruto)) return bruto;

  let url: URL;
  try {
    url = new URL(bruto.includes("://") ? bruto : `https://${bruto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "deezer.com") return null;

  const partes = url.pathname.split("/").filter(Boolean);
  const indice = partes.indexOf("track");
  const candidato = indice !== -1 ? partes[indice + 1] : null;
  return candidato && DEEZER_ID_RE.test(candidato) ? candidato : null;
}
