import { Video, Music2, MonitorPlay, type LucideIcon } from "lucide-react";
import type { EstagioPipeline, TipoProjeto, TipoVersao, Prioridade } from "@/types/domain";
import type { StatusDemanda } from "@/types/demandas";

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

// Ícone por plataforma para os StatTiles de "Números" (FootprintView) — só
// ícones genéricos do lucide (nunca logo/marca): Video para vídeo (YouTube),
// Music2 para serviços de áudio, MonitorPlay como fallback neutro pra
// qualquer plataforma ainda não mapeada (ex.: vinda de planilha importada).
const ICONES_PLATAFORMA: Record<string, LucideIcon> = {
  youtube: Video, tiktok: Video,
  spotify: Music2, deezer: Music2, apple: Music2,
};
export const iconePlataforma = (p: string): LucideIcon => ICONES_PLATAFORMA[p.toLowerCase()] ?? MonitorPlay;

// Rótulo/tom de exibição do status de uma demanda (módulo Demandas) — mesma
// paleta de tons do Badge (aprovado = concluída/verde, accent = em andamento).
export const labelStatusDemanda = (s: StatusDemanda): string =>
  ({ aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída" }[s]);

export const toneStatusDemanda = (s: StatusDemanda): "media" | "accent" | "aprovado" =>
  ({ aberta: "media", em_andamento: "accent", concluida: "aprovado" }[s] as "media" | "accent" | "aprovado");
