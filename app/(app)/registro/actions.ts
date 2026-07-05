"use server";
// Server Actions do módulo Registro & Direitos (arquivo próprio — não o
// actions.ts compartilhado — para evitar conflito com trabalho paralelo em
// cima dele, mesmo padrão de app/(app)/shows/actions.ts e
// app/(app)/splits/actions.ts). Usa o client de servidor com a sessão do
// usuário (anon key + cookies): RLS e auth.uid() se aplicam. NUNCA service-role.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { parseFonograma, parseObra, parseVideograma } from "@/lib/registro";

export interface EstadoRegistro {
  status: "idle" | "ok" | "error";
  message?: string;
}

// Uma linha por faixa por tipo de registro — sem constraint única no banco
// (ver supabase/migrations/20260705020739_core_schema.sql), então o "upsert"
// é feito na aplicação: acha a linha existente por faixa_id e atualiza; sem
// linha ainda, cria uma. Evita depender de `onConflict` inexistente.
async function upsertRegistro(
  tabela: "registros_obra" | "registros_fonograma" | "registros_videograma",
  faixaId: string,
  campos: Record<string, unknown>,
): Promise<string | null> {
  const supabase = await createClient();
  const { data: existente, error: selError } = await supabase
    .from(tabela)
    .select("id")
    .eq("faixa_id", faixaId)
    .maybeSingle();
  if (selError) return selError.message;

  if (existente) {
    const { error } = await supabase.from(tabela).update(campos).eq("id", existente.id);
    return error ? error.message : null;
  }
  const { error } = await supabase.from(tabela).insert({ faixa_id: faixaId, ...campos });
  return error ? error.message : null;
}

function revalidarRegistro(caminho: string, faixaId: string) {
  revalidatePath("/registro");
  revalidatePath(`/registro/${faixaId}`);
  if (caminho) revalidatePath(caminho);
}

// Lê e valida um FormData de registro: exige faixaId; degrada "dados" JSON
// quebrado retornando null (a Action decide a mensagem de erro).
function lerBase(formData: FormData): { faixaId: string; caminho: string; brutoDados: unknown } | string {
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  if (!faixaId) return "Faixa inválida.";
  const caminho = caminhoSeguro(formData.get("caminho"));

  try {
    return { faixaId, caminho, brutoDados: JSON.parse(String(formData.get("dados") ?? "{}")) };
  } catch {
    return "Dados enviados em formato inválido.";
  }
}

export async function salvarObra(_estado: EstadoRegistro, formData: FormData): Promise<EstadoRegistro> {
  const base = lerBase(formData);
  if (typeof base === "string") return { status: "error", message: base };
  const { faixaId, caminho } = base;

  const dados = parseObra(base.brutoDados);
  if (!dados.tituloExato.trim()) return { status: "error", message: "Informe o título exato da composição." };
  if (dados.autores.some((a) => !a.nome.trim())) {
    return { status: "error", message: "Cada autor precisa de um nome." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const erro = await upsertRegistro("registros_obra", faixaId, { dados });
  if (erro) return { status: "error", message: "Não foi possível salvar o registro da obra. Tente novamente." };

  revalidarRegistro(caminho, faixaId);
  return { status: "ok", message: "Registro da obra salvo." };
}

export async function salvarFonograma(_estado: EstadoRegistro, formData: FormData): Promise<EstadoRegistro> {
  const base = lerBase(formData);
  if (typeof base === "string") return { status: "error", message: base };
  const { faixaId, caminho } = base;

  const isrc = String(formData.get("isrc") ?? "").trim();
  const dados = parseFonograma(base.brutoDados);
  if (!dados.titulo.trim()) return { status: "error", message: "Informe o título da gravação." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const erro = await upsertRegistro("registros_fonograma", faixaId, { isrc: isrc || null, dados });
  if (erro) return { status: "error", message: "Não foi possível salvar o registro do fonograma. Tente novamente." };

  revalidarRegistro(caminho, faixaId);
  return { status: "ok", message: "Registro do fonograma salvo." };
}

export async function salvarVideograma(_estado: EstadoRegistro, formData: FormData): Promise<EstadoRegistro> {
  const base = lerBase(formData);
  if (typeof base === "string") return { status: "error", message: base };
  const { faixaId, caminho } = base;

  const dados = parseVideograma(base.brutoDados);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const erro = await upsertRegistro("registros_videograma", faixaId, { dados });
  if (erro) return { status: "error", message: "Não foi possível salvar o registro do videograma. Tente novamente." };

  revalidarRegistro(caminho, faixaId);
  return { status: "ok", message: "Registro do videograma salvo." };
}
