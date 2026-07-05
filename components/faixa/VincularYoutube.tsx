"use client";
// Campo discreto "Link do YouTube" na página da faixa: mostra o vídeo
// vinculado (se houver) com atalho para abrir, e um form pontual para
// vincular/trocar/remover — aceita colar a URL inteira ou o id do vídeo.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { MonitorPlay, ExternalLink, Pencil, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { vincularYoutube, type EstadoAcao } from "@/app/(app)/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function VincularYoutube({
  faixaId, youtubeVideoId, className,
}: {
  faixaId: string;
  youtubeVideoId?: string;
  className?: string;
}) {
  const caminho = usePathname();
  const [editando, setEditando] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => vincularYoutube(prev, formData),
    ESTADO_INICIAL,
  );

  if (!editando) {
    return (
      <div className={className ?? "mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted"}>
        {youtubeVideoId ? (
          <a
            href={`https://youtu.be/${youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent"
          >
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
            YouTube vinculado
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1">
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
            Sem vídeo do YouTube
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-accent"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          {youtubeVideoId ? "editar" : "vincular"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-1.5 flex flex-wrap items-center gap-2">
      <input type="hidden" name="faixaId" value={faixaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <Input
        name="youtube"
        defaultValue={youtubeVideoId ?? ""}
        placeholder="Link ou ID do YouTube"
        className="w-56"
      />
      <Button type="submit" size="sm" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
      {estado.status === "ok" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-success">
          <Check className="h-3.5 w-3.5" aria-hidden />{estado.message}
        </p>
      )}
      {estado.status === "error" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />{estado.message}
        </p>
      )}
    </form>
  );
}
