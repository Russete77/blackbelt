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
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold">Conectar &amp; Importar</h2>
        <p className="text-sm text-muted">
          Mapeie tudo de {artista.nome} sem colar link por link — em dois passos.
        </p>
      </div>

      {/* Passo 1: o próprio artista — catálogo (Deezer) + canal oficial (YouTube). */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">1</span>
          <div>
            <h3 className="text-sm font-semibold">O próprio artista</h3>
            <p className="text-xs text-muted">
              Catálogo completo (Deezer) e o canal oficial dele no YouTube — importa tudo de uma vez.
            </p>
          </div>
        </div>
        <div className="grid gap-4 pl-9 lg:grid-cols-2">
          <ConectarDeezer artistaId={artista.id} nomeArtista={artista.nome} deezerArtistId={artista.deezerArtistId} />
          <ConectarCanalYoutube
            artistaId={artista.id}
            youtubeChannelId={artista.youtubeChannelId}
            configurado={configurado}
          />
        </div>
      </section>

      {/* Passo 2: footprint — os sons dele em canais de TERCEIROS (feats). */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">2</span>
          <div>
            <h3 className="text-sm font-semibold">Sons dele em outros canais</h3>
            <p className="text-xs text-muted">
              Feats e parcerias publicados em canais de terceiros (outras gravadoras, outros artistas) — busque, confira pela capa e importe só os certos.
            </p>
          </div>
        </div>
        <div className="pl-9">
          <BuscarFootprintYoutube artistaId={artista.id} nomeArtista={artista.nome} configurado={configurado} />
        </div>
      </section>
    </div>
  );
}
