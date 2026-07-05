"use client";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { AlertTriangle, Repeat, X, ZoomIn, ZoomOut } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { tokens } from "@/lib/tokens";
import { cn } from "@/lib/cn";

// cor neutra da onda não-tocada (independe do rebrand)
const WAVE_COLOR = "#3A3A40";
// zoom em px por segundo: 0 = onda ajustada à largura; máx dá precisão fina.
const ZOOM_MAX = 500;
const ZOOM_PASSO = 50;

export function Waveform({
  versaoId, arquivoUrl, height = 96, onInteraction, onZoomAtivo,
}: {
  versaoId: string;
  arquivoUrl: string;
  height?: number;
  // Chamado quando o usuário clica/arrasta na onda, com o tempo (s) do ponto.
  onInteraction?: (segundos: number) => void;
  // Chamado quando o zoom entra/sai do modo ajustado (a onda passa a rolar,
  // então overlays por % — como os pinos — deixam de alinhar).
  onZoomAtivo?: (ativo: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const regiaoRef = useRef<Region | null>(null);
  const loopRef = useRef(false);

  const [zoomPx, setZoomPx] = useState(0);
  const [temRegiao, setTemRegiao] = useState(false);
  const [loopAtivo, setLoopAtivo] = useState(false);
  const [erroCarga, setErroCarga] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  // Refs para não recriar o wavesurfer quando os callbacks mudam de identidade.
  const onInteractionRef = useRef(onInteraction);
  const onZoomAtivoRef = useRef(onZoomAtivo);
  useEffect(() => {
    onInteractionRef.current = onInteraction;
    onZoomAtivoRef.current = onZoomAtivo;
  }, [onInteraction, onZoomAtivo]);

  useEffect(() => {
    if (!containerRef.current || !arquivoUrl) return;
    // Versão nova = instância nova: zera zoom, trecho e loop.
    setErroCarga(false);
    setZoomPx(0);
    setTemRegiao(false);
    setLoopAtivo(false);
    loopRef.current = false;
    regiaoRef.current = null;
    onZoomAtivoRef.current?.(false);

    const regions = RegionsPlugin.create();
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
      plugins: [regions],
    });
    wsRef.current = ws;
    regionsRef.current = regions;
    player.registerWavesurfer(ws);
    ws.on("ready", () => player._onReady(ws.getDuration()));
    ws.on("timeupdate", (t) => player._onTime(t));
    ws.on("play", () => player._onPlayPause(true));
    ws.on("pause", () => player._onPlayPause(false));
    ws.on("interaction", (novoTempo) => onInteractionRef.current?.(novoTempo));
    // Signed URL expirada (1h) ou falha de rede: sem isto a onda fica vazia
    // e muda — mostramos aviso com opção de recarregar.
    ws.on("error", () => setErroCarga(true));
    ws.setPlaybackRate(player.velocidade);

    // Arrastar num espaço vazio da onda cria o trecho (uma região por vez).
    regions.enableDragSelection({ color: `${tokens.colors.accent}26` });
    regions.on("region-created", (region) => {
      regiaoRef.current = region;
      setTemRegiao(true);
      regions.getRegions().forEach((r) => {
        if (r !== region) r.remove();
      });
    });
    regions.on("region-removed", (region) => {
      if (regiaoRef.current === region) {
        regiaoRef.current = null;
        setTemRegiao(false);
        setLoopAtivo(false);
        loopRef.current = false;
      }
    });
    // Loop: ao sair do trecho, volta para o início dele.
    regions.on("region-out", (region) => {
      if (loopRef.current && regiaoRef.current === region) region.play();
    });

    return () => {
      player.registerWavesurfer(null);
      wsRef.current = null;
      regionsRef.current = null;
      regiaoRef.current = null;
      ws.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoId, arquivoUrl, tentativa]);

  function aplicarZoom(px: number) {
    const limitado = Math.min(ZOOM_MAX, Math.max(0, px));
    setZoomPx(limitado);
    onZoomAtivoRef.current?.(limitado > 0);
    const ws = wsRef.current;
    if (ws && ws.getDuration() > 0) {
      try {
        ws.zoom(limitado);
      } catch {
        // áudio ainda não decodificado — o zoom é reaplicado no próximo ajuste
      }
    }
  }

  function alternarLoop() {
    const novo = !loopAtivo;
    loopRef.current = novo;
    setLoopAtivo(novo);
    // Ao ligar, se já está tocando fora do trecho, entra no trecho.
    const ws = wsRef.current;
    const regiao = regiaoRef.current;
    if (novo && ws && regiao && ws.isPlaying()) {
      const t = ws.getCurrentTime();
      if (t < regiao.start || t > regiao.end) regiao.play();
    }
  }

  function limparTrecho() {
    regionsRef.current?.clearRegions();
    regiaoRef.current = null;
    setTemRegiao(false);
    setLoopAtivo(false);
    loopRef.current = false;
  }

  // Seek por teclado: setas ±5s, Home/End (a onda é o mecanismo primário
  // de navegação e precisa funcionar sem mouse).
  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    const ws = wsRef.current;
    if (!ws || ws.getDuration() <= 0) return;
    const dur = ws.getDuration();
    const t = ws.getCurrentTime();
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      ws.setTime(Math.min(t + 5, dur));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      ws.setTime(Math.max(t - 5, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      ws.setTime(0);
    } else if (e.key === "End") {
      e.preventDefault();
      ws.setTime(dur);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      ws.playPause();
    }
  }

  if (!arquivoUrl) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-4 text-sm text-muted">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        O áudio desta versão não está disponível no momento.
      </p>
    );
  }
  if (erroCarga) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-4 text-sm text-muted">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Não foi possível carregar o áudio (o link pode ter expirado).{" "}
          <button
            onClick={() => setTentativa((n) => n + 1)}
            className="font-medium text-accent transition-colors duration-200 hover:underline"
          >
            Tentar de novo
          </button>
        </span>
      </div>
    );
  }
  return (
    <div>
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Posição na faixa (setas para navegar, espaço para tocar/pausar)"
        aria-valuemin={0}
        aria-valuemax={Math.round(player.duracao)}
        aria-valuenow={Math.round(player.tempoAtual)}
        onKeyDown={aoTeclar}
        className="w-full cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => aplicarZoom(zoomPx - ZOOM_PASSO)}
            disabled={zoomPx === 0}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            className="rounded-md p-2 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg disabled:opacity-40"
          >
            <ZoomOut className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="range"
            min={0}
            max={ZOOM_MAX}
            step={10}
            value={zoomPx}
            onChange={(e) => aplicarZoom(Number(e.target.value))}
            aria-label="Zoom da forma de onda"
            className="h-1 w-28 cursor-pointer accent-accent"
          />
          <button
            onClick={() => aplicarZoom(zoomPx + ZOOM_PASSO)}
            disabled={zoomPx === ZOOM_MAX}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
            className="rounded-md p-2 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg disabled:opacity-40"
          >
            <ZoomIn className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={alternarLoop}
            disabled={!temRegiao}
            aria-pressed={loopAtivo}
            title={temRegiao
              ? (loopAtivo ? "Desligar o loop do trecho" : "Repetir o trecho selecionado")
              : "Arraste na onda para marcar um trecho"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors duration-200 disabled:opacity-40",
              loopAtivo
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-surface2 hover:text-fg",
            )}
          >
            <Repeat className="h-4 w-4" aria-hidden />
            Loop
          </button>
          {temRegiao ? (
            <button
              onClick={limparTrecho}
              title="Limpar trecho"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Limpar trecho
            </button>
          ) : (
            <span className="text-xs text-muted">Arraste na onda para marcar um trecho</span>
          )}
        </div>
      </div>
    </div>
  );
}
