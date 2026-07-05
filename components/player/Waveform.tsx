"use client";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { AlertTriangle, Repeat, X, ZoomIn, ZoomOut } from "lucide-react";
import { usePlayer } from "./PlayerContext";
import { formatTempo } from "./format";
import { tokens } from "@/lib/tokens";
import type { Comentario } from "@/types/domain";

// cor neutra da onda não-tocada (independe do rebrand)
const WAVE_COLOR = "#3A3A40";
// zoom em px por segundo: 0 = onda ajustada à largura; máx dá precisão fina.
const ZOOM_MAX = 500;
const ZOOM_PASSO = 50;
// Janela do loop de um comentário: alguns segundos antes (contexto) e vários
// depois (tempo suficiente pra ouvir o problema e corrigir).
const LOOP_ANTES_SEGUNDOS = 2;
const LOOP_DEPOIS_SEGUNDOS = 6;

export function Waveform({
  versaoId, arquivoUrl, comentarios, height = 96, onInteraction,
}: {
  versaoId: string;
  arquivoUrl: string;
  // Comentários da versão exibida — viram marcadores fixos na onda (região de
  // largura zero do plugin Regions, então zoom/scroll não os desalinha).
  comentarios: Comentario[];
  height?: number;
  // Chamado quando o usuário clica/arrasta na onda, com o tempo (s) do ponto.
  onInteraction?: (segundos: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const player = usePlayer();
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const marcadoresRef = useRef<Region[]>([]);
  const loopRegiaoRef = useRef<Region | null>(null);

  const [zoomPx, setZoomPx] = useState(0);
  const [erroCarga, setErroCarga] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  // Refs para não recriar o wavesurfer quando os callbacks mudam de identidade.
  const onInteractionRef = useRef(onInteraction);
  useEffect(() => {
    onInteractionRef.current = onInteraction;
  }, [onInteraction]);
  // Última lista de comentários, para o efeito de loop não recriar a região
  // (e reiniciar a repetição) quando só a lista muda por outro motivo.
  const comentariosRef = useRef(comentarios);
  useEffect(() => {
    comentariosRef.current = comentarios;
  }, [comentarios]);

  useEffect(() => {
    if (!containerRef.current || !arquivoUrl) return;
    // Versão nova = instância nova: zera zoom e loop.
    setErroCarga(false);
    setZoomPx(0);
    marcadoresRef.current = [];
    loopRegiaoRef.current = null;
    player.pararLoopComentario();

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
      // Arrastar na onda move o playhead (scrub), como num editor — precisa
      // ficar livre mesmo com zoom, então nada de região por arraste aqui.
      dragToSeek: true,
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

    // Clique num marcador de comentário (região de largura zero) navega até
    // ele em vez de abrir "novo comentário" no clique subjacente da onda.
    regions.on("region-clicked", (region, e) => {
      if (region.start === region.end) {
        e.stopPropagation();
        player.seek(region.start);
      }
    });
    // Loop do trecho de um comentário: ao sair da região, volta pro início —
    // repete até o usuário desligar (ver useEffect de loopComentarioId abaixo).
    regions.on("region-out", (region) => {
      if (loopRegiaoRef.current === region) region.play();
    });

    return () => {
      player.registerWavesurfer(null);
      wsRef.current = null;
      regionsRef.current = null;
      marcadoresRef.current = [];
      loopRegiaoRef.current = null;
      ws.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoId, arquivoUrl, tentativa]);

  // Marcadores dos comentários: recriados sempre que a lista mudar (novo
  // comentário, edição etc.), sem recriar o wavesurfer inteiro.
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions) return;
    marcadoresRef.current.forEach((r) => r.remove());
    marcadoresRef.current = comentarios.map((c) => {
      const ponto = document.createElement("span");
      ponto.style.cssText = [
        "position:absolute", "top:-11px", "left:0", "transform:translateX(-50%)",
        "width:12px", "height:12px", "border-radius:9999px",
        `border:1px solid ${tokens.colors.bg}`, `background:${tokens.colors.accent}`,
        "box-shadow:0 1px 2px rgba(0,0,0,.4)", "cursor:pointer", "transition:transform .15s",
      ].join(";");
      const regiao = regions.addRegion({
        id: `comentario-${c.id}`,
        start: c.timestampSegundos,
        end: c.timestampSegundos,
        drag: false,
        resize: false,
        color: `${tokens.colors.accent}55`,
        content: ponto,
      });
      const el = regiao.element;
      if (el) {
        el.title = c.texto;
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute(
          "aria-label",
          `Comentário aos ${formatTempo(c.timestampSegundos)}: ${c.texto}`,
        );
        el.classList.add("rounded-full", "focus-visible:outline-2", "focus-visible:outline-accent");
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            player.seek(c.timestampSegundos);
          }
        });
      }
      regiao.on("over", () => { ponto.style.transform = "translateX(-50%) scale(1.25)"; });
      regiao.on("leave", () => { ponto.style.transform = "translateX(-50%) scale(1)"; });
      return regiao;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comentarios]);

  // Loop de trecho: acionado por "Repetir trecho" num comentário (ver
  // ListaComentarios). Cria uma região ao redor do timestamp e a repete.
  useEffect(() => {
    const regions = regionsRef.current;
    const ws = wsRef.current;
    loopRegiaoRef.current?.remove();
    loopRegiaoRef.current = null;
    if (!regions || !ws || !player.loopComentarioId) return;
    const alvo = comentariosRef.current.find((c) => c.id === player.loopComentarioId);
    const duracao = ws.getDuration();
    if (!alvo || duracao <= 0) return;
    const inicio = Math.max(0, alvo.timestampSegundos - LOOP_ANTES_SEGUNDOS);
    const fim = Math.min(duracao, alvo.timestampSegundos + LOOP_DEPOIS_SEGUNDOS);
    const regiao = regions.addRegion({
      start: inicio,
      end: fim,
      drag: false,
      resize: false,
      color: `${tokens.colors.accent}26`,
    });
    loopRegiaoRef.current = regiao;
    regiao.play();
    // Só recria a região (e reinicia a repetição) quando o alvo do loop ou a
    // duração mudam — não a cada re-render da lista de comentários (lida via
    // comentariosRef, por isso fica de fora do array de dependências).
  }, [player.loopComentarioId, player.duracao]);

  function aplicarZoom(px: number) {
    const limitado = Math.min(ZOOM_MAX, Math.max(0, px));
    setZoomPx(limitado);
    const ws = wsRef.current;
    if (ws && ws.getDuration() > 0) {
      try {
        ws.zoom(limitado);
      } catch {
        // áudio ainda não decodificado — o zoom é reaplicado no próximo ajuste
      }
    }
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

        {player.loopComentarioId && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2.5 py-2 text-xs font-medium text-accent">
            <Repeat className="h-4 w-4" aria-hidden />
            Repetindo trecho do comentário
            <button
              onClick={() => player.pararLoopComentario()}
              aria-label="Parar o loop"
              title="Parar o loop"
              className="rounded-md p-0.5 transition-colors duration-200 hover:bg-accent/20"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
