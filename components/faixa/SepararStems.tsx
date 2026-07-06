"use client";
// Botão "Separar stems": dispara a Server Action (assíncrona) e, enquanto o
// worker processa em segundo plano, faz polling de statusStems a cada 15s —
// mostrando "Separando…" e trocando sozinho para "pronto" (com router.refresh
// pra exibir os novos stems como versões) ou "erro". Ver
// app/(app)/faixa/[id]/actions.ts.
import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { separarStems, statusStems } from "@/app/(app)/faixa/[id]/actions";

const INTERVALO_MS = 15_000;
const MAX_TENTATIVAS = 60; // ~15 min de acompanhamento antes de soltar

export function SepararStems({ versaoId, rotulo }: { versaoId: string; rotulo: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [processando, setProcessando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error" | "info"; texto: string } | null>(null);
  const tentativas = useRef(0);

  // Reidrata o estado ao montar: se a página foi recarregada em meio a um job,
  // o servidor ainda está processando — retoma o polling em vez de deixar o
  // usuário disparar um novo (e duplicar o job).
  useEffect(() => {
    let cancelado = false;
    statusStems(versaoId).then((r) => {
      if (!cancelado && r.status === "processando") {
        setProcessando(true);
        setMsg({ tipo: "info", texto: "Ainda processando — retomando o acompanhamento." });
      }
    });
    return () => {
      cancelado = true;
    };
  }, [versaoId]);

  // Enquanto "processando", pergunta o status periodicamente até pronto/erro/teto.
  useEffect(() => {
    if (!processando) return;
    const id = setInterval(async () => {
      tentativas.current += 1;
      const r = await statusStems(versaoId);
      if (r.status === "pronto") {
        setProcessando(false);
        setMsg({ tipo: "ok", texto: "Stems prontos! Beat e voz já tocam abaixo." });
        router.refresh();
      } else if (r.status === "erro") {
        setProcessando(false);
        setMsg({ tipo: "error", texto: `Falhou: ${r.message ?? "erro no worker."}` });
      } else if (tentativas.current >= MAX_TENTATIVAS) {
        setProcessando(false);
        setMsg({ tipo: "info", texto: "Ainda processando — atualize a página em alguns minutos." });
      }
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [processando, versaoId, router]);

  function rodar() {
    setMsg(null);
    tentativas.current = 0;
    iniciar(async () => {
      const r = await separarStems(versaoId);
      if (r.status === "ok" && r.processando) {
        setProcessando(true);
        setMsg({ tipo: "info", texto: r.message ?? "" });
      } else {
        setMsg({ tipo: r.status === "error" ? "error" : "ok", texto: r.message ?? "" });
        if (r.status === "ok") router.refresh();
      }
    });
  }

  const ativo = pendente || processando;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={rodar}
        disabled={ativo}
        title={`Separar beat e voz de "${rotulo}"`}
      >
        {ativo ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Scissors className="h-4 w-4" aria-hidden />
        )}
        {processando ? "Separando..." : pendente ? "Iniciando..." : "Separar stems"}
      </Button>
      {processando && (
        <span className="text-[11px] text-muted" role="status" aria-live="polite">
          Em CPU leva alguns minutos — pode deixar a página aberta.
        </span>
      )}
      {msg && (
        <span
          className={`text-right text-xs ${msg.tipo === "ok" ? "text-success" : msg.tipo === "error" ? "text-danger" : "text-muted"}`}
          role={msg.tipo === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {msg.texto}
        </span>
      )}
    </div>
  );
}
