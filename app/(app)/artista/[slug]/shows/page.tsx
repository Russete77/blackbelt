import { notFound } from "next/navigation";
import { AgendaShows } from "@/components/shows/AgendaShows";
import { NovoShowLink } from "@/components/shows/NovoShowLink";
import { getArtista, getShowsDoArtista } from "@/lib/db";

// Aba Shows do workspace do artista: a mesma agenda do selo, filtrada, com
// "Novo show" já pré-vinculado a este artista.
export default async function ShowsArtistaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const shows = await getShowsDoArtista(artista.id);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Shows</h2>
        <NovoShowLink artistaId={artista.id} size="sm" />
      </div>
      <AgendaShows
        shows={shows}
        mostrarArtista={false}
        tituloVazio={`Nenhum show cadastrado ainda para ${artista.nome}.`}
        hintVazio="Datas e locais de shows aparecerão aqui assim que forem cadastrados."
      />
    </div>
  );
}
