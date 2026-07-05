"use client";
import { usePlayer } from "./PlayerContext";
import { formatTempo } from "./format";
import { SpeedControl } from "./SpeedControl";
import { VersionSelector } from "./VersionSelector";
import { faixas } from "@/mock/data";

export function PlayerBar() {
  const { versaoAtual, playing, toggle, tempoAtual, duracao } = usePlayer();
  if (!versaoAtual) return null;
  const faixa = faixas.find((f) => f.id === versaoAtual.faixaId);
  return (
    <div className="fixed bottom-12 md:bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:left-60">
      <div className="flex items-center gap-3 px-4 py-2">
        <button onClick={toggle}
          className="h-10 w-10 shrink-0 rounded-full bg-accent text-accent-fg grid place-items-center text-lg"
          aria-label={playing ? "Pausar" : "Tocar"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{faixa?.titulo ?? "—"}</div>
          <div className="text-xs text-muted font-mono">
            {formatTempo(tempoAtual)} / {formatTempo(duracao)}
          </div>
        </div>
        <VersionSelector />
        <SpeedControl />
      </div>
    </div>
  );
}
