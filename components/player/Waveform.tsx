"use client";
import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { usePlayer } from "./PlayerContext";
import { tokens } from "@/lib/tokens";

// cor neutra da onda não-tocada (independe do rebrand)
const WAVE_COLOR = "#3A3A40";

export function Waveform({
  versaoId, arquivoUrl, height = 96,
}: { versaoId: string; arquivoUrl: string; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();

  useEffect(() => {
    if (!containerRef.current || !arquivoUrl) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: arquivoUrl,
      height,
      waveColor: WAVE_COLOR,
      progressColor: tokens.colors.accent,
      cursorColor: tokens.colors.fg,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });
    player.registerWavesurfer(ws);
    ws.on("ready", () => player._onReady(ws.getDuration()));
    ws.on("timeupdate", (t) => player._onTime(t));
    ws.on("play", () => player._onPlayPause(true));
    ws.on("pause", () => player._onPlayPause(false));
    ws.setPlaybackRate(player.velocidade);
    return () => {
      player.registerWavesurfer(null);
      ws.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoId, arquivoUrl]);

  if (!arquivoUrl) return null;
  return <div ref={containerRef} className="w-full cursor-pointer" />;
}
