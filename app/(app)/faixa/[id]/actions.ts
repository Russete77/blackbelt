"use server";
// Separação de stems (beat/voz) de uma versão via worker Demucs no Railway.
// Fluxo: gera signed URL do áudio da versão → POST no worker (Bearer secret) →
// o worker separa em CPU, sobe os stems pro bucket `audio` e devolve os caminhos
// → registramos cada stem como uma nova `versao` (tipo beat/vocal), então eles
// aparecem no player da faixa como qualquer outra versão. Sessão do usuário
// (RLS aplica) — o service-role fica só no worker, nunca aqui.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedAudioUrl } from "@/lib/db";

const WORKER_URL = process.env.DEMUCS_WORKER_URL;
const WORKER_SECRET = process.env.DEMUCS_WORKER_SECRET;
// Separar em CPU leva minutos; damos folga tanto na signed URL (worker precisa
// baixar) quanto no fetch. 280s fica abaixo do teto de 300s de função serverless.
const SIGNED_TTL = 1800;
const FETCH_TIMEOUT_MS = 280_000;

export interface EstadoStems {
  status: "idle" | "ok" | "error";
  message?: string;
}

export async function separarStems(versaoId: string): Promise<EstadoStems> {
  if (!versaoId) return { status: "error", message: "Versão inválida." };
  if (!WORKER_URL || !WORKER_SECRET) {
    return { status: "error", message: "Separação de stems não configurada (worker indisponível)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  // Versão de origem — RLS garante que o usuário pode vê-la.
  const { data: versao, error: versaoError } = await supabase
    .from("versoes")
    .select("id, faixa_id, arquivo_path")
    .eq("id", versaoId)
    .maybeSingle();
  if (versaoError || !versao) return { status: "error", message: "Versão não encontrada." };
  if (!versao.arquivo_path) return { status: "error", message: "Esta versão não tem áudio para separar." };

  // Já separado antes? Evita rodar o worker (caro) e duplicar versões. Os stems
  // ficam sob "<faixa_id>/stems/<versao_id>/…" — checamos por esse prefixo.
  const prefixoDestino = `${versao.faixa_id}/stems/${versao.id}`;
  const { data: jaExistem } = await supabase
    .from("versoes")
    .select("id, arquivo_path")
    .eq("faixa_id", versao.faixa_id)
    .like("arquivo_path", `${prefixoDestino}/%`);
  const pathsExistentes = new Set((jaExistem ?? []).map((v) => v.arquivo_path));
  if (pathsExistentes.size >= 2) {
    return { status: "ok", message: "Os stems desta versão já foram separados — veja abaixo." };
  }

  const audioUrl = await getSignedAudioUrl(versao.arquivo_path, SIGNED_TTL);
  if (!audioUrl) return { status: "error", message: "Não foi possível gerar o link do áudio." };

  // Chamada síncrona ao worker (separação em CPU leva alguns minutos).
  let resposta: Response;
  try {
    resposta = await fetch(`${WORKER_URL.replace(/\/$/, "")}/separate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        versao_id: versao.id,
        modo: "beat_voz",
        prefixo_destino: prefixoDestino,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return {
      status: "error",
      message: "O worker de stems não respondeu a tempo. Faixas muito longas podem estourar o limite — tente uma versão mais curta.",
    };
  }

  if (!resposta.ok) {
    // Repassa o motivo real que o worker mandou (detail) — encurtado — em vez
    // de só o código, pra facilitar o diagnóstico.
    const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
    const motivo = corpo?.detail ? `: ${String(corpo.detail).slice(0, 300)}` : "";
    return { status: "error", message: `Falha na separação (código ${resposta.status})${motivo}` };
  }

  const dados = (await resposta.json().catch(() => null)) as
    | { ok?: boolean; stems?: Record<string, string> }
    | null;
  if (!dados?.ok || !dados.stems) {
    return { status: "error", message: "O worker não devolveu os stems." };
  }

  // Registra cada stem como uma versão (tipo beat/vocal) usando o caminho que
  // o worker gravou de fato — não reconstrói o path. Só insere o que ainda não
  // existe (retrocompatível com re-execução).
  const mapaTipo: Record<string, "beat" | "vocal"> = { beat: "beat", vocal: "vocal" };
  const novas = Object.entries(dados.stems)
    .filter(([rotulo, path]) => mapaTipo[rotulo] && !pathsExistentes.has(path))
    .map(([rotulo, path]) => ({
      faixa_id: versao.faixa_id,
      tipo: mapaTipo[rotulo],
      rotulo: rotulo === "vocal" ? "Vocal (stem)" : "Beat (stem)",
      arquivo_path: path,
      enviado_por: user.id,
    }));

  if (novas.length > 0) {
    const { error: insertError } = await supabase.from("versoes").insert(novas);
    if (insertError) {
      return { status: "error", message: "Stems gerados, mas falhou o registro das versões." };
    }
  }

  revalidatePath(`/faixa/${versao.faixa_id}`);
  return { status: "ok", message: `Stems prontos: ${novas.length || "0"} nova(s) versão(ões). Beat e voz já tocam abaixo.` };
}
