"use client";
// "Só escolher e ouvir": segmented control pra trocar entre YouTube, Spotify
// e Deezer, embutindo o player oficial de cada plataforma (iframe) — nada de
// upload/versão aqui, é a mesma música já lançada fora. Plataforma sem id
// ainda vinculado mostra o form "colar link" (VincularPlataformaForm) no
// lugar do player.
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MonitorPlay, Music2, Disc3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { VincularPlataformaForm } from "@/components/faixa/VincularPlataformaForm";

type Plataforma = "youtube" | "spotify" | "deezer";

interface AbaPlataforma {
  chave: Plataforma;
  rotulo: string;
  icon: LucideIcon;
  id?: string;
}

export function PlayersTabs({
  faixaId, youtubeVideoId, spotifyTrackId, deezerTrackId,
}: {
  faixaId: string;
  youtubeVideoId?: string;
  spotifyTrackId?: string;
  deezerTrackId?: string;
}) {
  const abas: AbaPlataforma[] = [
    { chave: "youtube", rotulo: "YouTube", icon: MonitorPlay, id: youtubeVideoId },
    { chave: "spotify", rotulo: "Spotify", icon: Music2, id: spotifyTrackId },
    { chave: "deezer", rotulo: "Deezer", icon: Disc3, id: deezerTrackId },
  ];
  const [ativa, setAtiva] = useState<Plataforma>(
    youtubeVideoId ? "youtube" : spotifyTrackId ? "spotify" : "deezer",
  );
  const atual = abas.find((a) => a.chave === ativa) ?? abas[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Escolher plataforma para ouvir"
        className="mb-3 inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1"
      >
        {abas.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={ativa === a.chave}
            onClick={() => setAtiva(a.chave)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              ativa === a.chave ? "bg-accent/15 text-accent" : "text-muted hover:text-fg",
            )}
          >
            <a.icon className="h-3.5 w-3.5" aria-hidden />
            {a.rotulo}
          </button>
        ))}
      </div>

      {atual.chave === "youtube" && (
        youtubeVideoId ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title="Player do YouTube"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-sm text-muted">Sem vídeo do YouTube vinculado ainda.</p>
        )
      )}

      {atual.chave === "spotify" && (
        spotifyTrackId ? (
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}`}
            title="Player do Spotify"
            width="100%"
            height={152}
            className="w-full rounded-lg"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <VincularPlataformaForm faixaId={faixaId} plataforma="spotify" rotulo="Spotify" />
        )
      )}

      {atual.chave === "deezer" && (
        deezerTrackId ? (
          <iframe
            src={`https://widget.deezer.com/widget/dark/track/${deezerTrackId}`}
            title="Player do Deezer"
            width="100%"
            height={200}
            className="w-full rounded-lg"
            allow="encrypted-media; clipboard-write"
          />
        ) : (
          <VincularPlataformaForm faixaId={faixaId} plataforma="deezer" rotulo="Deezer" />
        )
      )}
    </div>
  );
}
