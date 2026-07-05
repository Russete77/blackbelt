import { notFound } from "next/navigation";
import { Disc3 } from "lucide-react";
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { SubirMusica } from "@/components/estudio/SubirMusica";
import { NovoProjetoForm } from "@/components/artista/NovoProjetoForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { getArtista, getProjetosDoArtista, getFaixasDosProjetos, getSignedCoverUrl } from "@/lib/db";

export default async function ArtistaProjetosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const projetos = await getProjetosDoArtista(artista.id);
  const faixasPorProjeto = await getFaixasDosProjetos(projetos.map((p) => p.id));
  const projetosComFaixas = await Promise.all(
    projetos.map(async (projeto) => ({
      projeto: projeto.capaUrl
        ? { ...projeto, capaUrl: (await getSignedCoverUrl(projeto.capaUrl)) ?? undefined }
        : projeto,
      faixas: faixasPorProjeto.get(projeto.id) ?? [],
    })),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">Projetos e faixas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SubirMusica artistaId={artista.id} artistaNome={artista.nome} projetos={projetos} />
          <NovoProjetoForm artistaId={artista.id} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosComFaixas.length === 0 && (
          <EmptyState
            className="md:col-span-2 xl:col-span-3"
            icon={Disc3}
            title={`Nenhuma música cadastrada ainda para ${artista.nome}.`}
            hint="Clique em ＋ Subir música para enviar sua primeira faixa — o projeto é opcional."
          />
        )}
        {projetosComFaixas.map(({ projeto, faixas }, i) => (
          <div key={projeto.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <ProjetoCard projeto={projeto} faixas={faixas} />
          </div>
        ))}
      </div>
    </div>
  );
}
