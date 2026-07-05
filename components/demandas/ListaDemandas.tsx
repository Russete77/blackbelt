import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { labelStatusDemanda } from "@/lib/labels";
import { DemandaCard } from "./DemandaCard";
import type { Demanda, StatusDemanda } from "@/types/demandas";

// Ordem fixa das seções (fluxo natural aberta -> em andamento -> concluída),
// independente da ordem "mais recente primeiro" com que vêm do banco.
const GRUPOS: StatusDemanda[] = ["aberta", "em_andamento", "concluida"];

export function ListaDemandas({
  demandas, podeExcluir, caminho,
}: { demandas: Demanda[]; podeExcluir: boolean; caminho: string }) {
  if (demandas.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhuma demanda cadastrada ainda."
        hint="Tarefas e pedidos para o artista (incluindo clipes) aparecerão aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {GRUPOS.map((grupoStatus) => {
        const itens = demandas.filter((d) => d.status === grupoStatus);
        if (itens.length === 0) return null;
        return (
          <section key={grupoStatus}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {labelStatusDemanda(grupoStatus)} <span className="text-muted/70">({itens.length})</span>
            </h3>
            <div className="flex flex-col gap-3">
              {itens.map((d) => (
                <DemandaCard key={d.id} demanda={d} podeExcluir={podeExcluir} caminho={caminho} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
