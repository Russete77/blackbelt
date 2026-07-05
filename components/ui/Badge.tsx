import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "alta" | "media" | "baixa" | "aprovado";

const tones: Record<Tone, string> = {
  neutral: "bg-surface2 text-muted",
  accent: "bg-accent/15 text-accent",
  alta: "bg-danger/15 text-danger",
  media: "bg-warning/15 text-warning",
  baixa: "bg-success/15 text-success",
  aprovado: "bg-success/15 text-success",
};

export function Badge({
  tone = "neutral", children, className,
}: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      tones[tone], className,
    )}>
      {children}
    </span>
  );
}
