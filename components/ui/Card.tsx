import { cn } from "@/lib/cn";

// `interactive` centraliza o hover de cards clicáveis (grids de artistas,
// projetos) — antes cada página repetia "hover:border-accent transition".
export function Card({
  className, children, interactive = false,
}: { className?: string; children: React.ReactNode; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface transition-all duration-200",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface2/60 hover:shadow-lg hover:shadow-black/30",
        className,
      )}
    >
      {children}
    </div>
  );
}
export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4 md:p-5", className)}>{children}</div>;
}
