"use client";
import { Gauge } from "lucide-react";
import { usePlayer } from "./PlayerContext";

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5];

export function SpeedControl() {
  const { velocidade, setVelocidade } = usePlayer();
  const proxima = () => {
    const i = VELOCIDADES.indexOf(velocidade);
    setVelocidade(VELOCIDADES[(i + 1) % VELOCIDADES.length]);
  };
  const proximaVelocidade = VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length];
  return (
    <button onClick={proxima}
      className="flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-md text-center font-mono text-xs tabular-nums text-muted transition-colors duration-200 hover:bg-surface2 hover:text-accent"
      title="Velocidade de reprodução"
      aria-label={`Velocidade de reprodução: ${velocidade}×. Toque para mudar para ${proximaVelocidade}×.`}>
      <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
      {velocidade}×
    </button>
  );
}
