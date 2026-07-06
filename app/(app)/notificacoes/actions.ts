"use server";
// Server Actions do módulo Notificações (in-app). Arquivo próprio (não o
// actions.ts compartilhado) para evitar conflito com trabalho paralelo. Usa
// o client de servidor com a sessão do usuário (anon key + cookies) — RLS e
// auth.uid() se aplicam. NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

// Notifica todo usuário vinculado a um artista (profiles.artista_id) — a
// função reutilizável que qualquer módulo chama para avisar o artista de uma
// atualização ("notificar os artistas sempre para estarem atentos com
// atualizações e demandas"). O insert em `notificacoes` é aberto pela RLS
// justamente para permitir notificar OUTROS usuários (não só a si mesmo).
// Silenciosa quando o artista ainda não tem nenhum usuário vinculado (não é
// um erro — ex.: artista cadastrado antes de ter login).
export async function notificarArtista(
  artistaId: string,
  titulo: string,
  mensagem: string,
  link?: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: perfis, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("artista_id", artistaId);
  if (error || !perfis || perfis.length === 0) return;

  const linhas = perfis.map((p) => ({
    user_id: p.id,
    titulo,
    mensagem,
    link: link ?? null,
  }));
  const { error: erroInsert } = await supabase.from("notificacoes").insert(linhas);
  if (erroInsert) {
    console.error("notificarArtista: falha ao inserir notificações", {
      artistaId,
      erroInsert,
    });
  }

  // TODO(email): quando houver um provedor configurado (ex.: Resend, com
  // conta/API key própria), enviar aqui um e-mail espelhando esta
  // notificação para cada usuário em `perfis` — fora de escopo agora
  // (depende de uma integração externa que ainda não existe no projeto).
}

// Marca UMA notificação como lida — sempre restrita ao dono (user_id do
// usuário logado), mesmo que a RLS já garanta isso: evita que um id de
// outra pessoa passado por engano silenciosamente "funcione" via admin.
export async function marcarLida(id: string): Promise<void> {
  if (!id) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("marcarLida: falha ao marcar notificação como lida", { id, error });
  }
  revalidatePath("/", "layout");
}

// Marca todas as notificações não lidas do usuário logado como lidas —
// chamada direto do dropdown do sino (sem formulário: ação simples, um clique).
export async function marcarTodasLidas(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("user_id", user.id)
    .eq("lida", false);
  if (error) {
    console.error("marcarTodasLidas: falha ao marcar notificações como lidas", {
      userId: user.id,
      error,
    });
  }
  revalidatePath("/", "layout");
}
