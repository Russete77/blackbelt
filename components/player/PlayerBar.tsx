"use client";
import { useRef } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { formatTempo } from "./format";
import { SpeedControl } from "./SpeedControl";
import { VersionSelector } from "./VersionSelector";

export function PlayerBar() {
  const { versaoAtual, faixaTitulo, playing, toggle, tempoAtual, duracao, playerAtivo, seek } = usePlayer();
  const trilhaRef = useRef<HTMLDivElement>(null);
  // Sem waveform montada não há motor de áudio — controles seriam no-ops.
  if (!versaoAtual || !playerAtivo) return null;
  const progresso = duracao > 0 ? Math.min(100, (tempoAtual / duracao) * 100) : 0;

  const buscarNaPosicao = (clientX: number) => {
    const trilha = trilhaRef.current;
    if (!trilha || duracao <= 0) return;
    const rect = trilha.getBoundingClientRect();
    const proporcao = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seek(proporcao * duracao);
  };
  const aoIniciarBusca = (e: React.PointerEvent<HTMLDivElement>) => buscarNaPosicao(e.clientX);
  const aoArrastarBusca = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    buscarNaPosicao(e.clientX);
  };
  const aoTeclarBusca = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duracao <= 0) return;
    if (e.key === "ArrowRight") seek(Math.min(duracao, tempoAtual + 5));
    else if (e.key === "ArrowLeft") seek(Math.max(0, tempoAtual - 5));
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface/95 backdrop-blur md:bottom-0 md:left-60">
      <div
        className="relative cursor-pointer touch-none py-3"
        role="slider"
        aria-label="Progresso da faixa"
        aria-valuemin={0}
        aria-valuemax={Math.round(duracao)}
        aria-valuenow={Math.round(tempoAtual)}
        tabIndex={0}
        onPointerDown={aoIniciarBusca}
        onPointerMove={aoArrastarBusca}
        onKeyDown={aoTeclarBusca}
      >
        <div ref={trilhaRef} className="h-0.5 w-full bg-line/60">
          <div className="h-full bg-accent transition-[width] duration-150 ease-linear" style={{ width: `${progresso}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button onClick={toggle}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition-all duration-200 hover:brightness-110 active:scale-95"
          aria-label={playing ? "Pausar" : "Tocar"}>
          {playing
            ? <Pause className="h-5 w-5 fill-current" aria-hidden />
            : <Play className="h-5 w-5 fill-current pl-0.5" aria-hidden />}
        </button>
        <Link href={`/faixa/${versaoAtual.faixaId}`} className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium hover:underline">{faixaTitulo || "—"}</div>
          <div className="font-mono text-xs tabular-nums text-muted">
            {formatTempo(tempoAtual)} / {formatTempo(duracao)}
          </div>
        </Link>
        <VersionSelector />
        <SpeedControl />
      </div>
    </div>
  );
}
