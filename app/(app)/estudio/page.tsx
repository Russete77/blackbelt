import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { getTodosProjetos, getFaixasDoProjeto } from "@/lib/db";

export default async function EstudioPage() {
  const projetos = await getTodosProjetos();
  const projetosComFaixas = await Promise.all(
    projetos.map(async (projeto) => ({ projeto, faixas: await getFaixasDoProjeto(projeto.id) })),
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Estúdio</h1>
      <p className="text-muted mb-6 text-sm">Todos os projetos e faixas em produção no selo.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetosComFaixas.length === 0 && (
          <p className="text-sm text-muted">Nenhum projeto cadastrado ainda.</p>
        )}
        {projetosComFaixas.map(({ projeto, faixas }) => (
          <ProjetoCard key={projeto.id} projeto={projeto} faixas={faixas} />
        ))}
      </div>
    </div>
  );
}
