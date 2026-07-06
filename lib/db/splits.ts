import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Moeda } from "@/types/domain";
import { getFaixasDoArtista } from "./faixas";

// ------------------------------------------------------------------
// Splits por faixa (faixa_artistas) — participantes + percentual de cada
// artista numa faixa. Base do recebimento real por artista: numa faixa com
// feat, a receita é do dono do vídeo/fonograma, e cada artista recebe só o
// seu percentual (ver lib/metricas.ts#recebimentoArtista).
// ------------------------------------------------------------------

export interface SplitFaixa {
  artistaId: string;
  artistaNome: string;
  papel: string | null;
  percentual: number;
}

interface FaixaArtistaRow {
  artista_id: string;
  papel: string | null;
  percentual: number | string;
  artistas: { nome: string } | null;
}

export async function getSplitsDaFaixa(faixaId: string): Promise<SplitFaixa[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faixa_artistas")
    .select("artista_id, papel, percentual, artistas(nome)")
    .eq("faixa_id", faixaId)
    .returns<FaixaArtistaRow[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    artistaId: r.artista_id,
    artistaNome: r.artistas?.nome ?? "",
    papel: r.papel,
    percentual: Number(r.percentual),
  }));
}

// Faixas onde o artista aparece em faixa_artistas (inclui feats — faixas de
// OUTRO dono onde ele só tem um percentual), com o percentual dele e o
// streams/receita AGREGADO da faixa inteira (todas as métricas da faixa,
// não só as do artista — a receita de um feat pertence à faixa como um
// todo, e o recebimento de cada um é essa receita × seu percentual).
export interface FaixaComSplit {
  id: string;
  titulo: string;
  papel: string | null;
  percentual: number | null;
  streams: number | null;
  receita: number | null;
  // Streams/receita real (já em BRL) agregados por plataforma — base da
  // estimativa de receita por plataforma (ver lib/estimativa.ts). Faixa sem
  // nenhuma métrica ainda: ambos vazios.
  streamsPorPlataforma: Record<string, number>;
  receitaPorPlataforma: Record<string, number>;
}

interface VinculoFaixaArtistaRow {
  faixa_id: string;
  papel: string | null;
  percentual: number | string;
  faixas: { titulo: string } | null;
}

// `taxaBrl` = cotação do dia (ver lib/cambio.ts#cotacaoDolar) — necessária
// aqui porque a receita é somada DENTRO desta função (não passa pelo mesmo
// `converterReceitaParaBRL` usado antes de porFaixa/totaisMetricas nas
// páginas): sem converter USD -> BRL antes de somar, uma faixa com métricas
// em moedas diferentes teria a receita somada "cegamente", misturando US$ e
// R$ num único número sem sentido.
export async function getFaixasComSplitDoArtista(artistaId: string, taxaBrl: number): Promise<FaixaComSplit[]> {
  const supabase = await createClient();
  const { data: vinculos, error } = await supabase
    .from("faixa_artistas")
    .select("faixa_id, papel, percentual, faixas(titulo)")
    .eq("artista_id", artistaId)
    .returns<VinculoFaixaArtistaRow[]>();
  if (error) throw error;
  if (!vinculos || vinculos.length === 0) return [];

  const faixaIds = vinculos.map((v) => v.faixa_id);
  const { data: metricasRows, error: metError } = await supabase
    .from("metricas")
    .select("faixa_id, plataforma, streams, receita, moeda")
    .in("faixa_id", faixaIds)
    .returns<{ faixa_id: string | null; plataforma: string; streams: number | string | null; receita: number | string | null; moeda?: Moeda | null }[]>();
  if (metError) throw metError;

  // Agrega streams/receita por faixa (total, base do split) E por
  // plataforma dentro da faixa (base da estimativa por plataforma, ver
  // lib/estimativa.ts) — somando TODAS as métricas da faixa (independente
  // de qual artista_id a métrica foi importada). Receita em USD é
  // convertida pra BRL antes de somar em ambos os níveis.
  const agregadoPorFaixa = new Map<string, {
    streams: number; receita: number; temMetrica: boolean;
    streamsPorPlataforma: Record<string, number>; receitaPorPlataforma: Record<string, number>;
  }>();
  for (const m of metricasRows ?? []) {
    if (!m.faixa_id) continue;
    const atual = agregadoPorFaixa.get(m.faixa_id)
      ?? { streams: 0, receita: 0, temMetrica: false, streamsPorPlataforma: {}, receitaPorPlataforma: {} };
    const receitaBruta = m.receita != null ? Number(m.receita) : 0;
    const receitaBRL = (m.moeda ?? "BRL") === "USD" ? receitaBruta * taxaBrl : receitaBruta;
    const streamsNum = m.streams != null ? Number(m.streams) : 0;
    atual.streams += streamsNum;
    atual.receita += receitaBRL;
    atual.temMetrica = true;
    atual.streamsPorPlataforma[m.plataforma] = (atual.streamsPorPlataforma[m.plataforma] ?? 0) + streamsNum;
    atual.receitaPorPlataforma[m.plataforma] = (atual.receitaPorPlataforma[m.plataforma] ?? 0) + receitaBRL;
    agregadoPorFaixa.set(m.faixa_id, atual);
  }

  return vinculos.map((v) => {
    const agr = agregadoPorFaixa.get(v.faixa_id);
    return {
      id: v.faixa_id,
      titulo: v.faixas?.titulo ?? v.faixa_id,
      papel: v.papel,
      percentual: Number(v.percentual),
      streams: agr?.temMetrica ? agr.streams : null,
      receita: agr?.temMetrica ? agr.receita : null,
      streamsPorPlataforma: agr?.streamsPorPlataforma ?? {},
      receitaPorPlataforma: agr?.receitaPorPlataforma ?? {},
    };
  });
}

// Como getFaixasComSplitDoArtista, mas parte de TODAS as faixas do artista
// (via seus projetos — inclui footprint/feats), não só as que têm split
// cadastrado. O percentual vem do split quando existir; senão é null e o
// "recebimento" fica "—" (a faixa e seus números continuam aparecendo).
export const getFaixasDoArtistaComNumeros = cache(async (artistaId: string, taxaBrl: number): Promise<FaixaComSplit[]> => {
  const faixas = await getFaixasDoArtista(artistaId);
  if (faixas.length === 0) return [];
  const faixaIds = faixas.map((f) => f.id);

  const supabase = await createClient();
  const [splitsRes, metricasRes] = await Promise.all([
    supabase
      .from("faixa_artistas")
      .select("faixa_id, papel, percentual")
      .eq("artista_id", artistaId)
      .in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; papel: string | null; percentual: number | string }[]>(),
    supabase
      .from("metricas")
      .select("faixa_id, plataforma, streams, receita, moeda")
      .in("faixa_id", faixaIds)
      .returns<{ faixa_id: string | null; plataforma: string; streams: number | string | null; receita: number | string | null; moeda?: Moeda | null }[]>(),
  ]);
  if (splitsRes.error) throw splitsRes.error;
  if (metricasRes.error) throw metricasRes.error;

  const splitPorFaixa = new Map<string, { papel: string | null; percentual: number }>();
  for (const s of splitsRes.data ?? []) splitPorFaixa.set(s.faixa_id, { papel: s.papel, percentual: Number(s.percentual) });

  const agregado = new Map<string, {
    streams: number; receita: number; temMetrica: boolean;
    streamsPorPlataforma: Record<string, number>; receitaPorPlataforma: Record<string, number>;
  }>();
  for (const m of metricasRes.data ?? []) {
    if (!m.faixa_id) continue;
    const a = agregado.get(m.faixa_id)
      ?? { streams: 0, receita: 0, temMetrica: false, streamsPorPlataforma: {}, receitaPorPlataforma: {} };
    const receitaBruta = m.receita != null ? Number(m.receita) : 0;
    const receitaBRL = (m.moeda ?? "BRL") === "USD" ? receitaBruta * taxaBrl : receitaBruta;
    const streamsNum = m.streams != null ? Number(m.streams) : 0;
    a.streams += streamsNum; a.receita += receitaBRL; a.temMetrica = true;
    a.streamsPorPlataforma[m.plataforma] = (a.streamsPorPlataforma[m.plataforma] ?? 0) + streamsNum;
    a.receitaPorPlataforma[m.plataforma] = (a.receitaPorPlataforma[m.plataforma] ?? 0) + receitaBRL;
    agregado.set(m.faixa_id, a);
  }

  return faixas.map((f) => {
    const agr = agregado.get(f.id);
    const split = splitPorFaixa.get(f.id);
    return {
      id: f.id,
      titulo: f.titulo,
      papel: split?.papel ?? null,
      percentual: split?.percentual ?? null,
      streams: agr?.temMetrica ? agr.streams : null,
      receita: agr?.temMetrica ? agr.receita : null,
      streamsPorPlataforma: agr?.streamsPorPlataforma ?? {},
      receitaPorPlataforma: agr?.receitaPorPlataforma ?? {},
    };
  });
});
