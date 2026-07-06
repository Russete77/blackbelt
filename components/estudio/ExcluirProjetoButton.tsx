"use client";
// Botão "Apagar" do projeto (só admin — a Server Action e a RLS confirmam).
// Confirmação em dois passos inline: apagar projeto é destrutivo e cascateia
// para faixas/versões/comentários. Ver app/(app)/actions.ts#excluirProjeto.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Trash2 } from "lucide-react";
import { excluirProjeto, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function ExcluirProjetoButton({ projetoId, projetoNome }: { projetoId: string; projetoNome: string }) {
  const caminho = usePathname();
  const [confirmando, setConfirmando] = useState(false);
  const [estado, formAction, pendente] = useActionState(excluirProjeto, ESTADO_INICIAL);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-danger/50 hover:text-danger"
        title={`Apagar "${projetoNome}"`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Apagar
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={projetoId} />
      <input type="hidden" name="caminho" value={caminho} />
      <span className="text-xs text-muted">Apagar o projeto e todas as faixas dele?</span>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-danger/15 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/25 disabled:opacity-60"
      >
        {pendente ? "Apagando..." : "Sim, apagar"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-fg"
      >
        Cancelar
      </button>
      {estado.status === "error" && <span className="text-xs text-danger">{estado.message}</span>}
    </form>
  );
}
