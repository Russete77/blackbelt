import { cn } from "@/lib/cn";

export function Avatar({ nome, src, className }: { nome: string; src?: string; className?: string }) {
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} className={cn("h-8 w-8 rounded-full object-cover", className)} />
  ) : (
    <div className={cn(
      "h-8 w-8 rounded-full bg-surface2 text-fg grid place-items-center text-xs font-semibold",
      className,
    )}>
      {iniciais}
    </div>
  );
}
