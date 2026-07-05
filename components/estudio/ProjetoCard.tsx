import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import { getFaixasDoProjeto } from "@/mock/data";
import type { Projeto } from "@/types/domain";

export function ProjetoCard({ projeto }: { projeto: Projeto }) {
  const faixas = getFaixasDoProjeto(projeto.id);
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{projeto.nome}</h3>
            <p className="text-xs text-muted">
              {labelTipoProjeto(projeto.tipo)} · {projeto.artistas.join(", ")}
            </p>
          </div>
          <Badge tone="accent">{labelEstagio(projeto.statusGeral)}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-line">
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
      </CardBody>
    </Card>
  );
}
