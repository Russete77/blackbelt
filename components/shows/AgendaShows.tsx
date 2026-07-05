// Agenda de shows (usada no selo e na aba do artista): próximos shows
// agrupados por mês, depois os sem data definida e por fim o histórico
// (mais recente primeiro). Server-safe.
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShowCard } from "@/components/shows/ShowCard";
import { agruparPorMes, labelMesShow, particionarAgenda } from "@/lib/shows";
import type { ShowDetalhado } from "@/types/shows";

function GrupoDeCards({
  titulo, shows, mostrarArtista, esmaecido = false,
}: { titulo: string; shows: ShowDetalhado[]; mostrarArtista: boolean; esmaecido?: boolean }) {
  return (
    <section className={esmaecido ? "opacity-75" : undefined}>
      <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-muted">{titulo}</h2>
      <div className="flex flex-col gap-2.5">
        {shows.map((show, i) => (
          <div key={show.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <ShowCard show={show} mostrarArtista={mostrarArtista} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AgendaShows({
  shows,
  mostrarArtista = true,
  tituloVazio = "Nenhum show na agenda ainda.",
  hintVazio = "Clique em “Novo show” para cadastrar a primeira data — com rider técnico e de camarim.",
}: {
  shows: ShowDetalhado[];
  mostrarArtista?: boolean;
  tituloVazio?: string;
  hintVazio?: string;
}) {
  if (shows.length === 0) {
    return <EmptyState icon={CalendarDays} title={tituloVazio} hint={hintVazio} />;
  }

  // `shows` chega ordenado por data ascendente (lib/db.ts).
  const { proximos, semData, anteriores } = particionarAgenda(shows);
  const meses = agruparPorMes(proximos);

  return (
    <div className="flex flex-col gap-6">
      {proximos.length === 0 && (
        <p className="rounded-md border border-dashed border-line px-3 py-3 text-xs text-muted">
          Nenhum show futuro na agenda.
        </p>
      )}
      {meses.map((mes) => (
        <GrupoDeCards key={mes.chave} titulo={labelMesShow(mes.chave)} shows={mes.shows} mostrarArtista={mostrarArtista} />
      ))}
      {semData.length > 0 && (
        <GrupoDeCards titulo="Data a definir" shows={semData} mostrarArtista={mostrarArtista} />
      )}
      {anteriores.length > 0 && (
        <GrupoDeCards titulo="Anteriores" shows={anteriores} mostrarArtista={mostrarArtista} esmaecido />
      )}
    </div>
  );
}
