"use client";
// Formulário compacto de "Nova faixa" dentro do card do projeto.
// Submete via Server Action (criarFaixa) — a escrita passa pelo RLS.
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { criarFaixa, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function NovaFaixaForm({ projetoId }: { projetoId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(criarFaixa, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.status === "ok") setAberto(false);
  }, [estado]);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Nova faixa
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 rounded-md border border-line bg-surface2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Nova faixa</span>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="text-muted hover:text-fg transition"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="caminho" value={caminho} />

      <div className="flex flex-col gap-2">
        <input
          name="titulo"
          required
          placeholder="Título da faixa"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <input
          name="genero"
          placeholder="Gênero (opcional)"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Criando..." : "Criar faixa"}
        </Button>
        {estado.status === "error" && (
          <p className="text-xs text-danger">{estado.message}</p>
        )}
      </div>
    </form>
  );
}
