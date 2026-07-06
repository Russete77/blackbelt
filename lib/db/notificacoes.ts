import { createClient } from "@/lib/supabase/server";
import type { Notificacao } from "@/types/notificacoes";

// ------------------------------------------------------------------
// Notificações (in-app) — sempre do usuário logado. A RLS já restringe
// select/update à própria linha (ou admin), mas filtramos por user_id aqui
// também: um admin não deve ver o inbox de outra pessoa na própria sino.
// ------------------------------------------------------------------

interface NotificacaoRow {
  id: string; titulo: string; mensagem: string; link: string | null;
  lida: boolean; created_at: string;
}

function mapNotificacao(row: NotificacaoRow): Notificacao {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    link: row.link ?? undefined,
    lida: row.lida,
    criadoEm: row.created_at,
  };
}

export async function getNotificacoes(limit = 20): Promise<Notificacao[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapNotificacao);
}

export async function contarNaoLidas(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("lida", false);
  if (error) throw error;
  return count ?? 0;
}
