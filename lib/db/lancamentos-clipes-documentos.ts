import { createClient } from "@/lib/supabase/server";
import type { Lancamento } from "@/types/lancamentos";
import type { Clipe } from "@/types/clipes";
import type { Documento } from "@/types/documentos";

// ------------------------------------------------------------------
// Lançamentos — planejamento de release (tabela `lancamentos`: data,
// plataformas, ISRC, checklist D-30 -> D0). Distinto de
// getLancamentosDoArtista (em faixas), que lista faixas com estagio='lancado' —
// nome já em uso por aquela função antes desta tabela existir, então esta
// usa um nome próprio para não colidir. RLS: time vê/mexe, só admin apaga.
// ------------------------------------------------------------------

interface LancamentoRow {
  id: string; artista_id: string; faixa_id: string | null; titulo: string;
  tipo: Lancamento["tipo"]; data_lancamento: string | null;
  plataformas: unknown; isrc: string | null; capa_url: string | null;
  status: Lancamento["status"]; checklist: unknown; created_at: string;
}

function mapLancamento(row: LancamentoRow): Lancamento {
  return {
    id: row.id,
    artistaId: row.artista_id,
    faixaId: row.faixa_id ?? undefined,
    titulo: row.titulo,
    tipo: row.tipo,
    dataLancamento: row.data_lancamento ?? undefined,
    plataformas: Array.isArray(row.plataformas) ? (row.plataformas as string[]) : [],
    isrc: row.isrc ?? undefined,
    capaUrl: row.capa_url ?? undefined,
    status: row.status,
    checklist: Array.isArray(row.checklist) ? (row.checklist as Lancamento["checklist"]) : [],
    criadoEm: row.created_at,
  };
}

export async function getLancamentosPlanejadosDoArtista(artistaId: string): Promise<Lancamento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select("*")
    .eq("artista_id", artistaId)
    .order("data_lancamento", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLancamento);
}

// ------------------------------------------------------------------
// Clipes — pipeline de videoclipe/curadoria audiovisual (tabela `clipes`).
// RLS: time vê/mexe, só admin apaga.
// ------------------------------------------------------------------

interface ClipeRow {
  id: string; artista_id: string; faixa_id: string | null; titulo: string;
  status: Clipe["status"]; data_gravacao: string | null; data_estreia: string | null;
  video_url: string | null; diretor: string | null;
  demandas: unknown; cue_sheet: unknown; created_at: string;
}

function mapClipe(row: ClipeRow): Clipe {
  return {
    id: row.id,
    artistaId: row.artista_id,
    faixaId: row.faixa_id ?? undefined,
    titulo: row.titulo,
    status: row.status,
    dataGravacao: row.data_gravacao ?? undefined,
    dataEstreia: row.data_estreia ?? undefined,
    videoUrl: row.video_url ?? undefined,
    diretor: row.diretor ?? undefined,
    demandas: Array.isArray(row.demandas) ? (row.demandas as string[]) : [],
    cueSheet: Array.isArray(row.cue_sheet) ? (row.cue_sheet as Clipe["cueSheet"]) : [],
    criadoEm: row.created_at,
  };
}

export async function getClipesDoArtista(artistaId: string): Promise<Clipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clipes")
    .select("*")
    .eq("artista_id", artistaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClipe);
}

// ------------------------------------------------------------------
// Documentos — contratos/splits/outros arquivos do artista (tabela própria
// `documentos`). Sem bucket dedicado: `arquivo_path`, quando presente, é um
// caminho no bucket privado `covers` (resolvido com getSignedCoverUrl, que
// já lida com path OU url http(s) completa). RLS: time vê/mexe, só admin apaga.
// ------------------------------------------------------------------

interface DocumentoRow {
  id: string; artista_id: string; titulo: string; tipo: Documento["tipo"];
  arquivo_path: string | null; observacao: string | null; created_at: string;
}

function mapDocumento(row: DocumentoRow): Documento {
  return {
    id: row.id,
    artistaId: row.artista_id,
    titulo: row.titulo,
    tipo: row.tipo,
    arquivoPath: row.arquivo_path ?? undefined,
    observacao: row.observacao ?? undefined,
    criadoEm: row.created_at,
  };
}

export async function getDocumentosDoArtista(artistaId: string): Promise<Documento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("artista_id", artistaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDocumento);
}
