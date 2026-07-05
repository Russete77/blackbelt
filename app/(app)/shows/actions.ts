"use server";
// Server Actions do módulo Shows (criar/editar/excluir + riders).
// Arquivo próprio (não o actions.ts compartilhado) para evitar conflito com
// trabalho paralelo. Usa o client de servidor com a sessão do usuário
// (anon key + cookies) — RLS e auth.uid() se aplicam. NUNCA service-role.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  inputLocalParaIso, normalizarStatusShow,
  riderCamarimDeJson, riderCamarimTemConteudo,
  riderTecnicoDeJson, riderTecnicoTemConteudo,
} from "@/lib/shows";

export interface EstadoAcaoShow {
  status: "idle" | "ok" | "error";
  message?: string;
}

interface CamposShow {
  artista_id: string;
  data: string;
  local: string;
  cache: number | null;
  status: string;
  rider_tecnico: object | null;
  rider_camarim: object | null;
}

// Valida e converte o FormData nos campos da tabela `shows` (snake_case).
// Retorna string = mensagem de erro amigável.
function lerCamposShow(formData: FormData): CamposShow | string {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  if (!artistaId) return "Selecione o artista do show.";

  const dataLocal = String(formData.get("data") ?? "").trim();
  if (!dataLocal) return "Informe a data e a hora do show.";
  const dataIso = inputLocalParaIso(dataLocal);
  if (!dataIso) return "Data inválida. Use o seletor de data e hora.";

  const local = String(formData.get("local") ?? "").trim();
  if (!local) return "Informe o local do show.";

  const cacheBruto = String(formData.get("cache") ?? "").trim();
  let cache: number | null = null;
  if (cacheBruto !== "") {
    // <input type="number"> envia ponto decimal, mas aceita vírgula digitada.
    const valor = Number(cacheBruto.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) return "Cachê inválido.";
    cache = valor;
  }

  // Riders chegam como JSON (hidden inputs do formulário); JSON quebrado
  // degrada para rider vazio e vazio é salvo como null.
  const riderTecnico = riderTecnicoDeJson(String(formData.get("riderTecnico") ?? ""));
  const riderCamarim = riderCamarimDeJson(String(formData.get("riderCamarim") ?? ""));

  return {
    artista_id: artistaId,
    data: dataIso,
    local,
    cache,
    status: normalizarStatusShow(String(formData.get("status") ?? "")),
    rider_tecnico: riderTecnicoTemConteudo(riderTecnico) ? riderTecnico : null,
    rider_camarim: riderCamarimTemConteudo(riderCamarim) ? riderCamarim : null,
  };
}

// Sanitiza o caminho extra de revalidação vindo do form (só caminhos internos).
function caminhoSeguro(bruto: FormDataEntryValue | null): string | null {
  const caminho = String(bruto ?? "").trim();
  return caminho.startsWith("/") ? caminho : null;
}

function revalidarShows(caminhoExtra: string | null, id?: string) {
  revalidatePath("/shows");
  if (id) revalidatePath(`/shows/${id}`);
  if (caminhoExtra) revalidatePath(caminhoExtra);
}

export async function criarShow(_estado: EstadoAcaoShow, formData: FormData): Promise<EstadoAcaoShow> {
  const campos = lerCamposShow(formData);
  if (typeof campos === "string") return { status: "error", message: campos };
  const caminho = caminhoSeguro(formData.get("caminho"));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: show, error } = await supabase
    .from("shows")
    .insert(campos)
    .select("id")
    .single();
  if (error || !show) {
    return { status: "error", message: "Não foi possível criar o show. Tente novamente." };
  }

  // TODO(integração): ponto de sincronização com o Google Calendar —
  // quando a integração existir, criar o evento aqui (fora do escopo atual).
  revalidarShows(caminho, show.id);
  redirect(`/shows/${show.id}`);
}

export async function editarShow(_estado: EstadoAcaoShow, formData: FormData): Promise<EstadoAcaoShow> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { status: "error", message: "Show inválido." };

  const campos = lerCamposShow(formData);
  if (typeof campos === "string") return { status: "error", message: campos };
  const caminho = caminhoSeguro(formData.get("caminho"));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data, error } = await supabase
    .from("shows")
    .update(campos)
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    // 0 linhas = RLS bloqueou (sem acesso a este artista) ou o show não existe.
    return { status: "error", message: "Não foi possível salvar o show. Verifique seu acesso." };
  }

  // TODO(integração): atualizar o evento no Google Calendar quando houver sync.
  revalidarShows(caminho, id);
  redirect(`/shows/${id}`);
}

export async function excluirShow(_estado: EstadoAcaoShow, formData: FormData): Promise<EstadoAcaoShow> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { status: "error", message: "Show inválido." };
  const caminho = caminhoSeguro(formData.get("caminho"));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };
  // A RLS só permite DELETE para admin; checamos o papel no JWT para
  // devolver uma mensagem amigável em vez de um delete silencioso de 0 linhas.
  if (user.app_metadata?.role !== "admin") {
    return { status: "error", message: "Só o admin pode apagar shows." };
  }

  const { data, error } = await supabase
    .from("shows")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { status: "error", message: "Só o admin pode apagar shows." };
  }

  revalidarShows(caminho);
  redirect("/shows");
}
