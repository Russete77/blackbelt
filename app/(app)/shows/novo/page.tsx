import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShowForm } from "@/components/shows/ShowForm";
import { getArtistas } from "@/lib/db";

// Cadastro de show — aceita ?artista=<id> para chegar com o artista
// pré-selecionado (link "Novo show" da aba do artista).
export default async function NovoShowPage({
  searchParams,
}: {
  searchParams: Promise<{ artista?: string }>;
}) {
  const { artista } = await searchParams;
  const artistas = await getArtistas();

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <Link
        href="/shows"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para a agenda
      </Link>

      <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Novo show</h1>
      <p className="mb-6 text-sm text-muted">
        Cadastre a data e, se já tiver, os riders técnico e de camarim.
      </p>

      <ShowForm artistas={artistas} artistaIdInicial={artista} />
    </div>
  );
}
