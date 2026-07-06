"use client";
// Botão "Novo artista" + formulário dentro do Modal reutilizável (mesmo padrão
// de NovoProjetoForm/NovaDemandaForm) — só admin (a Server Action rejeita quem
// não for). Submete via Server Action (criarArtista), que gera o slug e
// insere via RLS. Ver app/(app)/actions.ts#criarArtista.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { criarArtista, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function NovoArtistaForm() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Envolve a Server Action para fechar o modal no sucesso (sem useEffect).
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await criarArtista(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Novo artista
      </Button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Novo artista">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="caminho" value={caminho} />

          <Field label="Nome">
            <Input name="nome" required placeholder="Nome do artista" />
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente} className="self-start">
              {pendente ? "Cadastrando..." : "Cadastrar artista"}
            </Button>
            {estado.status === "error" && (
              <p role="alert" className="text-xs text-danger">{estado.message}</p>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
