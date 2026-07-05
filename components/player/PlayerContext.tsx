"use client";
import { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { VersaoFaixa } from "@/types/domain";

interface PlayerState {
  versaoAtual: VersaoFaixa | null;
  faixaTitulo: string;
  versoesIrmas: VersaoFaixa[];
  playing: boolean;
  velocidade: number;
  tempoAtual: number;
  duracao: number;
  tocar: (versao: VersaoFaixa, faixaTitulo: string, versoesIrmas: VersaoFaixa[]) => void;
  toggle: () => void;
  setVelocidade: (v: number) => void;
  seek: (segundos: number) => void;
  registerWavesurfer: (ws: WaveSurfer | null) => void;
  _onTime: (t: number) => void;
  _onReady: (d: number) => void;
  _onPlayPause: (p: boolean) => void;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<VersaoFaixa | null>(null);
  const [faixaTitulo, setFaixaTitulo] = useState("");
  const [versoesIrmas, setVersoesIrmas] = useState<VersaoFaixa[]>([]);
  const [playing, setPlaying] = useState(false);
  const [velocidade, setVel] = useState(1);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);

  const registerWavesurfer = useCallback((ws: WaveSurfer | null) => {
    wsRef.current = ws;
    if (ws) ws.setPlaybackRate(velocidade);
  }, [velocidade]);

  // Recebe também o título da faixa e as versões-irmãs (para o PlayerBar/
  // VersionSelector globais, que não têm acesso aos dados da rota /faixa/[id]).
  const tocar = useCallback((versao: VersaoFaixa, titulo: string, irmas: VersaoFaixa[]) => {
    setVersaoAtual((atual) => (atual?.id === versao.id ? atual : versao));
    setFaixaTitulo(titulo);
    setVersoesIrmas(irmas);
  }, []);

  const toggle = useCallback(() => wsRef.current?.playPause(), []);
  const seek = useCallback((segundos: number) => {
    const ws = wsRef.current;
    if (ws && ws.getDuration() > 0) ws.setTime(segundos);
  }, []);
  const setVelocidade = useCallback((v: number) => {
    setVel(v);
    wsRef.current?.setPlaybackRate(v);
  }, []);

  const value = useMemo<PlayerState>(() => ({
    versaoAtual, faixaTitulo, versoesIrmas, playing, velocidade, tempoAtual, duracao,
    tocar, toggle, setVelocidade, seek, registerWavesurfer,
    _onTime: setTempoAtual,
    _onReady: (d) => setDuracao(d),
    _onPlayPause: setPlaying,
  }), [versaoAtual, faixaTitulo, versoesIrmas, playing, velocidade, tempoAtual, duracao,
       tocar, toggle, setVelocidade, seek, registerWavesurfer]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer deve estar dentro de <PlayerProvider>");
  return ctx;
}
