"use client";
// Card de um clipe: título/faixa vinculada/diretor, chip de status, datas,
// embed do YouTube (quando video_url já foi normalizado para um id válido —
// ver normalizarVideoUrl em actions.ts) e ações (editar em modal, apagar
// para admin).
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarDataPura } from "@/lib/datas";
import { labelStatusClipe, toneStatusClipe } from "@/lib/labels";
import { ClipeFormModal } from "./ClipeFormModal";
import { ExcluirClipeButton } from "./ExcluirClipeButton";
import type { Faixa } from "@/types/domain";
import type { Clipe } from "@/types/clipes";

// Um video id do YouTube tem sempre 11 caracteres alfanuméricos (+ - e _) —
// mesmo padrão de lib/youtube.ts, duplicado aqui (regex trivial) para não
// puxar o módulo inteiro (com chamadas de API) pro bundle do cliente.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function ClipeCard({
  clipe, artistaId, faixas, podeExcluir, caminho,
}: {
  clipe: Clipe;
  artistaId: string;
  faixas: Faixa[];
  podeExcluir: boolean;
  caminho: string;
}) {
  const faixaVinculada = faixas.find((f) => f.id === clipe.faixaId);
  const videoId = clipe.videoUrl && YOUTUBE_ID_RE.test(clipe.videoUrl) ? clipe.videoUrl : null;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base uppercase tracking-tight">{clipe.titulo}</h3>
            <p className="text-xs text-muted">
              {faixaVinculada && (
                <>
                  Faixa:{" "}
                  <Link href={`/faixa/${faixaVinculada.id}`} className="text-accent hover:underline">
                    {faixaVinculada.titulo}
                  </Link>
                </>
              )}
              {clipe.diretor && `${faixaVinculada ? " · " : ""}Dir.: ${clipe.diretor}`}
            </p>
          </div>
          <Badge tone={toneStatusClipe(clipe.status)} className="shrink-0">
            {labelStatusClipe(clipe.status)}
          </Badge>
        </div>

        {(clipe.dataGravacao || clipe.dataEstreia) && (
          <p className="text-xs text-muted">
            {clipe.dataGravacao && `Gravação: ${formatarDataPura(clipe.dataGravacao)}`}
            {clipe.dataGravacao && clipe.dataEstreia && " · "}
            {clipe.dataEstreia && `Estreia: ${formatarDataPura(clipe.dataEstreia)}`}
          </p>
        )}

        {videoId && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`Player do clipe — ${clipe.titulo}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-muted">
          <span className="flex flex-wrap items-center gap-3">
            {clipe.demandas.length > 0 && <span>{clipe.demandas.length} demanda(s)</span>}
            {clipe.cueSheet.length > 0 && <span>Cue sheet: {clipe.cueSheet.length} trecho(s)</span>}
          </span>
          <div className="flex items-center gap-3">
            <ClipeFormModal
              artistaId={artistaId}
              faixas={faixas}
              clipe={clipe}
              trigger={(abrir) => (
                <button
                  type="button"
                  onClick={abrir}
                  className="text-xs font-medium text-accent transition-colors duration-200 hover:brightness-110"
                >
                  Editar
                </button>
              )}
            />
            {podeExcluir && <ExcluirClipeButton id={clipe.id} caminho={caminho} />}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
