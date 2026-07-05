import Link from "next/link";
import { Music } from "lucide-react";
import { Cover } from "@/components/ui/Cover";
import { capaPublicaOuThumbnail } from "@/lib/faixa";
import { labelEstagio } from "@/lib/labels";
import type { EstagioPipeline } from "@/types/domain";
import type { FaixaEstudioComArtista } from "@/lib/db";

// Ordem fixa das colunas do Kanban — espelha o pipeline de produção do PRD.
export const ORDEM_ESTAGIOS: EstagioPipeline[] = [
  "ideia", "gravacao", "mixagem", "masterizacao", "aprovado", "lancado",
];

// Agrupa as faixas de estúdio por estágio de pipeline — função pura (sem
// I/O), testável isolada da busca ao banco (ver
// lib/db.ts#getFaixasEstudioComArtista).
export function agruparPorEstagio(
  faixas: FaixaEstudioComArtista[],
): Record<EstagioPipeline, FaixaEstudioComArtista[]> {
  const grupos = Object.fromEntries(ORDEM_ESTAGIOS.map((e) => [e, [] as FaixaEstudioComArtista[]])) as Record<
    EstagioPipeline,
    FaixaEstudioComArtista[]
  >;
  for (const item of faixas) {
    grupos[item.faixa.estagio]?.push(item);
  }
  return grupos;
}

// Kanban de produção do selo: uma coluna por estágio de pipeline, cada uma
// com as faixas de estúdio (já filtradas de footprint em getFaixasEstudioComArtista)
// naquele estágio. Rola horizontalmente no mobile (colunas lado a lado, sem
// estourar a largura da página) e sem barra de rolagem visível.
export function EstudioKanban({ faixas }: { faixas: FaixaEstudioComArtista[] }) {
  const grupos = agruparPorEstagio(faixas);

  return (
    <div
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      role="list"
      aria-label="Kanban de produção por estágio"
    >
      {ORDEM_ESTAGIOS.map((estagio) => {
        const itens = grupos[estagio];
        return (
          <div
            key={estagio}
            role="listitem"
            className="flex w-64 shrink-0 flex-col rounded-lg border border-line bg-surface/40"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
              <h2 className="text-sm font-semibold">{labelEstagio(estagio)}</h2>
              <span className="rounded-full bg-surface2 px-2 py-0.5 font-mono text-xs text-muted">
                {itens.length}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-2">
              {itens.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">—</p>
              ) : (
                itens.map(({ faixa, artistaNome }) => (
                  <Link
                    key={faixa.id}
                    href={`/faixa/${faixa.id}`}
                    className="group flex items-center gap-2.5 rounded-md p-1.5 transition-colors duration-200 hover:bg-surface2"
                  >
                    <Cover
                      src={capaPublicaOuThumbnail(faixa)}
                      alt={`Capa de ${faixa.titulo}`}
                      icon={Music}
                      size="sm"
                      className="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium transition-colors duration-200 group-hover:text-accent">
                        {faixa.titulo}
                      </p>
                      <p className="truncate text-xs text-muted">{artistaNome}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
