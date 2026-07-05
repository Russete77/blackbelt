import Link from "next/link";
import { Disc3, Music, Eye } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cover } from "@/components/ui/Cover";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import { capaPublicaOuThumbnail } from "@/lib/faixa";
import { formatarStreams } from "@/lib/metricas";
import type { Faixa, Projeto } from "@/types/domain";

export function ProjetoCard({
  projeto, faixas, viewsPorFaixa = {},
}: {
  projeto: Projeto;
  faixas: Faixa[];
  // Views (streams somados de todas as plataformas) por faixa — só usado nos
  // cards de faixa footprint abaixo; faixa sem entrada mostra "—".
  viewsPorFaixa?: Record<string, number>;
}) {
  const faixasEstudio = faixas.filter((f) => f.origem !== "footprint");
  const faixasFootprint = faixas.filter((f) => f.origem === "footprint");

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

        {faixas.length === 0 && (
          <p className="mt-4 flex items-center gap-2 py-3 text-sm text-muted">
            <Music className="h-4 w-4 shrink-0" aria-hidden />
            Nenhuma faixa ainda.
          </p>
        )}

        {faixasEstudio.length > 0 && (
          <ul className="mt-4 divide-y divide-line">
            {faixasEstudio.map((f) => (
              <li key={f.id}>
                <Link href={`/faixa/${f.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors duration-200 hover:text-accent">
                  <span className="truncate">{f.titulo}</span>
                  <span className="shrink-0 text-xs text-muted">{labelEstagio(f.estagio)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Faixas footprint (feat/lançamento em canal de terceiro) viram
            cards com cover + views, não uma linha de texto com estágio
            "Ideia" — essa música já está lançada, não em produção aqui. */}
        {faixasFootprint.length > 0 && (
          <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${faixasEstudio.length > 0 ? "mt-3" : "mt-4"}`}>
            {faixasFootprint.map((f) => (
              <Link
                key={f.id}
                href={`/faixa/${f.id}`}
                className="group flex items-center gap-2 rounded-md border border-line p-2 transition-colors duration-200 hover:border-accent/50"
              >
                <Cover
                  src={capaPublicaOuThumbnail(f)}
                  alt={`Capa de ${f.titulo}`}
                  icon={Music}
                  size="sm"
                  className="h-10 w-10"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium transition-colors duration-200 group-hover:text-accent">
                    {f.titulo}
                  </p>
                  <p className="flex items-center gap-1 font-mono text-[11px] text-muted">
                    <Eye className="h-3 w-3 shrink-0" aria-hidden />
                    {viewsPorFaixa[f.id] != null ? formatarStreams(viewsPorFaixa[f.id]) : "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

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
