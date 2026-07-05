// Helpers puros de exibição de faixas FOOTPRINT (lançamento externo — ver
// components/faixa/FootprintView.tsx e components/estudio/ProjetoCard.tsx).
// Sem imports server-only: usado tanto em Server Components quanto em
// listagens que não assinam URL de Storage por item (evita N chamadas de
// signed URL só para desenhar uma grade de cards).

// Thumbnail determinístico do YouTube — sem chamada de API, sempre existe
// para qualquer vídeo público (hqdefault.jpg é o tamanho garantido).
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Capa exibível sem assinatura de Storage: usa capa_url só quando já é uma
// URL http(s) pública (ex.: cover do Deezer, ou o próprio thumbnail do
// YouTube gravado na importação) — um caminho do bucket `covers` (upload
// manual via CapaUploader) só vira URL exibível com getSignedCoverUrl no
// servidor (ver app/(app)/faixa/[id]/page.tsx, que já resolve isso antes de
// passar capaUrl para FootprintView). Sem capa pública, cai no thumbnail do
// YouTube; sem nenhum dos dois, undefined (ícone de fallback do Cover).
export function capaPublicaOuThumbnail(f: { capaUrl?: string; youtubeVideoId?: string }): string | undefined {
  if (f.capaUrl && /^https?:\/\//i.test(f.capaUrl)) return f.capaUrl;
  if (f.youtubeVideoId) return youtubeThumbnailUrl(f.youtubeVideoId);
  return undefined;
}
