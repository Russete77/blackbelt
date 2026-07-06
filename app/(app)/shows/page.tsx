import { Suspense } from "react";
import { AgendaShows } from "@/components/shows/AgendaShows";
import { FiltroArtista } from "@/components/shows/FiltroArtista";
import { NovoShowButton } from "@/components/shows/NovoShowButton";
import { getArtistas, getShows } from "@/lib/db";

// Agenda de shows do selo: próximas datas por mês + histórico, com filtro
// por artista via query string (?artista=) — o filtro roda no servidor.
export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ artista?: string }>;
}) {
  const { artista } = await searchParams;
  const [shows, artistas] = await Promise.all([getShows(), getArtistas()]);
  const filtrados = artista ? shows.filter((s) => s.artistaId === artista) : shows;
  const artistaFiltrado = artista ? artistas.find((a) => a.id === artista) : undefined;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Shows</h1>
          <p className="text-sm text-muted">
            Agenda de shows do selo — próximas datas, cachês e riders.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="w-full min-w-48 sm:w-56">
            {/* useSearchParams exige um boundary de Suspense no App Router. */}
            <Suspense fallback={null}>
              <FiltroArtista artistas={artistas} />
            </Suspense>
          </div>
          <NovoShowButton artistas={artistas} artistaId={artista} />
        </div>
      </div>

      <AgendaShows
        shows={filtrados}
        tituloVazio={
          artistaFiltrado
            ? `Nenhum show na agenda para ${artistaFiltrado.nome}.`
            : "Nenhum show na agenda ainda."
        }
      />
    </div>
  );
}
