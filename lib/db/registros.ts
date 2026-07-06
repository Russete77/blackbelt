import { createClient } from "@/lib/supabase/server";
import type { RegistrosDaFaixa, StatusRegistroFaixa } from "@/types/registro";
import {
  obraCompleta, fonogramaCompleta, videogramaCompleta,
  parseObra, parseFonograma, parseVideograma,
} from "@/lib/registro";

// ------------------------------------------------------------------
// Registro & Direitos (registros_obra/registros_fonograma/registros_videograma)
// — obra (composição), fonograma (gravação) e videograma (clipe) por faixa.
// Uma linha por faixa por tipo (sem constraint única no banco — a garantia é
// de aplicação, ver "find-or-create" em app/(app)/registro/actions.ts).
// ------------------------------------------------------------------

interface RegistroObraRow { id: string; faixa_id: string; dados: unknown }
interface RegistroFonogramaRow { id: string; faixa_id: string; isrc: string | null; dados: unknown }
interface RegistroVideogramaRow { id: string; faixa_id: string; dados: unknown }

export async function getRegistrosDaFaixa(faixaId: string): Promise<RegistrosDaFaixa> {
  const supabase = await createClient();
  const [obraRes, fonogramaRes, videogramaRes] = await Promise.all([
    supabase.from("registros_obra").select("*").eq("faixa_id", faixaId).maybeSingle(),
    supabase.from("registros_fonograma").select("*").eq("faixa_id", faixaId).maybeSingle(),
    supabase.from("registros_videograma").select("*").eq("faixa_id", faixaId).maybeSingle(),
  ]);
  if (obraRes.error) throw obraRes.error;
  if (fonogramaRes.error) throw fonogramaRes.error;
  if (videogramaRes.error) throw videogramaRes.error;

  const obraRow = obraRes.data as RegistroObraRow | null;
  const fonogramaRow = fonogramaRes.data as RegistroFonogramaRow | null;
  const videogramaRow = videogramaRes.data as RegistroVideogramaRow | null;

  return {
    obra: obraRow ? { id: obraRow.id, faixaId: obraRow.faixa_id, dados: parseObra(obraRow.dados) } : null,
    fonograma: fonogramaRow
      ? {
          id: fonogramaRow.id, faixaId: fonogramaRow.faixa_id,
          isrc: fonogramaRow.isrc ?? "", dados: parseFonograma(fonogramaRow.dados),
        }
      : null,
    videograma: videogramaRow
      ? { id: videogramaRow.id, faixaId: videogramaRow.faixa_id, dados: parseVideograma(videogramaRow.dados) }
      : null,
  };
}

// Vínculo projeto -> primeiro artista (mesmo critério de getFaixasComYoutube:
// "primeiro artista vinculado por projeto", suficiente pro caso comum de 1
// artista por projeto/faixa) — usado só para resolver o nome/id exibido na
// lista de Registro, não para split real (isso é faixa_artistas).
interface VinculoProjetoArtistaIdRow {
  projeto_id: string;
  artista_id: string;
  artistas: { nome: string } | null;
}

// Status de preenchimento (obra/fonograma/videograma) de TODAS as faixas
// visíveis ao usuário (RLS) — base da lista /registro, com o artista
// resolvido via projeto_artistas (1ª ocorrência por projeto).
export async function getStatusRegistros(): Promise<StatusRegistroFaixa[]> {
  const supabase = await createClient();
  const { data: faixasRows, error: faixasError } = await supabase
    .from("faixas")
    .select("id, titulo, projeto_id")
    .order("titulo")
    .returns<{ id: string; titulo: string; projeto_id: string }[]>();
  if (faixasError) throw faixasError;
  const faixas = faixasRows ?? [];
  if (faixas.length === 0) return [];

  const projetoIds = Array.from(new Set(faixas.map((f) => f.projeto_id)));
  const { data: vinculos, error: vinculosError } = await supabase
    .from("projeto_artistas")
    .select("projeto_id, artista_id, artistas(nome)")
    .in("projeto_id", projetoIds)
    .returns<VinculoProjetoArtistaIdRow[]>();
  if (vinculosError) throw vinculosError;

  const artistaPorProjeto = new Map<string, { id: string; nome: string }>();
  for (const v of vinculos ?? []) {
    if (artistaPorProjeto.has(v.projeto_id)) continue;
    const nome = v.artistas?.nome;
    if (nome) artistaPorProjeto.set(v.projeto_id, { id: v.artista_id, nome });
  }

  const faixaIds = faixas.map((f) => f.id);
  const [obraRes, fonogramaRes, videogramaRes] = await Promise.all([
    supabase.from("registros_obra").select("faixa_id, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; dados: unknown }[]>(),
    supabase.from("registros_fonograma").select("faixa_id, isrc, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; isrc: string | null; dados: unknown }[]>(),
    supabase.from("registros_videograma").select("faixa_id, dados").in("faixa_id", faixaIds)
      .returns<{ faixa_id: string; dados: unknown }[]>(),
  ]);
  if (obraRes.error) throw obraRes.error;
  if (fonogramaRes.error) throw fonogramaRes.error;
  if (videogramaRes.error) throw videogramaRes.error;

  const obraOkPorFaixa = new Map<string, boolean>();
  for (const r of obraRes.data ?? []) obraOkPorFaixa.set(r.faixa_id, obraCompleta(parseObra(r.dados)));

  const fonogramaOkPorFaixa = new Map<string, boolean>();
  for (const r of fonogramaRes.data ?? []) {
    fonogramaOkPorFaixa.set(r.faixa_id, fonogramaCompleta(parseFonograma(r.dados), r.isrc));
  }

  const videogramaOkPorFaixa = new Map<string, boolean>();
  for (const r of videogramaRes.data ?? []) {
    videogramaOkPorFaixa.set(r.faixa_id, videogramaCompleta(parseVideograma(r.dados)));
  }

  return faixas.map((f) => {
    const artista = artistaPorProjeto.get(f.projeto_id);
    return {
      faixaId: f.id,
      faixaTitulo: f.titulo,
      artistaId: artista?.id,
      artistaNome: artista?.nome,
      obraOk: obraOkPorFaixa.get(f.id) ?? false,
      fonogramaOk: fonogramaOkPorFaixa.get(f.id) ?? false,
      videogramaOk: videogramaOkPorFaixa.get(f.id) ?? false,
    };
  });
}
