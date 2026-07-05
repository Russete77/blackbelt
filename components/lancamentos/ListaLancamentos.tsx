import { Music } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LancamentoCard } from "./LancamentoCard";
import type { Faixa } from "@/types/domain";
import type { Lancamento } from "@/types/lancamentos";

export function ListaLancamentos({
  lancamentos, artistaId, faixas, capasAssinadas, podeExcluir, caminho,
}: {
  lancamentos: Lancamento[];
  artistaId: string;
  faixas: Faixa[];
  capasAssinadas: Record<string, string | null>;
  podeExcluir: boolean;
  caminho: string;
}) {
  if (lancamentos.length === 0) {
    return (
      <EmptyState
        icon={Music}
        title="Nenhum lançamento cadastrado ainda."
        hint="Planeje data, plataformas, ISRC e o checklist de divulgação de cada release aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lancamentos.map((l) => (
        <LancamentoCard
          key={l.id}
          lancamento={l}
          artistaId={artistaId}
          faixas={faixas}
          capaUrlAssinada={capasAssinadas[l.id] ?? null}
          podeExcluir={podeExcluir}
          caminho={caminho}
        />
      ))}
    </div>
  );
}
