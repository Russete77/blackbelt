import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NovaFaixaForm } from "@/components/estudio/NovaFaixaForm";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import type { Faixa, Projeto } from "@/types/domain";

export function ProjetoCard({ projeto, faixas }: { projeto: Projeto; faixas: Faixa[] }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{projeto.nome}</h3>
            <p className="text-xs text-muted">
              {labelTipoProjeto(projeto.tipo)}
              {projeto.artistas.length > 0 ? ` · ${projeto.artistas.join(", ")}` : " · Selo"}
            </p>
          </div>
          <Badge tone="accent">{labelEstagio(projeto.statusGeral)}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {faixas.length === 0 && <li className="py-2 text-sm text-muted">Nenhuma faixa ainda.</li>}
          {faixas.map((f) => (
            <li key={f.id}>
              <Link href={`/faixa/${f.id}`}
                className="flex items-center justify-between py-2 text-sm hover:text-accent">
                <span>{f.titulo}</span>
                <span className="text-xs text-muted">{labelEstagio(f.estagio)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <NovaFaixaForm projetoId={projeto.id} />
      </CardBody>
    </Card>
  );
}
