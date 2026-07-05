import Link from "next/link";
import { Music, Video } from "lucide-react";
import { Cover } from "@/components/ui/Cover";
import { capaPublicaOuThumbnail } from "@/lib/faixa";
import { formatarStreams } from "@/lib/metricas";
import type { Faixa } from "@/types/domain";

// Card de faixa FOOTPRINT (feat/lançamento em canal ou selo de terceiro):
// cover proeminente + título (line-clamp) + views — não uma linha de texto
// com estágio "Ideia", já que essa música já está lançada, não em produção
// aqui. Compartilhado entre ProjetoCard (grid dentro do card do projeto,
// quando o projeto mistura faixas estúdio + footprint) e a aba Feats
// (app/(app)/artista/[slug]/feats/page.tsx).
export function FootprintFaixaCard({ faixa, views }: { faixa: Faixa; views?: number }) {
  return (
    <Link
      href={`/faixa/${faixa.id}`}
      title={faixa.titulo}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface2/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-black/20"
    >
      <Cover
        src={capaPublicaOuThumbnail(faixa)}
        alt={`Capa de ${faixa.titulo}`}
        icon={Music}
        size="fill"
        className="rounded-none"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors duration-200 group-hover:text-accent">
          {faixa.titulo}
        </p>
        <p className="mt-auto flex items-center gap-1.5 font-mono text-xs text-muted">
          <Video className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {views != null ? formatarStreams(views) : "—"}
        </p>
      </div>
    </Link>
  );
}
