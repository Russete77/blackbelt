import { Suspense } from "react";
import { getArtistas, getStatusRegistros } from "@/lib/db";
import { FiltroArtistaRegistro } from "@/components/registro/FiltroArtistaRegistro";
import { ListaStatusRegistro } from "@/components/registro/ListaStatusRegistro";

// Lista de Registro & Direitos: todas as faixas visíveis (RLS), com o status
// de preenchimento de obra/fonograma/videograma — filtro por artista via
// query string (?artista=), mesmo padrão de app/(app)/shows/page.tsx.
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ artista?: string }>;
}) {
  const { artista } = await searchParams;
  const [status, artistas] = await Promise.all([getStatusRegistros(), getArtistas()]);
  const filtrados = artista ? status.filter((s) => s.artistaId === artista) : status;
  const artistaFiltrado = artista ? artistas.find((a) => a.id === artista) : undefined;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Registro</h1>
          <p className="text-sm text-muted">
            Registro & Direitos — obra (composição), fonograma (gravação) e videograma (clipe) por faixa.
          </p>
        </div>
        <div className="w-full min-w-48 sm:w-56">
          {/* useSearchParams exige um boundary de Suspense no App Router. */}
          <Suspense fallback={null}>
            <FiltroArtistaRegistro artistas={artistas} />
          </Suspense>
        </div>
      </div>

      <ListaStatusRegistro
        itens={filtrados}
        tituloVazio={
          artistaFiltrado
            ? `Nenhuma faixa para ${artistaFiltrado.nome}.`
            : "Nenhuma faixa cadastrada ainda."
        }
      />
    </div>
  );
}
