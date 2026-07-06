import { createClient } from "@/lib/supabase/server";
import type { Demanda } from "@/types/demandas";

// ------------------------------------------------------------------
// Demandas — tarefas/pedidos atribuídos a um artista (inclui demandas de
// clipe: são demandas comuns, só com o título "Clipe: ..."). RLS: qualquer
// usuário autenticado com acesso ao workspace do artista pode ver/criar.
// ------------------------------------------------------------------

interface DemandaRow {
  id: string; artista_id: string; titulo: string; descricao: string | null;
  status: Demanda["status"]; prazo: string | null; criado_por: string | null; created_at: string;
}

function mapDemanda(row: DemandaRow): Demanda {
  return {
    id: row.id,
    artistaId: row.artista_id,
    titulo: row.titulo,
    descricao: row.descricao ?? undefined,
    status: row.status,
    prazo: row.prazo ?? undefined,
    criadoPor: row.criado_por ?? undefined,
    criadoEm: row.created_at,
  };
}

export async function getDemandasDoArtista(artistaId: string): Promise<Demanda[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("demandas")
    .select("*")
    .eq("artista_id", artistaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDemanda);
}
