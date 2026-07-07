// Presets de formato de imagem por caso de uso (specs oficiais 2026 —
// streaming, YouTube, Instagram, TikTok, X, Facebook). Dado PURO (sem sharp),
// pra poder ser importado tanto no servidor (lib/imagem.ts) quanto no client
// (o Select do Estúdio de Imagem). "gen" = tamanho nativo do gpt-image-1 mais
// próximo do alvo; o sharp recorta/redimensiona pro tamanho exato final.
export type TamanhoGen = "1024x1024" | "1536x1024" | "1024x1536";

export interface FormatoImagem {
  id: string;
  rotulo: string;
  w: number;
  h: number;
  gen: TamanhoGen;
  // true = pode virar a capa oficial da faixa (quadrado de streaming).
  capa?: boolean;
}

export const FORMATOS_IMAGEM: FormatoImagem[] = [
  { id: "capa", rotulo: "Capa streaming — Spotify/Apple/Deezer (1:1)", w: 3000, h: 3000, gen: "1024x1024", capa: true },
  { id: "ig_retrato", rotulo: "Instagram feed retrato (4:5)", w: 1080, h: 1350, gen: "1024x1536" },
  { id: "quadrado", rotulo: "Feed quadrado — IG/X/Facebook (1:1)", w: 1080, h: 1080, gen: "1024x1024" },
  { id: "story", rotulo: "Story / Reels / TikTok (9:16)", w: 1080, h: 1920, gen: "1024x1536" },
  { id: "yt_thumb", rotulo: "Thumbnail YouTube (16:9)", w: 1280, h: 720, gen: "1536x1024" },
  { id: "x_post", rotulo: "Post X — landscape (16:9)", w: 1600, h: 900, gen: "1536x1024" },
  { id: "yt_banner", rotulo: "Banner canal YouTube (16:9)", w: 2560, h: 1440, gen: "1536x1024" },
  { id: "og", rotulo: "Link / Facebook — OG (1.91:1)", w: 1200, h: 630, gen: "1536x1024" },
];

export function formatoPorId(id: string): FormatoImagem | undefined {
  return FORMATOS_IMAGEM.find((f) => f.id === id);
}
