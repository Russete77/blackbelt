"use client";
import { usePlayer } from "@/components/player/PlayerContext";
import type { Comentario } from "@/types/domain";

export function CommentPin({ comentario, duracao }: { comentario: Comentario; duracao: number }) {
  const { seek } = usePlayer();
  if (duracao <= 0) return null;
  // Clamp: comentário além da duração (versão mais curta) não vaza do container.
  const pct = Math.min((comentario.timestampSegundos / duracao) * 100, 100);
  return (
    // Área de toque 24px (WCAG 2.5.8); o ponto visível continua 12px.
    <button
      onClick={() => seek(comentario.timestampSegundos)}
      title={comentario.texto}
      aria-label={`Comentário aos ${comentario.timestampSegundos}s`}
      className="group absolute -top-2.5 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full focus-visible:outline-none"
      style={{ left: `${pct}%` }}
    >
      <span className="h-3 w-3 rounded-full border border-bg bg-accent shadow-sm shadow-black/40 transition-transform duration-150 group-hover:scale-125 group-focus-visible:scale-125" />
    </button>
  );
}
