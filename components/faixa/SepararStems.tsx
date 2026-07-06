"use client";
// Botão "Separar stems": dispara a Server Action separarStems para a versão
// atual, mostra o estado de "separando" (é lento — Demucs em CPU leva minutos)
// e recarrega a página no sucesso para exibir os novos stems (beat/voz) como
// versões tocáveis. Ver app/(app)/faixa/[id]/actions.ts.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { separarStems } from "@/app/(app)/faixa/[id]/actions";

export function SepararStems({ versaoId, rotulo }: { versaoId: string; rotulo: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function rodar() {
    setMsg(null);
    iniciar(async () => {
      const resultado = await separarStems(versaoId);
      setMsg({ tipo: resultado.status === "error" ? "error" : "ok", texto: resultado.message ?? "" });
      if (resultado.status === "ok") router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={rodar}
        disabled={pendente}
        title={`Separar beat e voz de "${rotulo}"`}
      >
        {pendente ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Scissors className="h-4 w-4" aria-hidden />
        )}
        {pendente ? "Separando..." : "Separar stems"}
      </Button>
      {pendente && (
        <span className="text-[11px] text-muted">Beat/voz em CPU — leva alguns minutos, pode aguardar.</span>
      )}
      {msg && (
        <span className={`text-right text-xs ${msg.tipo === "ok" ? "text-success" : "text-danger"}`}>
          {msg.texto}
        </span>
      )}
    </div>
  );
}
