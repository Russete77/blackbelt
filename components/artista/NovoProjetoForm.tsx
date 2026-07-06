"use client";
// Botão "Novo projeto" + formulário dentro do Modal reutilizável (mesmo padrão
// de NovaDemandaForm/ClipeFormModal — botões que abrem formulário viram modal,
// não painel inline). Submete via Server Action (criarProjeto), que passa pelo
// RLS. Ver app/(app)/actions.ts#criarProjeto.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { criarProjeto, type EstadoAcao } from "@/app/(app)/actions";
import { labelTipoProjeto } from "@/lib/labels";
import type { TipoProjeto } from "@/types/domain";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const TIPOS: TipoProjeto[] = ["single", "ep", "album", "feat"];

export function NovoProjetoForm({ artistaId }: { artistaId: string }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o modal no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarProjeto(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Novo projeto
      </Button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Novo projeto">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="caminho" value={caminho} />

          <Field label="Nome">
            <Input name="nome" required placeholder="Nome do projeto" />
          </Field>
          <Field label="Tipo">
            <Select name="tipo" defaultValue="single">
              {TIPOS.map((t) => (
                <option key={t} value={t}>{labelTipoProjeto(t)}</option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente} className="self-start">
              {pendente ? "Criando..." : "Criar projeto"}
            </Button>
            {estado.status === "error" && (
              <p className="text-xs text-danger">{estado.message}</p>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
