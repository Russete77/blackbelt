"use server";
// Server Actions do módulo Documentos (contratos/splits/outros arquivos do
// artista — tabela própria `documentos`). Arquivo próprio (não o actions.ts
// compartilhado) para evitar conflito com trabalho paralelo, mesmo padrão de
// app/(app)/demandas/actions.ts. O upload em si (Storage) acontece no
// cliente antes do submit (ver DocumentoFormModal — mesmo padrão de
// CapaUploader: browser client com sessão do usuário); esta action só grava
// os metadados (titulo/tipo/arquivo_path/observacao) via client de servidor
// com a sessão do usuário (RLS e auth.uid() se aplicam). NUNCA usar a
// service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import type { TipoDocumento } from "@/types/documentos";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

const TIPOS = ["contrato", "split", "outro"] as const;

function tipoValido(bruto: string): TipoDocumento {
  return (TIPOS as readonly string[]).includes(bruto) ? (bruto as TipoDocumento) : "outro";
}

export async function criarDocumento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = tipoValido(String(formData.get("tipo") ?? "outro"));
  const arquivoPath = String(formData.get("arquivoPath") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do documento." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("documentos").insert({
    artista_id: artistaId,
    titulo,
    tipo,
    arquivo_path: arquivoPath || null,
    observacao: observacao || null,
  });
  if (error) return { status: "error", message: "Não foi possível criar o documento. Tente novamente." };

  revalidatePath(caminho);
  return { status: "ok", message: "Documento criado." };
}

export async function atualizarDocumento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = tipoValido(String(formData.get("tipo") ?? "outro"));
  const arquivoPath = String(formData.get("arquivoPath") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Documento inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do documento." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("documentos")
    .update({
      titulo,
      tipo,
      arquivo_path: arquivoPath || null,
      observacao: observacao || null,
    })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Não foi possível salvar o documento." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Documento atualizado." };
}

export async function excluirDocumento(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!id) return { status: "error", message: "Documento inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar documentos." };
  }

  const { data, error } = await supabase.from("documentos").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Só o admin pode apagar documentos." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Documento apagado." };
}
