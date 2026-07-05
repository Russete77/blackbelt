"use client";
// Form de criar/editar lançamento, dentro do Modal reutilizável (ver
// components/ui/Modal.tsx) — um único componente para as duas ações: sem
// `lancamento`, cria; com `lancamento`, edita pré-preenchido. O trigger (botão
// "Novo lançamento" na página, "Editar" no card) é injetado via render prop,
// para o próprio consumidor decidir a aparência do gatilho.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { ListaLinhasEditavel } from "@/components/registro/ListaLinhasEditavel";
import { criarLancamento, atualizarLancamento, type EstadoAcao } from "@/app/(app)/artista/[slug]/lancamentos/actions";
import { labelTipoLancamento, labelStatusLancamento, labelPlataforma } from "@/lib/labels";
import { cn } from "@/lib/cn";
import type { Faixa } from "@/types/domain";
import type { ChecklistItem, Lancamento, StatusLancamento, TipoLancamento } from "@/types/lancamentos";

const TIPOS: TipoLancamento[] = ["single", "ep", "album"];
const STATUS: StatusLancamento[] = ["planejado", "agendado", "lancado"];
const PLATAFORMAS_SUGERIDAS = ["spotify", "youtube", "deezer", "apple", "tiktok", "instagram"];

// Checklist padrão de divulgação (D-30 -> D0) para todo lançamento novo —
// editável (adicionar/remover/renomear tarefa) via ListaLinhasEditavel.
const CHECKLIST_PADRAO: ChecklistItem[] = [
  "D-30: definir data e plataformas",
  "D-30: enviar áudio final + metadados (ISRC)",
  "D-15: arte da capa aprovada",
  "D-15: agendar pre-save / pre-add",
  "D-7: assets para redes sociais prontos",
  "D-3: confirmar entrega nas distribuidoras",
  "D-1: publicar teaser",
  "D0: lançamento publicado + divulgação",
].map((tarefa) => ({ tarefa, feito: false }));

function checklistItemVazio(): ChecklistItem {
  return { tarefa: "", feito: false };
}

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function LancamentoFormModal({
  artistaId, faixas, lancamento, capaUrlAssinada, trigger,
}: {
  artistaId: string;
  faixas: Faixa[];
  // Presente = modo edição.
  lancamento?: Lancamento;
  capaUrlAssinada?: string | null;
  trigger: (abrir: () => void) => React.ReactNode;
}) {
  const caminho = usePathname();
  const editando = Boolean(lancamento);
  const [aberto, setAberto] = useState(false);
  const [plataformas, setPlataformas] = useState<string[]>(lancamento?.plataformas ?? []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    lancamento && lancamento.checklist.length > 0 ? lancamento.checklist : CHECKLIST_PADRAO,
  );
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await (editando ? atualizarLancamento : criarLancamento)(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  function togglePlataforma(p: string) {
    setPlataformas((atual) => (atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p]));
  }

  return (
    <>
      {trigger(() => setAberto(true))}
      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={editando ? "Editar lançamento" : "Novo lançamento"}
      >
        <form action={formAction} className="flex flex-col gap-3">
          {lancamento && <input type="hidden" name="id" value={lancamento.id} />}
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="plataformas" value={JSON.stringify(plataformas)} />
          <input type="hidden" name="checklist" value={JSON.stringify(checklist)} />

          <Field label="Título">
            <Input name="titulo" required defaultValue={lancamento?.titulo ?? ""} placeholder="Ex.: Nova Era" />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Tipo" className="flex-1">
              <Select name="tipo" defaultValue={lancamento?.tipo ?? "single"}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{labelTipoLancamento(t)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status" className="flex-1">
              <Select name="status" defaultValue={lancamento?.status ?? "planejado"}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>{labelStatusLancamento(s)}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Data de lançamento" className="flex-1">
              <Input type="date" name="dataLancamento" defaultValue={lancamento?.dataLancamento ?? ""} />
            </Field>
            <Field label="ISRC" className="flex-1">
              <Input
                name="isrc"
                defaultValue={lancamento?.isrc ?? ""}
                placeholder="BR-XXX-00-00000"
                className="font-mono"
              />
            </Field>
          </div>

          <Field label="Faixa vinculada">
            <Select name="faixaId" defaultValue={lancamento?.faixaId ?? ""}>
              <option value="">Nenhuma</option>
              {faixas.map((f) => (
                <option key={f.id} value={f.id}>{f.titulo}</option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Plataformas
            <div className="flex flex-wrap gap-2">
              {PLATAFORMAS_SUGERIDAS.map((p) => {
                const ativo = plataformas.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlataforma(p)}
                    aria-pressed={ativo}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                      ativo
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-line text-muted hover:border-accent/40 hover:text-fg",
                    )}
                  >
                    {labelPlataforma(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Capa
            {lancamento ? (
              <div className="flex items-center gap-2">
                {capaUrlAssinada && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária (Storage privado), Image do Next exige domínio fixo.
                  <img src={capaUrlAssinada} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                )}
                <CapaUploader tipo="lancamento" id={lancamento.id} rotulo={capaUrlAssinada ? "Trocar capa" : "Enviar capa"} />
              </div>
            ) : (
              <p className="text-xs text-muted">A capa pode ser enviada depois de criar, editando o lançamento.</p>
            )}
          </div>

          <ListaLinhasEditavel
            rotulo="Checklist (D-30 → D0)"
            itens={checklist}
            onChange={setChecklist}
            novoItem={checklistItemVazio}
            vazio="Nenhuma tarefa no checklist ainda."
            renderLinha={(item, atualizar, i) => (
              <>
                <input
                  type="checkbox"
                  checked={item.feito}
                  onChange={(e) => atualizar({ feito: e.target.checked })}
                  aria-label={`Tarefa ${i + 1} concluída`}
                  className="h-4 w-4 shrink-0 accent-accent"
                />
                <Input
                  value={item.tarefa}
                  onChange={(e) => atualizar({ tarefa: e.target.value })}
                  placeholder="Tarefa"
                  aria-label={`Descrição da tarefa ${i + 1}`}
                  className={cn("flex-1", item.feito && "text-muted line-through")}
                />
              </>
            )}
          />

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente} className="self-start">
              {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Criar lançamento"}
            </Button>
            {estado.status === "error" && <p className="text-xs text-danger">{estado.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
