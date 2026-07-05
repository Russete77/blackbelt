"use client";
import { usePlayer } from "./PlayerContext";

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5];

export function SpeedControl() {
  const { velocidade, setVelocidade } = usePlayer();
  const proxima = () => {
    const i = VELOCIDADES.indexOf(velocidade);
    setVelocidade(VELOCIDADES[(i + 1) % VELOCIDADES.length]);
  };
  return (
    <button onClick={proxima}
      className="h-9 w-12 shrink-0 rounded-md text-center font-mono text-xs tabular-nums text-muted transition-colors duration-200 hover:bg-surface2 hover:text-accent"
      title="Velocidade de reprodução">
      {velocidade}×
    </button>
  );
}
