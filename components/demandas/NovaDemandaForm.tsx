"use client";
// Botão "Nova demanda" + formulário dentro do Modal reutilizável (mesmo padrão
// de ClipeFormModal/ShowFormModal) — inclui demandas de clipe (título
// "Clipe: ..."). Submete via Server Action (criarDemanda), que também notifica
// o artista — ver app/(app)/demandas/actions.ts.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { criarDemanda, type EstadoAcao } from "@/app/(app)/demandas/actions";
import { labelStatusDemanda } from "@/lib/labels";
import type { StatusDemanda } from "@/types/demandas";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const STATUS: StatusDemanda[] = ["aberta", "em_andamento", "concluida"];

export function NovaDemandaForm({ artistaId }: { artistaId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o modal no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarDemanda(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nova demanda
      </Button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Nova demanda">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="caminho" value={caminho} />

          <Field label="Título">
            <Input name="titulo" required placeholder="Ex.: Clipe: Nome da faixa" />
          </Field>
          <Field label="Descrição">
            <Textarea name="descricao" rows={3} placeholder="Detalhes da demanda (opcional)" />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row">
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

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente} className="self-start">
              {pendente ? "Criando..." : "Criar demanda"}
            </Button>
            {estado.status === "error" && <p className="text-xs text-danger">{estado.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
