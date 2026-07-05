import { cn } from "@/lib/cn";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

export function Avatar({
  nome, src, size = "sm", className,
}: { nome: string; src?: string; size?: keyof typeof SIZES; className?: string }) {
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} className={cn(SIZES[size], "shrink-0 rounded-full object-cover", className)} />
  ) : (
    <div className={cn(
      SIZES[size],
      "shrink-0 grid place-items-center rounded-full bg-surface2 font-semibold text-fg",
      className,
    )}>
      {iniciais}
    </div>
  );
}
