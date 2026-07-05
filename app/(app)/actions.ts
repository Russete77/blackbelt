"use server";
// Server Actions de criação (projeto/faixa) do grupo (app).
// Usa o client de servidor com a sessão do usuário (anon key + cookies) —
// RLS e auth.uid() se aplicam. NUNCA usar a service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EstadoAcao {
  status: "idle" | "ok" | "error";
  message?: string;
}

const TIPOS_PROJETO = ["single", "ep", "album", "feat"] as const;

// Sanitiza o caminho de revalidação vindo do form (só caminhos internos).
function caminhoSeguro(bruto: FormDataEntryValue | null): string {
  const caminho = String(bruto ?? "/");
  return caminho.startsWith("/") ? caminho : "/";
}

export async function criarProjeto(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoBruto = String(formData.get("tipo") ?? "single");
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!nome) return { status: "error", message: "Informe o nome do projeto." };
  const tipo = (TIPOS_PROJETO as readonly string[]).includes(tipoBruto) ? tipoBruto : "single";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: projeto, error } = await supabase
    .from("projetos")
    .insert({ nome, tipo })
    .select("id")
    .single();
  if (error || !projeto) {
    return { status: "error", message: "Não foi possível criar o projeto. Tente novamente." };
  }

  if (artistaId) {
    const { error: vinculoError } = await supabase
      .from("projeto_artistas")
      .insert({ projeto_id: projeto.id, artista_id: artistaId });
    if (vinculoError) {
      return { status: "error", message: "Projeto criado, mas falhou o vínculo com o artista." };
    }
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Projeto criado." };
}

export async function criarFaixa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const genero = String(formData.get("genero") ?? "").trim();
  const projetoId = String(formData.get("projetoId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));

  if (!titulo) return { status: "error", message: "Informe o título da faixa." };
  if (!projetoId) return { status: "error", message: "Projeto inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("faixas")
    .insert({ projeto_id: projetoId, titulo, genero: genero || null });
  if (error) {
    return { status: "error", message: "Não foi possível criar a faixa. Tente novamente." };
  }

  revalidatePath(caminho);
  return { status: "ok", message: "Faixa criada." };
}
