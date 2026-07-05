import Link from "next/link";
import { Disc3, Music } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cover } from "@/components/ui/Cover";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import type { Faixa, Projeto } from "@/types/domain";

export function ProjetoCard({ projeto, faixas }: { projeto: Projeto; faixas: Faixa[] }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Cover src={projeto.capaUrl} alt={`Capa de ${projeto.nome}`} icon={Disc3} size="sm" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{projeto.nome}</h3>
              <p className="truncate text-xs text-muted">
                {labelTipoProjeto(projeto.tipo)}
                {projeto.artistas.length > 0 ? ` · ${projeto.artistas.join(", ")}` : " · Selo"}
              </p>
            </div>
          </div>
          <Badge tone="accent">{labelEstagio(projeto.statusGeral)}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {faixas.length === 0 && (
            <li className="flex items-center gap-2 py-3 text-sm text-muted">
              <Music className="h-4 w-4 shrink-0" aria-hidden />
              Nenhuma faixa ainda.
            </li>
          )}
          {faixas.map((f) => (
            <li key={f.id}>
              <Link href={`/faixa/${f.id}`}
                className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors duration-200 hover:text-accent">
                <span className="truncate">{f.titulo}</span>
                <span className="shrink-0 text-xs text-muted">{labelEstagio(f.estagio)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {/* "Nova faixa" por card foi removido: a única forma de subir música
            agora é "＋ Subir música" no cabeçalho (nome + áudio + projeto
            opcional em um passo só). Este card só mantém a capa. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <CapaUploader tipo="projeto" id={projeto.id} rotulo="Capa" />
        </div>
      </CardBody>
    </Card>
  );
}
