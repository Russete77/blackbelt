"use client";
import { Pause, Play } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { formatTempo } from "./format";
import { SpeedControl } from "./SpeedControl";
import { VersionSelector } from "./VersionSelector";

export function PlayerBar() {
  const { versaoAtual, faixaTitulo, playing, toggle, tempoAtual, duracao, playerAtivo } = usePlayer();
  // Sem waveform montada não há motor de áudio — controles seriam no-ops.
  if (!versaoAtual || !playerAtivo) return null;
  const progresso = duracao > 0 ? Math.min(100, (tempoAtual / duracao) * 100) : 0;
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface/95 backdrop-blur md:bottom-0 md:left-60">
      <div className="h-0.5 w-full bg-line/60">
        <div className="h-full bg-accent transition-[width] duration-150 ease-linear" style={{ width: `${progresso}%` }} />
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button onClick={toggle}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-all duration-200 hover:brightness-110 active:scale-95"
          aria-label={playing ? "Pausar" : "Tocar"}>
          {playing
            ? <Pause className="h-5 w-5 fill-current" aria-hidden />
            : <Play className="h-5 w-5 fill-current pl-0.5" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{faixaTitulo || "—"}</div>
          <div className="font-mono text-xs tabular-nums text-muted">
            {formatTempo(tempoAtual)} / {formatTempo(duracao)}
          </div>
        </div>
        <VersionSelector />
        <SpeedControl />
      </div>
    </div>
  );
}
