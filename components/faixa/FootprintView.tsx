// View de faixa FOOTPRINT (lançamento externo monitorado — feat em canal ou
// selo de terceiro): cover + players embutidos ("só escolher e ouvir") +
// números por plataforma + Participantes & Split. Sem UI de produção nenhuma
// (sem versões/beat/mix/comentário) — essa música não é produzida por nós.
import { Music, Eye } from "lucide-react";
import { Cover } from "@/components/ui/Cover";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { VincularYoutube } from "@/components/faixa/VincularYoutube";
import { PlayersTabs } from "@/components/faixa/PlayersTabs";
import { SplitsFaixa } from "@/components/faixa/SplitsFaixa";
import { youtubeThumbnailUrl } from "@/lib/faixa";
import { formatarStreams } from "@/lib/metricas";
import { labelPlataforma } from "@/lib/labels";
import type { Faixa } from "@/types/domain";
import type { SplitFaixa } from "@/lib/db";

export function FootprintView({
  faixa, splits, artistas, metricasPorPlataforma,
}: {
  faixa: Faixa;
  splits: SplitFaixa[];
  artistas: { id: string; nome: string }[];
  metricasPorPlataforma: { plataforma: string; streams: number }[];
}) {
  // faixa.capaUrl já chega assinada pelo servidor (getSignedCoverUrl), então
  // qualquer valor aqui é uma URL exibível de verdade — sem capa manual, cai
  // no thumbnail determinístico do YouTube (sem chamada de API).
  const capa = faixa.capaUrl ?? (faixa.youtubeVideoId ? youtubeThumbnailUrl(faixa.youtubeVideoId) : undefined);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-start gap-4 animate-fade-in-up">
        <Cover src={capa} alt={`Capa de ${faixa.titulo}`} icon={Music} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-2xl uppercase tracking-tight md:text-3xl">
              {faixa.titulo}
            </h1>
            <Badge tone="accent">Footprint</Badge>
          </div>
          <p className="truncate text-sm text-muted">
            {faixa.genero ?? "Lançamento externo (feat)"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <CapaUploader tipo="faixa" id={faixa.id} rotulo="Capa" />
            <VincularYoutube faixaId={faixa.id} youtubeVideoId={faixa.youtubeVideoId} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Ouvir</h2>
        <PlayersTabs
          faixaId={faixa.id}
          youtubeVideoId={faixa.youtubeVideoId}
          spotifyTrackId={faixa.spotifyTrackId}
          deezerTrackId={faixa.deezerTrackId}
        />
      </div>

      {metricasPorPlataforma.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Números</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {metricasPorPlataforma.map((m) => (
              <StatTile
                key={m.plataforma}
                icon={Eye}
                label={labelPlataforma(m.plataforma)}
                value={formatarStreams(m.streams)}
              />
            ))}
          </div>
        </div>
      )}

      <SplitsFaixa faixaId={faixa.id} artistas={artistas} participantesIniciais={splits} />
    </div>
  );
}
