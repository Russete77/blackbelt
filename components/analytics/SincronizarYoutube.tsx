"use client";
// YouTube: sincronização de views por faixa via YouTube Data API.
// Ação primária = "Sincronizar YouTube (todas)": busca o viewCount atual de
// toda faixa com vídeo vinculado (ver components/faixa/VincularYoutube) e
// grava/atualiza a métrica do dia. O form de 1 vídeo pontual (sem faixa
// vinculada, direto para o artista) fica atrás de um link secundário.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, MonitorPlay, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  sincronizarViewsYoutube, sincronizarYoutubeTudo,
  type EstadoYoutube, type EstadoSincronizacaoYoutube,
} from "@/app/(app)/analytics/actions";

const ESTADO_INICIAL: EstadoYoutube = { status: "idle" };
const ESTADO_TUDO_INICIAL: EstadoSincronizacaoYoutube = { status: "idle" };

export function SincronizarYoutube({
  configurado, artistas, artistaFixoId, status, permitirManual = true,
}: {
  configurado: boolean;
  artistas: { id: string; nome: string }[];
  artistaFixoId?: string;
  status?: { comVideo: number; semVideo: number };
  // false esconde o form de "1 vídeo manualmente" (widget antigo que confundia
  // quem esperava ver as faixas cadastradas aparecerem sozinhas) — usado no
  // painel do selo, onde o caminho recomendado é a aba Conectar & Importar
  // de cada artista. O botão de sincronização em lote continua disponível.
  permitirManual?: boolean;
}) {
  const caminho = usePathname();
  const [manualAberto, setManualAberto] = useState(false);

  const [estadoTudo, formActionTudo, pendenteTudo] = useActionState(
    async (prev: EstadoSincronizacaoYoutube, formData: FormData) => sincronizarYoutubeTudo(prev, formData),
    ESTADO_TUDO_INICIAL,
  );
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <form action={formActionTudo}>
          <input type="hidden" name="caminho" value={caminho} />
          <Button type="submit" variant="outline" size="sm" disabled={pendenteTudo}>
            <RefreshCw className={pendenteTudo ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
            {pendenteTudo ? "Sincronizando..." : "Sincronizar YouTube (todas)"}
          </Button>
        </form>
        {status && (
          <p className="text-xs text-muted">
            {status.comVideo} faixa(s) com vídeo vinculado
            {status.semVideo > 0 ? ` · ${status.semVideo} sem vínculo ainda` : ""}
          </p>
        )}
      </div>

      {(estadoTudo.status === "ok" || estadoTudo.status === "error") && (
        <div className="flex flex-col gap-1">
          <p className={`flex items-center gap-1.5 text-xs ${estadoTudo.status === "ok" ? "text-success" : "text-danger"}`}>
            {estadoTudo.status === "ok"
              ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              : <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            {estadoTudo.message}
          </p>
          {estadoTudo.erros && estadoTudo.erros.length > 0 && (
            <ul className="list-inside list-disc text-xs text-muted">
              {estadoTudo.erros.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {!permitirManual ? null : !manualAberto ? (
        <button
          type="button"
          onClick={() => setManualAberto(true)}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-accent"
        >
          <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
          Vincular 1 vídeo manualmente (sem faixa)
        </button>
      ) : (
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
          <Button type="button" variant="ghost" size="sm" onClick={() => setManualAberto(false)}>Cancelar</Button>
          {estado.status === "ok" && (
            <p className="flex w-full items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5" aria-hidden />{estado.message}</p>
          )}
          {estado.status === "error" && (
            <p className="flex w-full items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{estado.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
