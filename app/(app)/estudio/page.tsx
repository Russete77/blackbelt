import { ProjetoCard } from "@/components/estudio/ProjetoCard";
import { projetos } from "@/mock/data";

export default function EstudioPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1">Estúdio</h1>
      <p className="text-muted mb-6 text-sm">Projetos e faixas em produção.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projetos.map((p) => <ProjetoCard key={p.id} projeto={p} />)}
      </div>
    </div>
  );
}
