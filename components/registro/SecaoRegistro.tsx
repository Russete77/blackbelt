import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

// Seção colapsável de um dos 3 registros (obra/fonograma/videograma) — usa
// <details>/<summary> nativos (sem JS/estado próprio): acessível, funciona
// sem hidratação e não precisa de "use client" nesta camada. O formulário de
// cada seção (client) mostra seu próprio indicador "completo/incompleto".
export function SecaoRegistro({
  icon: Icon, titulo, children,
}: { icon: LucideIcon; titulo: string; children: React.ReactNode }) {
  return (
    <details open className="group rounded-lg border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-display text-lg uppercase tracking-tight">
          <Icon className="h-5 w-5 text-accent" aria-hidden />
          {titulo}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-line p-4 md:p-5">{children}</div>
    </details>
  );
}
