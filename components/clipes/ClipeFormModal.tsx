"use client";
// Form de criar/editar clipe, dentro do Modal reutilizável (ver
// components/ui/Modal.tsx) — um único componente para as duas ações: sem
// `clipe`, cria; com `clipe`, edita pré-preenchido. O trigger (botão "Novo
// clipe" na página, "Editar" no card) é injetado via render prop, mesmo
// padrão de components/lancamentos/LancamentoFormModal.tsx.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ListaEditavel } from "@/components/shows/ListaEditavel";
import { ListaLinhasEditavel } from "@/components/registro/ListaLinhasEditavel";
import { criarClipe, atualizarClipe, type EstadoAcao } from "@/app/(app)/artista/[slug]/clipes/actions";
import { labelStatusClipe } from "@/lib/labels";
import type { Faixa } from "@/types/domain";
import type { CueSheetItem } from "@/types/registro";
import type { Clipe, StatusClipe } from "@/types/clipes";

const STATUS: StatusClipe[] = ["ideia", "pre_producao", "gravacao", "pos_producao", "lancado"];

function cueSheetVazio(): CueSheetItem {
  return { trecho: "", duracao: "", titular: "" };
}

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function ClipeFormModal({
  artistaId, faixas, clipe, trigger,
}: {
  artistaId: string;
  faixas: Faixa[];
  // Presente = modo edição.
  clipe?: Clipe;
  trigger: (abrir: () => void) => React.ReactNode;
}) {
  const caminho = usePathname();
  const editando = Boolean(clipe);
  const [aberto, setAberto] = useState(false);
  const [demandas, setDemandas] = useState<string[]>(clipe?.demandas ?? []);
  const [cueSheet, setCueSheet] = useState<CueSheetItem[]>(clipe?.cueSheet ?? []);
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await (editando ? atualizarClipe : criarClipe)(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  return (
    <>
      {trigger(() => setAberto(true))}
      <Modal open={aberto} onClose={() => setAberto(false)} title={editando ? "Editar clipe" : "Novo clipe"}>
        <form action={formAction} className="flex flex-col gap-3">
          {clipe && <input type="hidden" name="id" value={clipe.id} />}
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="demandas" value={JSON.stringify(demandas)} />
          <input type="hidden" name="cueSheet" value={JSON.stringify(cueSheet)} />

          <Field label="Título">
            <Input name="titulo" required defaultValue={clipe?.titulo ?? ""} placeholder="Ex.: Clipe — Nova Era" />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Faixa vinculada" className="flex-1">
              <Select name="faixaId" defaultValue={clipe?.faixaId ?? ""}>
                <option value="">Nenhuma</option>
                {faixas.map((f) => (
                  <option key={f.id} value={f.id}>{f.titulo}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status" className="flex-1">
              <Select name="status" defaultValue={clipe?.status ?? "ideia"}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>{labelStatusClipe(s)}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Data de gravação" className="flex-1">
              <Input type="date" name="dataGravacao" defaultValue={clipe?.dataGravacao ?? ""} />
            </Field>
            <Field label="Data de estreia" className="flex-1">
              <Input type="date" name="dataEstreia" defaultValue={clipe?.dataEstreia ?? ""} />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Link do YouTube" className="flex-1">
              <Input name="videoUrl" defaultValue={clipe?.videoUrl ?? ""} placeholder="Link ou ID do vídeo" />
            </Field>
            <Field label="Diretor" className="flex-1">
              <Input name="diretor" defaultValue={clipe?.diretor ?? ""} placeholder="Nome do diretor" />
            </Field>
          </div>

          <ListaEditavel
            rotulo="Demandas do clipe"
            itens={demandas}
            onChange={setDemandas}
            placeholder="Ex.: Aprovar roteiro"
          />

          <ListaLinhasEditavel
            rotulo="Cue sheet"
            itens={cueSheet}
            onChange={setCueSheet}
            novoItem={cueSheetVazio}
            vazio="Nenhum trecho cadastrado ainda."
            renderLinha={(c, atualizar) => (
              <>
                <Input
                  aria-label="Trecho"
                  value={c.trecho}
                  onChange={(e) => atualizar({ trecho: e.target.value })}
                  placeholder="Trecho (ex.: 00:00–00:15)"
                  className="w-full sm:w-48"
                />
                <Input
                  aria-label="Duração"
                  value={c.duracao}
                  onChange={(e) => atualizar({ duracao: e.target.value })}
                  placeholder="Duração"
                  className="w-full sm:w-32"
                />
                <Input
                  aria-label="Titular"
                  value={c.titular}
                  onChange={(e) => atualizar({ titular: e.target.value })}
                  placeholder="Titular dos direitos"
                  className="w-full sm:flex-1"
                />
              </>
            )}
          />

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente} className="self-start">
              {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Criar clipe"}
            </Button>
            {estado.status === "error" && <p className="text-xs text-danger">{estado.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
