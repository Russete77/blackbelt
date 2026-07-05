"use client";
// Formulário compacto de "Nova faixa" dentro do card do projeto.
// Submete via Server Action (criarFaixa) — a escrita passa pelo RLS.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { criarFaixa, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function NovaFaixaForm({ projetoId }: { projetoId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o form no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarFaixa(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted transition-colors duration-200 hover:bg-surface hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Nova faixa
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full animate-fade-in-up rounded-md border border-line bg-surface2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Nova faixa</span>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="rounded-md p-1 text-muted transition-colors duration-200 hover:bg-surface hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="caminho" value={caminho} />

      <div className="flex flex-col gap-2">
        <Input name="titulo" required placeholder="Título da faixa" className="!min-h-9 !bg-surface !py-1.5" />
        <Input name="genero" placeholder="Gênero (opcional)" className="!min-h-9 !bg-surface !py-1.5" />
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
