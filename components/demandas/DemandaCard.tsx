"use client";
// Card de uma demanda: título/descrição/prazo, chip de status, troca rápida
// de status (select otimista) e, para admin, exclusão. "Editar" abre um
// modal com o form completo (EditarDemandaForm) para título/descrição/prazo.
import { useState, useTransition } from "react";
import { formatarDataPura } from "@/lib/datas";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { labelStatusDemanda, toneStatusDemanda } from "@/lib/labels";
import { mudarStatusDemanda } from "@/app/(app)/demandas/actions";
import { EditarDemandaForm } from "./EditarDemandaForm";
import { ExcluirDemandaButton } from "./ExcluirDemandaButton";
import type { Demanda, StatusDemanda } from "@/types/demandas";

const STATUS: StatusDemanda[] = ["aberta", "em_andamento", "concluida"];

export function DemandaCard({
  demanda, podeExcluir, caminho,
}: { demanda: Demanda; podeExcluir: boolean; caminho: string }) {
  const [status, setStatus] = useState(demanda.status);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function aoMudarStatus(novo: StatusDemanda) {
    const anterior = status;
    setStatus(novo);
    setErro(null);
    startTransition(() => {
      void mudarStatusDemanda(demanda.id, novo, demanda.artistaId, demanda.titulo, caminho).then((resultado) => {
        if (resultado.status === "error") {
          setStatus(anterior);
          setErro(resultado.message ?? "Não foi possível atualizar o status.");
        }
      });
    });
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-fg">{demanda.titulo}</p>
            {demanda.descricao && <p className="mt-1 text-sm text-muted">{demanda.descricao}</p>}
          </div>
          <Badge tone={toneStatusDemanda(status)} className="shrink-0">{labelStatusDemanda(status)}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {demanda.prazo && (
            <span className="text-xs text-muted">Prazo: {formatarDataPura(demanda.prazo)}</span>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onChange={(e) => aoMudarStatus(e.target.value as StatusDemanda)}
              aria-label="Mudar status da demanda"
              className="w-auto"
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>{labelStatusDemanda(s)}</option>
              ))}
            </Select>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(true)}>
              Editar
            </Button>
            {podeExcluir && <ExcluirDemandaButton demandaId={demanda.id} caminho={caminho} />}
          </div>
        </div>

        {erro && (
          <p role="alert" className="mt-2 text-xs text-danger">{erro}</p>
        )}
      </CardBody>

      <Modal open={editando} onClose={() => setEditando(false)} title="Editar demanda">
        <EditarDemandaForm
          demanda={{ ...demanda, status }}
          caminho={caminho}
          onSalvo={() => setEditando(false)}
        />
      </Modal>
    </Card>
  );
}
