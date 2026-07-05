import { Disc3 } from "lucide-react";
import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTodosProjetos, getFaixasDosProjetos } from "@/lib/db";

export default async function EstudioPage() {
  const projetos = await getTodosProjetos();
  const faixasPorProjeto = await getFaixasDosProjetos(projetos.map((p) => p.id));
  const projetosComFaixas = projetos.map((projeto) => ({
    projeto,
    faixas: faixasPorProjeto.get(projeto.id) ?? [],
  }));

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Estúdio</h1>
      <p className="mb-6 text-sm text-muted">Todos os projetos e faixas em produção no selo.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosComFaixas.length === 0 && (
          <EmptyState
            className="md:col-span-2 xl:col-span-3"
            icon={Disc3}
            title="Nenhum projeto cadastrado ainda."
            hint="Projetos criados em qualquer artista aparecem aqui, reunidos por estágio de produção."
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
