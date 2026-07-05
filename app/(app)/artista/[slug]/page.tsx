import { notFound } from "next/navigation";
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { NovoProjetoForm } from "@/components/artista/NovoProjetoForm";
import { getArtista, getProjetosDoArtista, getFaixasDoProjeto } from "@/lib/db";

export default async function ArtistaProjetosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const projetos = await getProjetosDoArtista(artista.id);
  const projetosComFaixas = await Promise.all(
    projetos.map(async (projeto) => ({ projeto, faixas: await getFaixasDoProjeto(projeto.id) })),
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">Projetos e faixas</h2>
        <NovoProjetoForm artistaId={artista.id} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosComFaixas.length === 0 && (
          <p className="text-sm text-muted">Nenhum projeto cadastrado ainda para {artista.nome}.</p>
        )}
        {projetosComFaixas.map(({ projeto, faixas }) => (
          <ProjetoCard key={projeto.id} projeto={projeto} faixas={faixas} />
        ))}
      </div>
    </div>
  );
}
