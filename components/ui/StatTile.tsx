import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// Bloco de número grande (streams, receita, contagens...) — usado no painel
// de Analytics e em qualquer tela futura que precise de "cards de totais".
// Valor sempre em font-mono (alinhamento tabular de dígitos).
export function StatTile({
  icon: Icon, label, value, hint, className,
}: { icon: LucideIcon; label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4", className)}>
      <div className="mb-2 flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="truncate font-mono text-2xl font-semibold text-fg md:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
