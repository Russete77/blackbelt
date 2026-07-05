import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/registro/StatusChip";
import type { StatusRegistroFaixa } from "@/types/registro";

// Lista da página /registro: uma linha por faixa, com os 3 chips de status
// (Obra/Fonograma/Videograma) e link pro detalhe — mesmo padrão visual de
// card interativo usado em components/estudio/ProjetoCard.tsx.
export function ListaStatusRegistro({
  itens, tituloVazio,
}: { itens: StatusRegistroFaixa[]; tituloVazio: string }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={tituloVazio}
        hint="Faixas cadastradas no Estúdio aparecem aqui para o registro de direitos autorais."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item) => (
        <Link
          key={item.faixaId}
          href={`/registro/${item.faixaId}`}
          className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface2/60 hover:shadow-lg hover:shadow-black/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate font-display text-sm uppercase tracking-tight">{item.faixaTitulo}</p>
            {item.artistaNome && <p className="truncate text-xs text-muted">{item.artistaNome}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label="Obra" ok={item.obraOk} />
            <StatusChip label="Fonograma" ok={item.fonogramaOk} />
            <StatusChip label="Videograma" ok={item.videogramaOk} />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          </div>
        </Link>
      ))}
    </div>
  );
}
