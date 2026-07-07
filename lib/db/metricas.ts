import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { MetricaDetalhada } from "@/types/analytics";
import { mapMetricaDetalhada } from "./_shared";
import type { MetricaJoinRow } from "./_shared";

// ------------------------------------------------------------------
// Métricas (consolidados e agregados)
// ------------------------------------------------------------------
// PAGINAÇÃO — decisão consciente: NÃO adicione .limit() aqui. Estas linhas são
// SOMADAS/AGREGADAS a jusante (streams e receita em Analytics/Números/Previsão);
// um limite cego truncaria a soma e devolveria números financeiros ERRADOS sem
// aviso. A query que cresce sem limite por usuário (notificações) já é capada em
// lib/db/notificacoes.ts. Se o volume de métricas crescer a ponto de doer, a
// correção certa é pré-agregar (rollup/materialized view por faixa+plataforma+
// mês), não paginar a soma — ver item deferido "paginação" na auditoria.

// Consolidado do selo (Analytics): todas as métricas visíveis ao usuário
// (RLS: admin vê tudo, artista vê as próprias), com artista e faixa
// resolvidos no join — a UI nunca precisa de uma segunda consulta por nome.
export async function getMetricas(): Promise<MetricaDetalhada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("*, artistas(nome), faixas(titulo)")
    .order("data", { ascending: false })
    .returns<MetricaJoinRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapMetricaDetalhada);
}

export const getMetricasDoArtista = cache(async (artistaId: string): Promise<MetricaDetalhada[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("*, faixas(titulo)")
    .eq("artista_id", artistaId)
    .order("data", { ascending: false })
    .returns<MetricaJoinRow[]>();
  if (error) throw error;
  return (data ?? []).map(mapMetricaDetalhada);
});

// Views/streams agregados de UMA faixa, por plataforma — base dos "Números"
// da FootprintView (ver components/faixa/FootprintView.tsx). Soma todas as
// linhas de metricas da faixa (todas as datas), uma por plataforma.
export async function getMetricasDaFaixaPorPlataforma(
  faixaId: string,
): Promise<{ plataforma: string; streams: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("plataforma, streams")
    .eq("faixa_id", faixaId)
    .returns<{ plataforma: string; streams: number | string | null }[]>();
  if (error) throw error;

  const porPlataforma = new Map<string, number>();
  for (const row of data ?? []) {
    const atual = porPlataforma.get(row.plataforma) ?? 0;
    porPlataforma.set(row.plataforma, atual + (row.streams != null ? Number(row.streams) : 0));
  }
  return Array.from(porPlataforma.entries())
    .map(([plataforma, streams]) => ({ plataforma, streams }))
    .sort((a, b) => b.streams - a.streams);
}

// Views/streams TOTAIS (todas as plataformas somadas) por faixa, para N
// faixas de uma vez — base do número exibido nos cards de faixa footprint
// (ver components/estudio/ProjetoCard.tsx). Faixa sem nenhuma métrica ainda
// simplesmente não aparece no mapa (UI mostra "—").
export async function getViewsPorFaixa(faixaIds: string[]): Promise<Record<string, number>> {
  const resultado: Record<string, number> = {};
  if (faixaIds.length === 0) return resultado;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metricas")
    .select("faixa_id, streams")
    .in("faixa_id", faixaIds)
    .returns<{ faixa_id: string | null; streams: number | string | null }[]>();
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.faixa_id) continue;
    const atual = resultado[row.faixa_id] ?? 0;
    resultado[row.faixa_id] = atual + (row.streams != null ? Number(row.streams) : 0);
  }
  return resultado;
}
