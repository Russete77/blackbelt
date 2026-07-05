import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

// Chip "preenchido/pendente" de um dos 3 registros — usado na lista
// /registro (um por faixa, um por tipo) e no cabeçalho de cada seção.
export function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Badge tone={ok ? "aprovado" : "neutral"} className="gap-1">
      {ok ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
      {label}
    </Badge>
  );
}
