import Link from "next/link";
import { Users, Disc3 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import type { Artista, Faixa, Projeto } from "@/types/domain";

interface HomeViewProps {
  artistas: Artista[];
  projetosSelo: { projeto: Projeto; faixas: Faixa[] }[];
}

export function HomeView({ artistas, projetosSelo }: HomeViewProps) {
  return (
    <div className="relative p-4 md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-4 top-0 h-48 w-72 rounded-full bg-accent/10 blur-3xl md:left-6"
      />
      <div className="relative animate-fade-in-up">
        <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">
          BLACK <span className="text-accent">BELT</span> 360
        </h1>
        <p className="mb-8 text-muted">Organização 360 do selo. Escolha um artista.</p>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Artistas</h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {artistas.length === 0 && (
          <EmptyState
            className="sm:col-span-2 xl:col-span-3"
            icon={Users}
            title="Nenhum artista cadastrado ainda."
            hint="Cadastre o primeiro artista do selo para começar a organizar projetos e faixas."
          />
        )}
        {artistas.map((a, i) => (
          <Link key={a.id} href={`/artista/${a.slug}`} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <Card interactive>
              <CardBody className="flex items-center gap-3">
                <Avatar nome={a.nome} src={a.fotoUrl} size="md" />
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{a.nome}</h3>
                  {a.bio && <p className="truncate text-xs text-muted">{a.bio}</p>}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold">Selo</h2>
        <Badge tone="neutral">projetos do selo</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {projetosSelo.length === 0 && (
          <EmptyState
            className="sm:col-span-2 xl:col-span-3"
            icon={Disc3}
            title="Nenhum projeto do selo no momento."
            hint="Projetos sem artista específico (coletâneas, compilações) aparecem aqui."
          />
        )}
        {projetosSelo.map(({ projeto, faixas }, i) => (
          <div key={projeto.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <ProjetoCard projeto={projeto} faixas={faixas} />
          </div>
        ))}
      </div>
    </div>
  );
}
