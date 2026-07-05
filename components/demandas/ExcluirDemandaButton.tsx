"use client";
// Exclusão de demanda (admin-only via RLS) com confirmação em dois passos —
// sem modal: o botão vira "Confirmar" antes de disparar a action. Mesmo
// padrão de components/shows/ExcluirShowButton.tsx.
import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { excluirDemanda, type EstadoAcao } from "@/app/(app)/demandas/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function ExcluirDemandaButton({ demandaId, caminho }: { demandaId: string; caminho: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, formAction, pendente] = useActionState(excluirDemanda, ESTADO_INICIAL);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label="Apagar demanda"
        className="flex items-center gap-1 text-xs font-medium text-danger transition-colors duration-200 hover:brightness-110"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Apagar
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={demandaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <Button type="submit" size="sm" disabled={pendente} className="bg-danger text-fg hover:brightness-110">
        {pendente ? "Apagando..." : "Confirmar exclusão"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
      {estado.status === "error" && (
        <p className="w-full text-xs text-danger">{estado.message}</p>
      )}
    </form>
  );
}
