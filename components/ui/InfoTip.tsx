"use client";
// Ícone de "?" com explicação curta em linguagem simples, pro artista (não
// técnico) entender um termo do produto (ex.: "estimativa", "split") sem
// sair da tela. Acessível: foco por teclado mostra a dica (aria-describedby
// aponta pro próprio balão) e funciona no toque no celular (onClick alterna
// aberto/fechado, já que touch não dispara hover).
import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function InfoTip({ texto, className }: { texto: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-describedby={id}
        aria-label="O que significa isso"
        onMouseEnter={() => setAberto(true)}
        onMouseLeave={() => setAberto(false)}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onClick={() => setAberto((v) => !v)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-52 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-line",
          "bg-surface2 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug text-fg shadow-lg shadow-black/30",
          "transition-opacity duration-150",
          aberto ? "opacity-100" : "invisible opacity-0",
        )}
      >
        {texto}
      </span>
    </span>
  );
}
