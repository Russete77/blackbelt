import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ShowForm } from "@/components/shows/ShowForm";
import { getArtistas, getShow } from "@/lib/db";

export default async function EditarShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [show, artistas] = await Promise.all([getShow(id), getArtistas()]);
  if (!show) return notFound();

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <Link
        href={`/shows/${show.id}`}
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para o show
      </Link>

      <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Editar show</h1>
      <p className="mb-6 text-sm text-muted">
        {show.artistaNome ? `${show.artistaNome} — ` : ""}atualize dados e riders; tudo é salvo junto.
      </p>

      <ShowForm artistas={artistas} show={show} />
    </div>
  );
}
