import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import type { Artista, Faixa, Projeto } from "@/types/domain";

interface HomeViewProps {
  artistas: Artista[];
  projetosSelo: { projeto: Projeto; faixas: Faixa[] }[];
}

export function HomeView({ artistas, projetosSelo }: HomeViewProps) {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-1">
        BLACK <span className="text-accent">BELT</span> 360
      </h1>
      <p className="text-muted mb-6">Organização 360 do selo. Escolha um artista.</p>

      <h2 className="text-lg font-semibold mb-3">Artistas</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-10">
        {artistas.length === 0 && (
          <p className="text-sm text-muted">Nenhum artista cadastrado ainda.</p>
        )}
        {artistas.map((a) => (
          <Link key={a.id} href={`/artista/${a.slug}`}>
            <Card className="hover:border-accent transition">
              <CardBody className="flex items-center gap-3">
                {a.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.fotoUrl} alt={a.nome} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-surface2 grid place-items-center font-semibold">
                    {a.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{a.nome}</h3>
                  {a.bio && <p className="text-xs text-muted truncate">{a.bio}</p>}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold">Selo</h2>
        <Badge tone="neutral">projetos do selo</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosSelo.length === 0 && (
          <p className="text-sm text-muted">Nenhum projeto do selo no momento.</p>
        )}
        {projetosSelo.map(({ projeto, faixas }) => (
          <ProjetoCard key={projeto.id} projeto={projeto} faixas={faixas} />
        ))}
      </div>
    </div>
  );
}
