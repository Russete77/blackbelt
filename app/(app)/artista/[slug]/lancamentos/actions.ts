"use server";
// Server Actions do módulo Lançamentos (planejamento de release: data,
// plataformas, ISRC, checklist D-30 -> D0 — tabela própria `lancamentos`).
// Arquivo próprio (não o actions.ts compartilhado) para evitar conflito com
// trabalho paralelo, mesmo padrão de app/(app)/demandas/actions.ts. Usa o
// client de servidor com a sessão do usuário (anon key + cookies) — RLS e
// auth.uid() se aplicam. NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import type { ChecklistItem, StatusLancamento, TipoLancamento } from "@/types/lancamentos";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

const TIPOS = ["single", "ep", "album"] as const;
const STATUS = ["planejado", "agendado", "lancado"] as const;

function tipoValido(bruto: string): TipoLancamento {
  return (TIPOS as readonly string[]).includes(bruto) ? (bruto as TipoLancamento) : "single";
}
function statusValido(bruto: string): StatusLancamento {
  return (STATUS as readonly string[]).includes(bruto) ? (bruto as StatusLancamento) : "planejado";
}
// Plataformas e checklist chegam serializados em JSON num hidden input (o
// estado vive no React do form, ver LancamentoFormModal) — nunca confia no
// shape bruto, filtra qualquer coisa fora do formato esperado.
function parsePlataformas(bruto: string): string[] {
  try {
    const parsed: unknown = JSON.parse(bruto || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string" && p.trim() !== "");
  } catch {
    return [];
  }
}
function parseChecklist(bruto: string): ChecklistItem[] {
  try {
    const parsed: unknown = JSON.parse(bruto || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is { tarefa: unknown; feito: unknown } => Boolean(i) && typeof i === "object")
      .map((i) => ({ tarefa: String(i.tarefa ?? "").trim(), feito: Boolean(i.feito) }))
      .filter((i) => i.tarefa !== "");
  } catch {
    return [];
  }
}

export async function criarLancamento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = tipoValido(String(formData.get("tipo") ?? "single"));
  const dataLancamento = String(formData.get("dataLancamento") ?? "").trim();
  const isrc = String(formData.get("isrc") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "planejado"));
  const plataformas = parsePlataformas(String(formData.get("plataformas") ?? "[]"));
  const checklist = parseChecklist(String(formData.get("checklist") ?? "[]"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do lançamento." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("lancamentos").insert({
    artista_id: artistaId,
    faixa_id: faixaId || null,
    titulo,
    tipo,
    data_lancamento: dataLancamento || null,
    isrc: isrc || null,
    status,
    plataformas,
    checklist,
  });
  if (error) return { status: "error", message: "Não foi possível criar o lançamento. Tente novamente." };

  revalidatePath(caminho);
  return { status: "ok", message: "Lançamento criado." };
}

export async function atualizarLancamento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = tipoValido(String(formData.get("tipo") ?? "single"));
  const dataLancamento = String(formData.get("dataLancamento") ?? "").trim();
  const isrc = String(formData.get("isrc") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "planejado"));
  const plataformas = parsePlataformas(String(formData.get("plataformas") ?? "[]"));
  const checklist = parseChecklist(String(formData.get("checklist") ?? "[]"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Lançamento inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do lançamento." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("lancamentos")
    .update({
      faixa_id: faixaId || null,
      titulo,
      tipo,
      data_lancamento: dataLancamento || null,
      isrc: isrc || null,
      status,
      plataformas,
      checklist,
    })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Não foi possível salvar o lançamento." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Lançamento atualizado." };
}

export async function excluirLancamento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!id) return { status: "error", message: "Lançamento inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  // RLS só permite DELETE para admin; checamos o papel no JWT para devolver
  // uma mensagem amigável em vez de um delete silencioso de 0 linhas.
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar lançamentos." };
  }

  const { data, error } = await supabase.from("lancamentos").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Só o admin pode apagar lançamentos." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Lançamento apagado." };
}
