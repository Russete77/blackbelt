"use client";
// YouTube (estrutura): atalho opcional para puxar o viewCount de um vídeo
// específico via YouTube Data API. Não é um scraper — é um formulário
// pontual, um vídeo por vez, e só funciona se YOUTUBE_API_KEY estiver
// configurada no ambiente (o servidor avisa via `configurado`).
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { MonitorPlay, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { sincronizarViewsYoutube, type EstadoYoutube } from "@/app/(app)/analytics/actions";

const ESTADO_INICIAL: EstadoYoutube = { status: "idle" };

export function SincronizarYoutube({
  configurado, artistas, artistaFixoId,
}: {
  configurado: boolean;
  artistas: { id: string; nome: string }[];
  artistaFixoId?: string;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoYoutube, formData: FormData) => sincronizarViewsYoutube(prev, formData),
    ESTADO_INICIAL,
  );

  if (!configurado) {
    return (
      <p className="text-xs text-muted">
        YouTube: configure <code className="rounded bg-surface2 px-1 py-0.5 font-mono">YOUTUBE_API_KEY</code> no
        ambiente para puxar views automaticamente.
      </p>
    );
  }

  if (!aberto) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setAberto(true)}>
        <MonitorPlay className="h-4 w-4" aria-hidden />
        Buscar views do YouTube
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-surface2/60 p-3">
      <input type="hidden" name="caminho" value={caminho} />
      {!artistaFixoId && (
        <Field label="Artista" className="w-40">
          <Select name="artistaId" required defaultValue="">
            <option value="" disabled>Selecione</option>
            {artistas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </Select>
        </Field>
      )}
      {artistaFixoId && <input type="hidden" name="artistaId" value={artistaFixoId} />}
      <Field label="ID do vídeo" className="w-40">
        <Input name="videoId" placeholder="dQw4w9WgXcQ" required />
      </Field>
      <Button type="submit" size="sm" disabled={pendente}>
        {pendente ? "Buscando..." : "Buscar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>Cancelar</Button>
      {estado.status === "ok" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5" aria-hidden />{estado.message}</p>
      )}
      {estado.status === "error" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{estado.message}</p>
      )}
    </form>
  );
}
