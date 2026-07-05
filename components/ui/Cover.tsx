import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
  // Ocupa toda a largura do container mantendo proporção quadrada — usado em
  // grades estilo "release" (ver faixas footprint em ProjetoCard) onde a capa
  // precisa ser proeminente em vez de um ícone pequeno ao lado do texto.
  fill: "aspect-square w-full",
} as const;

// Arte quadrada (capa de faixa/projeto) com fallback em ícone — irmã do
// Avatar (circular, pessoas). Mesma superfície/token em toda a UI.
export function Cover({
  src, alt, icon: Icon, size = "md", className,
}: {
  src?: string;
  alt: string;
  icon: LucideIcon;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(SIZES[size], "shrink-0 rounded-md object-cover", className)}
    />
  ) : (
    <div className={cn(SIZES[size], "grid shrink-0 place-items-center rounded-md bg-surface2", className)}>
      <Icon className="h-1/3 w-1/3 text-muted" aria-hidden />
    </div>
  );
}
