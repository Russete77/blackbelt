import { notFound } from "next/navigation";
import { getArtista } from "@/lib/db";
import { youtubeConfigurado } from "@/lib/youtube";
import { ConectarDeezer } from "@/components/importar/ConectarDeezer";
import { ConectarCanalYoutube } from "@/components/importar/ConectarCanalYoutube";
import { BuscarFootprintYoutube } from "@/components/importar/BuscarFootprintYoutube";

// Conectar & Importar: traz o catálogo (Deezer) e a presença no YouTube
// (canal próprio + footprint cross-channel em canais de terceiros) do
// artista sem colar link por link — ver app/(app)/importar/actions.ts.
export default async function ImportarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const configurado = youtubeConfigurado();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Conectar &amp; Importar</h2>
        <p className="text-sm text-muted">
          Traga o catálogo e o histórico no YouTube de {artista.nome} sem colar link por link.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConectarDeezer artistaId={artista.id} nomeArtista={artista.nome} deezerArtistId={artista.deezerArtistId} />
        <ConectarCanalYoutube
          artistaId={artista.id}
          youtubeChannelId={artista.youtubeChannelId}
          configurado={configurado}
        />
      </div>

      <BuscarFootprintYoutube artistaId={artista.id} nomeArtista={artista.nome} configurado={configurado} />
    </div>
  );
}
