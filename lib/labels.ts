import type { EstagioPipeline, TipoProjeto, TipoVersao, Prioridade } from "@/types/domain";

export const labelEstagio = (e: EstagioPipeline): string =>
  ({ ideia: "Ideia", gravacao: "Gravação", mixagem: "Mixagem",
     masterizacao: "Masterização", aprovado: "Aprovado", lancado: "Lançado" }[e]);

export const labelTipoProjeto = (t: TipoProjeto): string =>
  ({ single: "Single", ep: "EP", album: "Álbum", feat: "Feat" }[t]);

export const labelTipoVersao = (t: TipoVersao): string =>
  ({ beat: "Beat", vocal: "Vocal", mix: "Mix", master: "Master" }[t]);

export const tonePrioridade = (p: Prioridade): "alta" | "media" | "baixa" => p;

// Rótulo de exibição de uma plataforma (metricas.plataforma / ids externos de
// faixa) — nomes próprios conhecidos, e capitaliza qualquer outra como
// fallback (ex.: plataforma vinda de planilha importada que ainda não conhecemos).
const NOMES_PLATAFORMA: Record<string, string> = {
  youtube: "YouTube", spotify: "Spotify", deezer: "Deezer",
  apple: "Apple Music", tiktok: "TikTok", instagram: "Instagram",
};
export const labelPlataforma = (p: string): string =>
  NOMES_PLATAFORMA[p.toLowerCase()] ?? (p.charAt(0).toUpperCase() + p.slice(1));
