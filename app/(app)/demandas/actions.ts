"use server";
// Server Actions do módulo Demandas (tarefas/pedidos atribuídos a um
// artista — inclui demandas de clipe, que são demandas comuns com o título
// "Clipe: ..."). Arquivo próprio (não o actions.ts compartilhado) para
// evitar conflito com trabalho paralelo. Usa o client de servidor com a
// sessão do usuário (anon key + cookies) — RLS e auth.uid() se aplicam.
// NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { notificarArtista } from "@/app/(app)/notificacoes/actions";
import { labelStatusDemanda } from "@/lib/labels";
import type { StatusDemanda } from "@/types/demandas";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

const STATUS_DEMANDA = ["aberta", "em_andamento", "concluida"] as const;

function statusValido(bruto: string): StatusDemanda {
  return (STATUS_DEMANDA as readonly string[]).includes(bruto) ? (bruto as StatusDemanda) : "aberta";
}

// Quem muda o status da própria demanda não precisa ser notificado da
// própria ação — só o "outro lado" (admin editando a demanda do artista, ou
// vice-versa) precisa do aviso.
function ehOProprioArtista(user: User, artistaId: string): boolean {
  return String(user.app_metadata?.artista_id ?? "") === artistaId;
}

export async function criarDemanda(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const prazo = String(formData.get("prazo") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "aberta"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!titulo) return { status: "error", message: "Informe o título da demanda." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: demanda, error } = await supabase
    .from("demandas")
    .insert({
      artista_id: artistaId,
      titulo,
      descricao: descricao || null,
      prazo: prazo || null,
      status,
      criado_por: user.id,
    })
    .select("id")
    .single();
  if (error || !demanda) {
    return { status: "error", message: "Não foi possível criar a demanda. Tente novamente." };
  }

  // Nova demanda → notifica o artista (ver notificarArtista em
  // app/(app)/notificacoes/actions.ts) — mesmo quando quem cria já é o
  // próprio artista (raro, mas inofensivo: ele só vê a notificação como um
  // "recibo" da própria criação).
  await notificarArtista(artistaId, "Nova demanda", titulo, caminho);

  revalidatePath(caminho);
  return { status: "ok", message: "Demanda criada." };
}

// Edição completa (título/descrição/prazo/status) — usada pelo form
// "Editar" de uma demanda existente. Troca rápida de status sem abrir o
// form de edição é `mudarStatusDemanda`, abaixo.
export async function atualizarDemanda(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const prazo = String(formData.get("prazo") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "aberta"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Demanda inválida." };
  if (!titulo) return { status: "error", message: "Informe o título da demanda." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("demandas")
    .update({ titulo, descricao: descricao || null, prazo: prazo || null, status })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    // 0 linhas = RLS bloqueou (sem acesso) ou a demanda não existe mais.
    return { status: "error", message: "Não foi possível salvar a demanda." };
  }

  if (artistaId && !ehOProprioArtista(user, artistaId)) {
    await notificarArtista(artistaId, "Demanda atualizada", `"${titulo}" foi atualizada.`, caminho);
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Demanda atualizada." };
}

// Troca rápida de status (ex.: <select> inline no card) — chamada direto do
// client (sem <form>), por isso recebe argumentos simples em vez de FormData.
export async function mudarStatusDemanda(
  id: string,
  status: StatusDemanda,
  artistaId: string,
  titulo: string,
  caminho: string,
): Promise<EstadoAcao> {
  if (!id) return { status: "error", message: "Demanda inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("demandas")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Não foi possível atualizar o status." };
  }

  if (artistaId && !ehOProprioArtista(user, artistaId)) {
    await notificarArtista(artistaId, "Demanda atualizada", `"${titulo}" agora está ${labelStatusDemanda(status)}.`, caminho);
  }

  if (caminho) revalidatePath(caminho);
  return { status: "ok", message: "Status atualizado." };
}

export async function excluirDemanda(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Demanda inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  // A RLS só permite DELETE para admin; checamos o papel no JWT para
  // devolver uma mensagem amigável em vez de um delete silencioso de 0 linhas.
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar demandas." };
  }

  const { data, error } = await supabase
    .from("demandas")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Só o admin pode apagar demandas." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Demanda apagada." };
}
