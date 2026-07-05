import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, CalendarClock, MapPin, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ExcluirShowButton } from "@/components/shows/ExcluirShowButton";
import { RiderCamarimView, RiderTecnicoView } from "@/components/shows/RiderViews";
import { getShow } from "@/lib/db";
import { formatarCache, formatarDataShow, labelStatusShow, toneStatusShow } from "@/lib/shows";
import { createClient } from "@/lib/supabase/server";

// Detalhe do show: dados principais + riders completos, com editar e
// apagar (apagar é admin-only — RLS + checagem de papel no JWT).
export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = await getShow(id);
  if (!show) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <Link
        href="/shows"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para a agenda
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl uppercase tracking-tight md:text-3xl">
              {show.artistaNome ?? "Show"}
            </h1>
            <Badge tone={toneStatusShow(show.status)}>{labelStatusShow(show.status)}</Badge>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted">
            <p className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
              {show.data ? formatarDataShow(show.data) : "Data a definir"}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {show.local ?? "Local a definir"}
            </p>
            {show.cache != null && (
              <p className="flex items-center gap-1.5">
                <Banknote className="h-4 w-4 shrink-0" aria-hidden />
                <span className="font-mono text-fg">{formatarCache(show.cache)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/shows/${show.id}/editar`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent/40 hover:bg-surface2"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar
          </Link>
          {isAdmin && <ExcluirShowButton showId={show.id} />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RiderTecnicoView rider={show.riderTecnico} />
        <RiderCamarimView rider={show.riderCamarim} />
      </div>
    </div>
  );
}
