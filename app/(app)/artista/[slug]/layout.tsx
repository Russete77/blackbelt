import { notFound } from "next/navigation";
import { getArtista, getSignedCoverUrl } from "@/lib/db";
import { ArtistaTabs } from "@/components/artista/ArtistaTabs";
import { ResumoArtista } from "@/components/artista/ResumoArtista";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { Avatar } from "@/components/ui/Avatar";

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
    <div className="relative p-4 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-4 top-0 h-40 w-64 rounded-full bg-accent/10 blur-3xl md:left-6"
      />
      <div className="relative mb-6 flex animate-fade-in-up items-center gap-4">
        <Avatar nome={artista.nome} src={fotoUrl ?? undefined} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl uppercase tracking-tight md:text-3xl">{artista.nome}</h1>
          {artista.bio && <p className="truncate text-sm text-muted">{artista.bio}</p>}
          <CapaUploader tipo="artista" id={artista.id} rotulo="Foto" className="mt-1.5 inline-block" />
        </div>
      </div>
      <ResumoArtista artistaId={artista.id} slug={slug} />
      <ArtistaTabs slug={slug} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
