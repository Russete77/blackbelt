import Link from "next/link";
import { Disc3, Music } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Cover } from "@/components/ui/Cover";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { ExcluirProjetoButton } from "@/components/estudio/ExcluirProjetoButton";
import { FootprintFaixaCard } from "@/components/estudio/FootprintFaixaCard";
import { labelEstagio, labelTipoProjeto } from "@/lib/labels";
import { isProjetoFootprint } from "@/lib/faixa";
import type { Faixa, Projeto } from "@/types/domain";

export function ProjetoCard({
  projeto, faixas, viewsPorFaixa = {}, podeExcluir = false,
}: {
  projeto: Projeto;
  faixas: Faixa[];
  // Views (streams somados de todas as plataformas) por faixa — só usado nos
  // cards de faixa footprint abaixo; faixa sem entrada mostra "—".
  viewsPorFaixa?: Record<string, number>;
  // Mostra o botão "Apagar" (só admin — a RLS/ação confirmam de novo no servidor).
  podeExcluir?: boolean;
}) {
  const faixasEstudio = faixas.filter((f) => f.origem !== "footprint");
  const faixasFootprint = faixas.filter((f) => f.origem === "footprint");

  // Projeto "guarda-chuva" de importação (Catálogo, Canal YouTube,
  // Aparições/Footprint) ou projeto cujas faixas são todas footprint: nada
  // aqui é produzido pelo selo, então o badge de estágio de pipeline
  // (Ideia/Mixagem/...) não tem significado nenhum — mostraria sempre
  // "Ideia" (valor padrão da coluna) sem qualquer relação com a realidade.
  const projetoEhFootprint =
    isProjetoFootprint(projeto.nome) || (faixasEstudio.length === 0 && faixasFootprint.length > 0);

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Cover src={projeto.capaUrl} alt={`Capa de ${projeto.nome}`} icon={Disc3} size="sm" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-fg">{projeto.nome}</h3>
              <p className="truncate text-xs text-muted">
                {labelTipoProjeto(projeto.tipo)}
                {projeto.artistas.length > 0 ? ` · ${projeto.artistas.join(", ")}` : " · Selo"}
              </p>
            </div>
          </div>
          {projetoEhFootprint
            ? <Badge tone="neutral">Footprint</Badge>
            : <Badge tone="accent">{labelEstagio(projeto.statusGeral)}</Badge>}
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

        {/* Faixas footprint (feat/lançamento em canal de terceiro) viram um
            grid estilo "release" — cover proeminente + título + views, não
            uma linha de texto com estágio "Ideia": essa música já está
            lançada, não em produção aqui. */}
        {faixasFootprint.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {faixasFootprint.map((f) => (
              <FootprintFaixaCard key={f.id} faixa={f} views={viewsPorFaixa[f.id]} />
            ))}
          </div>
        )}

        {/* "Nova faixa" por card foi removido: a única forma de subir música
            agora é "＋ Subir música" no cabeçalho (nome + áudio + projeto
            opcional em um passo só). Este card só mantém a capa. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <CapaUploader tipo="projeto" id={projeto.id} rotulo="Capa" />
          {podeExcluir && <ExcluirProjetoButton projetoId={projeto.id} projetoNome={projeto.nome} />}
        </div>
      </CardBody>
    </Card>
  );
}
