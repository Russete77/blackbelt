"use client";
import { usePlayer } from "@/components/player/PlayerContext";
import type { Comentario } from "@/types/domain";

export function CommentPin({ comentario, duracao }: { comentario: Comentario; duracao: number }) {
  const { seek } = usePlayer();
  if (duracao <= 0) return null;
  const pct = (comentario.timestampSegundos / duracao) * 100;
  return (
    <button
      onClick={() => seek(comentario.timestampSegundos)}
      title={comentario.texto}
      aria-label={`Comentário aos ${comentario.timestampSegundos}s`}
      className="absolute -top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-accent border border-bg hover:scale-125 transition"
      style={{ left: `${pct}%` }}
    />
  );
}
