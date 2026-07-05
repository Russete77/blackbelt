"use server";
// "Definir meu % em massa" — atalho pra tediosa tarefa de cadastrar o split
// faixa por faixa (ver components/faixa/SplitsFaixa.tsx). Aplica um único %
// do artista a um lote de faixas de uma vez (upsert em faixa_artistas), com
// escopo pra não pisar em splits já ajustados manualmente. Arquivo próprio
// (não app/(app)/splits/actions.ts) — mesmo racional de app/(app)/importar/
// actions.ts: módulo isolado, evita conflito com trabalho paralelo em cima do
// actions.ts compartilhado daquele módulo. Usa o client de servidor com a
// sessão do usuário (RLS se aplica) — NUNCA service-role aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/forms";
import { getFaixasDoArtista, getProjetosDoArtista } from "@/lib/db";

// Nome do projeto "guarda-chuva" das faixas footprint cross-channel (feats em
// canal de terceiro) — ver garantirProjeto em app/(app)/importar/actions.ts.
const PROJETO_FEATS = "Aparições/Footprint";

export type EscopoSplitMassa = "todas" | "sem_split" | "feats";

export interface EstadoSplitMassa {
  status: "idle" | "ok" | "error";
  message?: string;
  atualizadas?: number;
}

// Aplica `percentual` como o % do artista em faixa_artistas para um lote de
// faixas dele, escolhido por `escopo`:
// - "todas": toda faixa do artista (catálogo, canal, feats).
// - "sem_split": só as que ainda não têm nenhum split cadastrado (o caso
//   raiz do "—"/R$0 — não sobrescreve o que já foi ajustado à mão).
// - "feats": só as faixas do projeto "Aparições/Footprint" (feats em canal de
//   terceiro), onde o % nunca é criado automaticamente na importação.
// Continua sendo um DEFAULT em massa — o usuário pode refinar depois faixa a
// faixa em "Participantes & Split" (components/faixa/SplitsFaixa.tsx).
export async function definirSplitEmMassa(
  _estado: EstadoSplitMassa,
  formData: FormData,
): Promise<EstadoSplitMassa> {
  const artistaId = String(formData.get("artistaId") ?? "").trim();
  const caminho = caminhoSeguro(formData.get("caminho"));
  const percentual = Number(formData.get("percentual"));
  const escopoBruto = String(formData.get("escopo") ?? "todas").trim();

  if (!artistaId) return { status: "error", message: "Artista inválido." };
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { status: "error", message: "O percentual deve estar entre 0 e 100." };
  }
  const escopo = escopoBruto as EscopoSplitMassa;
  if (escopo !== "todas" && escopo !== "sem_split" && escopo !== "feats") {
    return { status: "error", message: "Escopo inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const [faixas, projetos] = await Promise.all([
    getFaixasDoArtista(artistaId),
    getProjetosDoArtista(artistaId),
  ]);
  if (faixas.length === 0) {
    return { status: "error", message: "Nenhuma faixa encontrada para este artista." };
  }

  const nomeProjetoPorId = new Map(projetos.map((p) => [p.id, p.nome]));
  const idsProjetosFeats = new Set(projetos.filter((p) => p.nome === PROJETO_FEATS).map((p) => p.id));

  let alvo = escopo === "feats" ? faixas.filter((f) => idsProjetosFeats.has(f.projetoId)) : faixas;
  if (alvo.length === 0) {
    return { status: "ok", message: "Nenhuma faixa no escopo selecionado.", atualizadas: 0 };
  }

  // Splits já existentes do artista nas faixas do escopo — usado para filtrar
  // "sem_split" e, nas que já tinham split, preservar o `papel` cadastrado
  // (o upsert reescreve a linha inteira; não queremos trocar um papel já
  // definido manualmente, ex.: "feat", "produtor").
  const { data: existentesRaw, error: existentesError } = await supabase
    .from("faixa_artistas")
    .select("faixa_id, papel")
    .eq("artista_id", artistaId)
    .in("faixa_id", alvo.map((f) => f.id))
    .returns<{ faixa_id: string; papel: string | null }[]>();
  if (existentesError) {
    return { status: "error", message: "Não foi possível verificar os splits existentes." };
  }
  const papelExistente = new Map((existentesRaw ?? []).map((r) => [r.faixa_id, r.papel]));

  if (escopo === "sem_split") {
    alvo = alvo.filter((f) => !papelExistente.has(f.id));
  }
  if (alvo.length === 0) {
    return { status: "ok", message: "Nenhuma faixa no escopo selecionado.", atualizadas: 0 };
  }

  const { error: upsertError } = await supabase.from("faixa_artistas").upsert(
    alvo.map((f) => ({
      faixa_id: f.id,
      artista_id: artistaId,
      papel: papelExistente.get(f.id)
        ?? (nomeProjetoPorId.get(f.projetoId) === PROJETO_FEATS ? "feat" : "principal"),
      percentual,
    })),
    { onConflict: "faixa_id,artista_id" },
  );
  if (upsertError) {
    return { status: "error", message: "Não foi possível aplicar o % em massa. Tente novamente." };
  }

  revalidatePath(caminho);
  return {
    status: "ok",
    message: `${alvo.length} faixa(s) atualizada(s) com ${percentual}%.`,
    atualizadas: alvo.length,
  };
}
