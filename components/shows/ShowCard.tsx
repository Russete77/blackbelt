import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarCache, labelStatusShow, partesDataShow, toneStatusShow } from "@/lib/shows";
import type { ShowDetalhado } from "@/types/shows";

// Card de show da agenda (selo e artista). Bloco de data à esquerda,
// artista/local no meio, cachê + status à direita. Server-safe (sem estado).
export function ShowCard({
  show, mostrarArtista = true,
}: { show: ShowDetalhado; mostrarArtista?: boolean }) {
  const partes = show.data ? partesDataShow(show.data) : null;
  const titulo = mostrarArtista ? (show.artistaNome ?? "Artista") : (show.local ?? "Local a definir");

  return (
    <Link href={`/shows/${show.id}`} className="block">
      <Card interactive>
        <CardBody className="flex items-center gap-4">
          {/* Bloco de data — dia grande estilo folhinha de agenda */}
          <div className="grid w-14 shrink-0 place-items-center rounded-md bg-surface2 px-1 py-2 text-center">
            {partes ? (
              <>
                <span className="font-display text-2xl leading-none text-fg">{partes.dia}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{partes.mes}</span>
              </>
            ) : (
              <CalendarClock className="h-5 w-5 text-muted" aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{titulo}</p>
            {mostrarArtista && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{show.local ?? "Local a definir"}</span>
              </p>
            )}
            <p className="mt-0.5 font-mono text-xs text-muted">
              {partes ? `${partes.diaSemana} · ${partes.hora}` : "Data a definir"}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge tone={toneStatusShow(show.status)}>{labelStatusShow(show.status)}</Badge>
            {show.cache != null && (
              <span className="font-mono text-xs text-fg">{formatarCache(show.cache)}</span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
