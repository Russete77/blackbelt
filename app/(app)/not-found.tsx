import Link from "next/link";
import { Compass } from "lucide-react";

// notFound() (ex.: artista/faixa/show inexistente) cai aqui em vez do 404
// default do Next — mantém a paleta dark e a casca (AppShell já envolve
// este grupo em app/(app)/layout.tsx).
export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface2 text-muted">
          <Compass className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Página não encontrada</h2>
        <p className="mb-6 max-w-sm text-sm text-muted">
          O que você procurava não existe ou foi removido. Confira o link ou volte para a Home.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.97] active:brightness-95"
        >
          Voltar para a Home
        </Link>
      </div>
    </div>
  );
}
