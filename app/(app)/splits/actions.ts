"use server";
// Server Action de splits por faixa (faixa_artistas) — participantes + %.
// Usa o client de servidor com a sessão do usuário (RLS se aplica) — NUNCA
// service-role aqui. Arquivo próprio (não app/(app)/actions.ts) pelo mesmo
// motivo de app/(app)/analytics/actions.ts: módulo isolado, evita conflito
// com trabalho paralelo em cima do actions.ts compartilhado.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { validarSplits, avisoSomaSplits } from "@/lib/splits";

export interface EstadoSplits {
  status: "idle" | "ok" | "error";
  message?: string;
  salvos?: number;
  somaPercentual?: number;
}

// Substitui (delete-then-insert) as linhas de faixa_artistas de uma faixa
// pela lista enviada — mesmo padrão de "confirma o estado inteiro" que
// vincularYoutube usa para o campo único, aqui para uma lista. Participantes
// chega como JSON no FormData (mesmo truque de `mapeamento` em
// importarMetricasCSV): um form nativo não carrega array estruturado.
export async function salvarSplits(_estado: EstadoSplits, formData: FormData): Promise<EstadoSplits> {
  const faixaId = String(formData.get("faixaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  if (!faixaId) return { status: "error", message: "Faixa inválida." };

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(formData.get("participantes") ?? "[]"));
  } catch {
    return { status: "error", message: "Lista de participantes inválida." };
  }

  // Validação PURA (ver lib/splits.ts) — UUID, sem duplicado, % em [0,100].
  const validacao = validarSplits(bruto);
  if (!validacao.ok) return { status: "error", message: validacao.erro };
  const { participantes, somaPercentual } = validacao;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  // Upsert primeiro, delete dos removidos depois — a ordem inversa
  // (delete-then-insert) perdia todos os splits se o insert falhasse
  // no meio, e quebrava quando o delete era filtrado pela RLS.
  if (participantes.length > 0) {
    const { error: upsertError } = await supabase.from("faixa_artistas").upsert(
      participantes.map((p) => ({
        faixa_id: faixaId,
        artista_id: p.artista_id,
        papel: p.papel,
        percentual: p.percentual,
      })),
      { onConflict: "faixa_id,artista_id" },
    );
    if (upsertError) {
      return { status: "error", message: "Não foi possível salvar os splits. Tente novamente." };
    }
  }

  let removar = supabase.from("faixa_artistas").delete().eq("faixa_id", faixaId);
  if (participantes.length > 0) {
    removar = removar.not(
      "artista_id",
      "in",
      `(${participantes.map((p) => p.artista_id).join(",")})`,
    );
  }
  const { error: delError } = await removar;
  if (delError) {
    return { status: "error", message: "Não foi possível salvar os splits. Tente novamente." };
  }

  revalidatePath(caminho);

  const avisoSoma = avisoSomaSplits(participantes.length, somaPercentual);

  return {
    status: "ok",
    message: `${participantes.length} participante(s) salvo(s)${avisoSoma}.`,
    salvos: participantes.length,
    somaPercentual,
  };
}
