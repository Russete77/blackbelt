"use server";
// Separação de stems (beat/voz) de uma versão via worker Demucs no Railway.
// ASSÍNCRONO: separarStems só DISPARA o worker (que responde na hora) e o worker
// processa em segundo plano, sobe os stems pro bucket `audio` e registra cada um
// como uma `versao` (tipo beat/vocal) — eles aparecem no player como qualquer
// outra versão. statusStems faz o polling: primeiro checa o banco (fonte da
// verdade: os stems já viraram versões?), senão pergunta o status ao worker.
// Sessão do usuário (RLS aplica) — o service-role fica só no worker.
import { createClient } from "@/lib/supabase/server";
import { getSignedAudioUrl } from "@/lib/db";

const WORKER_URL = process.env.DEMUCS_WORKER_URL;
const WORKER_SECRET = process.env.DEMUCS_WORKER_SECRET;
// TTL folgado: o worker pode começar a baixar o áudio minutos depois do disparo.
const SIGNED_TTL = 3600;

export interface EstadoStems {
  status: "idle" | "ok" | "error";
  message?: string;
  // true quando a separação foi disparada e está rodando no worker (UI faz poll).
  processando?: boolean;
}

function prefixoStems(faixaId: string, versaoId: string): string {
  return `${faixaId}/stems/${versaoId}`;
}

export async function separarStems(versaoId: string): Promise<EstadoStems> {
  if (!versaoId) return { status: "error", message: "Versão inválida." };
  if (!WORKER_URL || !WORKER_SECRET) {
    return { status: "error", message: "Separação de stems não configurada (worker indisponível)." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: versao, error: versaoError } = await supabase
    .from("versoes")
    .select("id, faixa_id, arquivo_path")
    .eq("id", versaoId)
    .maybeSingle();
  if (versaoError || !versao) return { status: "error", message: "Versão não encontrada." };
  if (!versao.arquivo_path) return { status: "error", message: "Esta versão não tem áudio para separar." };

  // Já separado? Evita rodar o worker de novo e duplicar versões.
  const prefixoDestino = prefixoStems(versao.faixa_id, versao.id);
  const { data: jaExistem } = await supabase
    .from("versoes")
    .select("id")
    .eq("faixa_id", versao.faixa_id)
    .like("arquivo_path", `${prefixoDestino}/%`);
  if ((jaExistem?.length ?? 0) >= 2) {
    return { status: "ok", message: "Os stems desta versão já foram separados — veja abaixo." };
  }

  const audioUrl = await getSignedAudioUrl(versao.arquivo_path, SIGNED_TTL);
  if (!audioUrl) return { status: "error", message: "Não foi possível gerar o link do áudio." };

  // DISPARA e não espera terminar — o worker responde 202 na hora e processa
  // em background (grava as versões dos stems ele mesmo, via service role).
  try {
    const resposta = await fetch(`${WORKER_URL.replace(/\/$/, "")}/separate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WORKER_SECRET}` },
      body: JSON.stringify({
        audio_url: audioUrl,
        faixa_id: versao.faixa_id,
        versao_id: versao.id,
        user_id: user.id,
        modo: "beat_voz",
        prefixo_destino: prefixoDestino,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
      const motivo = corpo?.detail ? `: ${String(corpo.detail).slice(0, 200)}` : "";
      return { status: "error", message: `Não consegui iniciar a separação (código ${resposta.status})${motivo}` };
    }
  } catch {
    return { status: "error", message: "O worker de stems não respondeu. Confira se ele está no ar." };
  }

  return {
    status: "ok",
    processando: true,
    message: "Separação iniciada — leva alguns minutos. Pode deixar a página aberta.",
  };
}

export type StatusStems = { status: "processando" | "pronto" | "erro" | "desconhecido"; message?: string };

// Polling: primeiro o banco (se os stems já viraram versões, acabou), senão
// pergunta ao worker (que sabe se ainda processa ou falhou, com o motivo).
export async function statusStems(versaoId: string): Promise<StatusStems> {
  if (!versaoId) return { status: "desconhecido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "desconhecido", message: "Sessão expirada." };

  const { data: versao } = await supabase
    .from("versoes")
    .select("faixa_id")
    .eq("id", versaoId)
    .maybeSingle();
  if (versao) {
    const prefixo = prefixoStems(versao.faixa_id, versaoId);
    const { data: stems } = await supabase
      .from("versoes")
      .select("id")
      .eq("faixa_id", versao.faixa_id)
      .like("arquivo_path", `${prefixo}/%`);
    if ((stems?.length ?? 0) >= 2) return { status: "pronto" };
  }

  if (WORKER_URL && WORKER_SECRET) {
    try {
      const r = await fetch(`${WORKER_URL.replace(/\/$/, "")}/status/${versaoId}`, {
        headers: { Authorization: `Bearer ${WORKER_SECRET}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (r.ok) {
        const d = (await r.json().catch(() => null)) as { status?: string; detail?: string } | null;
        if (d?.status === "erro") return { status: "erro", message: d.detail ? String(d.detail).slice(0, 300) : undefined };
        if (d?.status === "pronto") return { status: "pronto" };
        if (d?.status === "processando") return { status: "processando" };
      }
    } catch {
      // worker fora do ar / reiniciado — deixa o polling continuar como processando
    }
  }
  return { status: "processando" };
}
