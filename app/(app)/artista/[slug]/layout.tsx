import { notFound } from "next/navigation";
import { getArtista, getSignedCoverUrl } from "@/lib/db";
import { ArtistaTabs } from "@/components/artista/ArtistaTabs";
import { CapaUploader } from "@/components/capa/CapaUploader";

export default async function ArtistaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const fotoUrl = artista.fotoUrl ? await getSignedCoverUrl(artista.fotoUrl) : null;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center gap-4">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt={artista.nome}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface2 text-lg font-semibold">
            {artista.nome.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{artista.nome}</h1>
          {artista.bio && <p className="text-muted text-sm">{artista.bio}</p>}
          <CapaUploader tipo="artista" id={artista.id} rotulo="Foto" className="mt-1 inline-block" />
        </div>
      </div>
      <ArtistaTabs slug={slug} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
