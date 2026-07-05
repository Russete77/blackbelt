"use server";
// Server Actions do módulo Clipes (pipeline de videoclipe/curadoria
// audiovisual — tabela própria `clipes`). Arquivo próprio (não o actions.ts
// compartilhado) para evitar conflito com trabalho paralelo, mesmo padrão de
// app/(app)/demandas/actions.ts e app/(app)/artista/[slug]/lancamentos/actions.ts.
// Usa o client de servidor com a sessão do usuário (anon key + cookies) —
// RLS e auth.uid() se aplicam. NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { extrairYoutubeVideoId } from "@/lib/youtube";
import type { StatusClipe } from "@/types/clipes";
import type { CueSheetItem } from "@/types/registro";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

const STATUS = ["ideia", "pre_producao", "gravacao", "pos_producao", "lancado"] as const;

function statusValido(bruto: string): StatusClipe {
  return (STATUS as readonly string[]).includes(bruto) ? (bruto as StatusClipe) : "ideia";
}
// Aceita id solto ou qualquer URL comum do YouTube (ver lib/youtube.ts); um
// link que não bate com nenhum formato conhecido é guardado como veio, sem
// travar o cadastro — só não terá embed na aba.
function normalizarVideoUrl(bruto: string): string {
  const valor = bruto.trim();
  if (!valor) return "";
  const videoId = extrairYoutubeVideoId(valor);
  return videoId ?? valor;
}
function parseLista(bruto: string): string[] {
  try {
    const parsed: unknown = JSON.parse(bruto || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string" && p.trim() !== "");
  } catch {
    return [];
  }
}
function parseCueSheet(bruto: string): CueSheetItem[] {
  try {
    const parsed: unknown = JSON.parse(bruto || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
      .map((i) => ({
        trecho: String(i.trecho ?? "").trim(),
        duracao: String(i.duracao ?? "").trim(),
        titular: String(i.titular ?? "").trim(),
      }))
      .filter((i) => i.trecho !== "" || i.duracao !== "" || i.titular !== "");
  } catch {
    return [];
  }
}

export async function criarClipe(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "ideia"));
  const dataGravacao = String(formData.get("dataGravacao") ?? "").trim();
  const dataEstreia = String(formData.get("dataEstreia") ?? "").trim();
  const videoUrl = normalizarVideoUrl(String(formData.get("videoUrl") ?? ""));
  const diretor = String(formData.get("diretor") ?? "").trim();
  const demandas = parseLista(String(formData.get("demandas") ?? "[]"));
  const cueSheet = parseCueSheet(String(formData.get("cueSheet") ?? "[]"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do clipe." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase.from("clipes").insert({
    artista_id: artistaId,
    faixa_id: faixaId || null,
    titulo,
    status,
    data_gravacao: dataGravacao || null,
    data_estreia: dataEstreia || null,
    video_url: videoUrl || null,
    diretor: diretor || null,
    demandas,
    cue_sheet: cueSheet,
  });
  if (error) return { status: "error", message: "Não foi possível criar o clipe. Tente novamente." };

  revalidatePath(caminho);
  return { status: "ok", message: "Clipe criado." };
}

export async function atualizarClipe(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const status = statusValido(String(formData.get("status") ?? "ideia"));
  const dataGravacao = String(formData.get("dataGravacao") ?? "").trim();
  const dataEstreia = String(formData.get("dataEstreia") ?? "").trim();
  const videoUrl = normalizarVideoUrl(String(formData.get("videoUrl") ?? ""));
  const diretor = String(formData.get("diretor") ?? "").trim();
  const demandas = parseLista(String(formData.get("demandas") ?? "[]"));
  const cueSheet = parseCueSheet(String(formData.get("cueSheet") ?? "[]"));
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!id) return { status: "error", message: "Clipe inválido." };
  if (!titulo) return { status: "error", message: "Informe o título do clipe." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("clipes")
    .update({
      faixa_id: faixaId || null,
      titulo,
      status,
      data_gravacao: dataGravacao || null,
      data_estreia: dataEstreia || null,
      video_url: videoUrl || null,
      diretor: diretor || null,
      demandas,
      cue_sheet: cueSheet,
    })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Não foi possível salvar o clipe." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Clipe atualizado." };
}

export async function excluirClipe(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = String(formData.get("id") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!id) return { status: "error", message: "Clipe inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar clipes." };
  }

  const { data, error } = await supabase.from("clipes").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Só o admin pode apagar clipes." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Clipe apagado." };
}
