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
      className="text-xs font-mono text-muted hover:text-accent w-12 text-center"
      title="Velocidade de reprodução">
      {velocidade}×
    </button>
  );
}
