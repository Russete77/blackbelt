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
  // true enquanto há um wavesurfer montado (página da faixa aberta).
  // Fora dela não existe motor de áudio — a PlayerBar se esconde.
  playerAtivo: boolean;
  tocar: (versao: VersaoFaixa, faixaTitulo: string, versoesIrmas: VersaoFaixa[]) => void;
  // Atualiza título/versões-irmãs sem trocar a versão selecionada
  // (usado após router.refresh, que traz listas novas do servidor).
  atualizarContexto: (faixaTitulo: string, versoesIrmas: VersaoFaixa[]) => void;
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
  const velocidadeRef = useRef(1);
  const versaoAtualIdRef = useRef<string | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<VersaoFaixa | null>(null);
  const [faixaTitulo, setFaixaTitulo] = useState("");
  const [versoesIrmas, setVersoesIrmas] = useState<VersaoFaixa[]>([]);
  const [playing, setPlaying] = useState(false);
  const [velocidade, setVel] = useState(1);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [playerAtivo, setPlayerAtivo] = useState(false);

  const registerWavesurfer = useCallback((ws: WaveSurfer | null) => {
    wsRef.current = ws;
    setPlayerAtivo(ws !== null);
    if (ws) {
      ws.setPlaybackRate(velocidadeRef.current);
    } else {
      // destroy() do wavesurfer remove os listeners antes de pausar o <audio>,
      // então o evento pause nunca chega — resetamos o estado aqui.
      setPlaying(false);
    }
  }, []);

  // Recebe também o título da faixa e as versões-irmãs (para o PlayerBar/
  // VersionSelector globais, que não têm acesso aos dados da rota /faixa/[id]).
  const tocar = useCallback((versao: VersaoFaixa, titulo: string, irmas: VersaoFaixa[]) => {
    setVersaoAtual((atual) => (atual?.id === versao.id ? atual : versao));
    setFaixaTitulo(titulo);
    setVersoesIrmas(irmas);
    // Trocou de versão/faixa: zera o relógio para não herdar tempo/duração
    // da anterior (pinos e "comentar aqui" usariam valores errados).
    if (versaoAtualIdRef.current !== versao.id) {
      versaoAtualIdRef.current = versao.id;
      setTempoAtual(0);
      setDuracao(versao.duracaoSegundos || 0);
    }
  }, []);

  const atualizarContexto = useCallback((titulo: string, irmas: VersaoFaixa[]) => {
    setFaixaTitulo(titulo);
    setVersoesIrmas(irmas);
  }, []);

  const toggle = useCallback(() => wsRef.current?.playPause(), []);
  const seek = useCallback((segundos: number) => {
    const ws = wsRef.current;
    if (ws && ws.getDuration() > 0) ws.setTime(segundos);
  }, []);
  const setVelocidade = useCallback((v: number) => {
    velocidadeRef.current = v;
    setVel(v);
    wsRef.current?.setPlaybackRate(v);
  }, []);

  // timeupdate dispara a ~60fps durante o playback; a UI só exibe segundos
  // inteiros, então só re-renderizamos quando o segundo virar.
  const _onTime = useCallback((t: number) => {
    setTempoAtual((prev) => (Math.floor(t) === Math.floor(prev) ? prev : t));
  }, []);

  const value = useMemo<PlayerState>(() => ({
    versaoAtual, faixaTitulo, versoesIrmas, playing, velocidade, tempoAtual, duracao, playerAtivo,
    tocar, atualizarContexto, toggle, setVelocidade, seek, registerWavesurfer,
    _onTime,
    _onReady: (d) => setDuracao(d),
    _onPlayPause: setPlaying,
  }), [versaoAtual, faixaTitulo, versoesIrmas, playing, velocidade, tempoAtual, duracao, playerAtivo,
       tocar, atualizarContexto, toggle, setVelocidade, seek, registerWavesurfer, _onTime]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer deve estar dentro de <PlayerProvider>");
  return ctx;
}
