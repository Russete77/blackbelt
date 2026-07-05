"use client";
import { usePlayer } from "@/components/player/PlayerContext";
import { formatTempo } from "@/components/player/format";
import { Badge } from "@/components/ui/Badge";
import type { Comentario } from "@/types/domain";

export function ListaComentarios({ comentarios }: { comentarios: Comentario[] }) {
  const { seek } = usePlayer();
  if (comentarios.length === 0) {
    return <p className="text-sm text-muted">Nenhum comentário nesta versão ainda.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {comentarios.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => seek(c.timestampSegundos)}
            className="w-full text-left rounded-md bg-surface border border-line p-3 hover:border-accent transition"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-accent">{formatTempo(c.timestampSegundos)}</span>
              <Badge tone={c.prioridade}>{c.prioridade}</Badge>
              <Badge tone="neutral">{c.categoria}</Badge>
              {c.resolvido && <Badge tone="aprovado">resolvido</Badge>}
            </div>
            <p className="text-sm">{c.texto}</p>
            <p className="text-xs text-muted mt-1">— {c.autorNome ?? c.autor}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
