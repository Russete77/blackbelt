import { notFound } from "next/navigation";
import { Mic2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FootprintFaixaCard } from "@/components/estudio/FootprintFaixaCard";
import { getArtista, getFaixasFootprintDoArtista, getViewsPorFaixa } from "@/lib/db";

// Aba "Feats" — footprint/aparições do artista (faixas origem='footprint':
// Catálogo, Aparições/Footprint, Canal YouTube importados), separada da aba
// "Projetos/Faixas" (produção de estúdio). Agrupa por projeto guarda-chuva
// de origem, com o mesmo card de release (capa + título + views) usado
// dentro de ProjetoCard para faixas footprint mescladas num projeto misto.
export default async function ArtistaFeatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const grupos = await getFaixasFootprintDoArtista(artista.id);
  const todasFaixaIds = grupos.flatMap((g) => g.faixas.map((f) => f.id));
  const viewsPorFaixa = await getViewsPorFaixa(todasFaixaIds);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Feats</h2>
        <p className="text-sm text-muted">
          Aparições e faixas lançadas fora do estúdio — footprint em catálogos e canais de terceiros.
        </p>
      </div>

      {grupos.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title={`Nenhum feat registrado ainda para ${artista.nome}.`}
          hint='Faixas footprint chegam pela aba "Importar" (Catálogo, Aparições/Footprint, Canal YouTube).'
        />
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo, i) => (
            <div key={grupo.projeto.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <h3 className="mb-3 text-sm font-semibold text-muted">{grupo.projeto.nome}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {grupo.faixas.map((f) => (
                  <FootprintFaixaCard key={f.id} faixa={f} views={viewsPorFaixa[f.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
