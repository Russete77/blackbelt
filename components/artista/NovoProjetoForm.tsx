"use client";
// Botão + formulário inline para criar um projeto vinculado ao artista.
// Submete via Server Action (criarProjeto) — a escrita passa pelo RLS.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { criarProjeto, type EstadoAcao } from "@/app/(app)/actions";
import { labelTipoProjeto } from "@/lib/labels";
import type { TipoProjeto } from "@/types/domain";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const TIPOS: TipoProjeto[] = ["single", "ep", "album", "feat"];

export function NovoProjetoForm({ artistaId }: { artistaId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o form no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarProjeto(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Novo projeto
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full max-w-md rounded-lg border border-line bg-surface p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Novo projeto</h3>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="text-muted hover:text-fg transition"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <input type="hidden" name="artistaId" value={artistaId} />
      <input type="hidden" name="caminho" value={caminho} />

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nome
          <input
            name="nome"
            required
            placeholder="Nome do projeto"
            className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo
          <select
            name="tipo"
            defaultValue="single"
            className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>{labelTipoProjeto(t)}</option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Criando..." : "Criar projeto"}
        </Button>
        {estado.status === "error" && (
          <p className="text-xs text-danger">{estado.message}</p>
        )}
      </div>
    </form>
  );
}
