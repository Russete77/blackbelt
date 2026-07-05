"use client";
// Exclusão de show (admin-only via RLS) com confirmação em dois passos —
// sem modal: o botão vira "Confirmar exclusão" antes de disparar a action.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { excluirShow, type EstadoAcaoShow } from "@/app/(app)/shows/actions";

const ESTADO_INICIAL: EstadoAcaoShow = { status: "idle" };

export function ExcluirShowButton({ showId }: { showId: string }) {
  const caminho = usePathname();
  const [confirmando, setConfirmando] = useState(false);
  const [estado, formAction, pendente] = useActionState(excluirShow, ESTADO_INICIAL);

  if (!confirmando) {
    return (
      <Button type="button" variant="outline" size="sm" className="text-danger" onClick={() => setConfirmando(true)}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Apagar
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={showId} />
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
