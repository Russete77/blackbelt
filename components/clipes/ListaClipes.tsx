import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipeCard } from "./ClipeCard";
import type { Faixa } from "@/types/domain";
import type { Clipe } from "@/types/clipes";

export function ListaClipes({
  clipes, artistaId, faixas, podeExcluir, caminho,
}: {
  clipes: Clipe[];
  artistaId: string;
  faixas: Faixa[];
  podeExcluir: boolean;
  caminho: string;
}) {
  if (clipes.length === 0) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Nenhum clipe cadastrado ainda."
        hint="Ideias, produção e cue sheet de cada videoclipe aparecem aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {clipes.map((c) => (
        <ClipeCard
          key={c.id}
          clipe={c}
          artistaId={artistaId}
          faixas={faixas}
          podeExcluir={podeExcluir}
          caminho={caminho}
        />
      ))}
    </div>
  );
}
