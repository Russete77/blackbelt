"use client";
// Form de edição completa (título/descrição/prazo) de uma demanda existente
// — o status em si é trocado pelo <select> rápido do DemandaCard
// (mudarStatusDemanda), então aqui carregamos o status atual num hidden
// input em vez de expor outro seletor duplicado.
import { useActionState } from "react";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { atualizarDemanda, type EstadoAcao } from "@/app/(app)/demandas/actions";
import type { Demanda } from "@/types/demandas";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function EditarDemandaForm({
  demanda, caminho, onSalvo,
}: { demanda: Demanda; caminho: string; onSalvo: () => void }) {
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await atualizarDemanda(prev, formData);
      if (resultado.status === "ok") onSalvo();
      return resultado;
    },
    ESTADO_INICIAL,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <input type="hidden" name="id" value={demanda.id} />
      <input type="hidden" name="artistaId" value={demanda.artistaId} />
      <input type="hidden" name="status" value={demanda.status} />
      <input type="hidden" name="caminho" value={caminho} />
      <Field label="Título">
        <Input name="titulo" defaultValue={demanda.titulo} required />
      </Field>
      <Field label="Descrição">
        <Textarea name="descricao" defaultValue={demanda.descricao ?? ""} rows={3} />
      </Field>
      <Field label="Prazo">
        <Input type="date" name="prazo" defaultValue={demanda.prazo ?? ""} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar alterações"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onSalvo}>
          Cancelar
        </Button>
      </div>
      {estado.status === "error" && <p className="text-xs text-danger">{estado.message}</p>}
    </form>
  );
}
