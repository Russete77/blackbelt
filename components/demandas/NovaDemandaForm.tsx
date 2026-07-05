"use client";
// Botão + formulário inline para criar uma demanda vinculada ao artista
// (inclui demandas de clipe: título "Clipe: ..." — sem UI específica, é uma
// demanda comum). Submete via Server Action (criarDemanda), que também
// notifica o artista — ver app/(app)/demandas/actions.ts.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { criarDemanda, type EstadoAcao } from "@/app/(app)/demandas/actions";
import { labelStatusDemanda } from "@/lib/labels";
import type { StatusDemanda } from "@/types/demandas";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const STATUS: StatusDemanda[] = ["aberta", "em_andamento", "concluida"];

export function NovaDemandaForm({ artistaId }: { artistaId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o form no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarDemanda(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova demanda
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full max-w-md animate-fade-in-up rounded-lg border border-line bg-surface p-4 shadow-lg shadow-black/20"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Nova demanda</h3>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <input type="hidden" name="artistaId" value={artistaId} />
      <input type="hidden" name="caminho" value={caminho} />

      <div className="flex flex-col gap-3">
        <Field label="Título">
          <Input name="titulo" required placeholder="Ex.: Clipe: Nome da faixa" />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" rows={3} placeholder="Detalhes da demanda (opcional)" />
        </Field>
        <div className="flex gap-3">
          <Field label="Prazo" className="flex-1">
            <Input type="date" name="prazo" />
          </Field>
          <Field label="Status" className="flex-1">
            <Select name="status" defaultValue="aberta">
              {STATUS.map((s) => (
                <option key={s} value={s}>{labelStatusDemanda(s)}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Criando..." : "Criar demanda"}
        </Button>
        {estado.status === "error" && (
          <p className="text-xs text-danger">{estado.message}</p>
        )}
      </div>
    </form>
  );
}
