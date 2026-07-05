import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// Estado vazio padrão do produto — ícone + título + dica, em vez de texto
// solto. Usado em toda lista que pode não ter dados ainda (artistas,
// projetos, faixas, lançamentos, shows, números, clipes, documentos,
// comentários...). `title` mantém o texto exato exigido pelos testes.
export function EmptyState({
  icon: Icon, title, hint, className,
}: { icon: LucideIcon; title: string; hint?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line",
        "bg-surface/40 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface2 text-muted">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted">{hint}</p>}
    </div>
  );
}
