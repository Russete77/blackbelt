import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

// Link "Novo show" com cara de botão primário (não dá para aninhar <button>
// em <Link>). `artistaId` pré-seleciona o artista no formulário.
export function NovoShowLink({
  artistaId, size = "md", className,
}: { artistaId?: string; size?: "sm" | "md"; className?: string }) {
  return (
    <Link
      href={artistaId ? `/shows/novo?artista=${artistaId}` : "/shows/novo"}
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-accent font-medium text-accent-fg",
        "shadow-sm shadow-black/20 transition-all duration-200 ease-out",
        "hover:brightness-110 active:scale-[0.97] active:brightness-95",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm",
        className,
      )}
    >
      <Plus className="h-4 w-4" aria-hidden />
      Novo show
    </Link>
  );
}
