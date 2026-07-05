import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NovaFaixaForm } from "@/components/estudio/NovaFaixaForm";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { Disc3 } from "lucide-react";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import type { Faixa, Projeto } from "@/types/domain";

export function ProjetoCard({ projeto, faixas }: { projeto: Projeto; faixas: Faixa[] }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {projeto.capaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={projeto.capaUrl}
                alt={`Capa de ${projeto.nome}`}
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-surface2">
                <Disc3 className="h-5 w-5 text-muted" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{projeto.nome}</h3>
              <p className="text-xs text-muted truncate">
                {labelTipoProjeto(projeto.tipo)}
                {projeto.artistas.length > 0 ? ` · ${projeto.artistas.join(", ")}` : " · Selo"}
              </p>
            </div>
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <NovaFaixaForm projetoId={projeto.id} />
          <CapaUploader tipo="projeto" id={projeto.id} rotulo="Capa" />
        </div>
      </CardBody>
    </Card>
  );
}
