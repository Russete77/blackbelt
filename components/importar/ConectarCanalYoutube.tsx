"use client";
// YouTube — canal PRÓPRIO do artista/selo (ex.: @BLACKBEELT): conectar por
// @handle/link/id e sincronizar TODOS os uploads (cria faixa + grava views)
// de uma vez, sem colar vídeo por vídeo.
import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { MonitorPlay, Link as LinkIcon, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import {
  conectarCanalYoutube, sincronizarCanalYoutube,
  type EstadoAcao, type EstadoSincronizacaoCanal,
} from "@/app/(app)/importar/actions";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const ESTADO_SINCRONIZACAO_INICIAL: EstadoSincronizacaoCanal = { status: "idle" };

export function ConectarCanalYoutube({
  artistaId, youtubeChannelId, configurado,
}: { artistaId: string; youtubeChannelId?: string; configurado: boolean }) {
  const caminho = usePathname();

  const [estadoConectar, formActionConectar, pendenteConectar] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => conectarCanalYoutube(prev, formData),
    ESTADO_INICIAL,
  );
  const [estadoSincronizar, formActionSincronizar, pendenteSincronizar] = useActionState(
    async (prev: EstadoSincronizacaoCanal, formData: FormData) => sincronizarCanalYoutube(prev, formData),
    ESTADO_SINCRONIZACAO_INICIAL,
  );

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold">Canal do YouTube</h3>
        </div>
        <p className="text-xs text-muted">
          Canal próprio do artista ou do selo: conecte uma vez e sincronize todos os uploads (vídeo + views) sempre que quiser.
        </p>

        {!configurado ? (
          <p className="text-xs text-muted">
            A conexão com o YouTube ainda não está disponível. Fale com o suporte para habilitar essa integração.
          </p>
        ) : (
          <>
            {youtubeChannelId && (
              <p className="flex items-center gap-1.5 text-xs text-success">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> Conectado (id do canal: {youtubeChannelId})
              </p>
            )}

            <form action={formActionConectar} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="caminho" value={caminho} />
              <input type="hidden" name="artistaId" value={artistaId} />
              <Field label="@handle ou link do canal" className="min-w-[10rem] flex-1">
                <Input name="canal" placeholder="@BLACKBEELT" required />
              </Field>
              <Button type="submit" size="sm" variant="outline" disabled={pendenteConectar}>
                <LinkIcon className="h-4 w-4" aria-hidden /> {pendenteConectar ? "Conectando..." : "Conectar"}
              </Button>
            </form>
            {estadoConectar.status === "ok" && (
              <p className="flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoConectar.message}</p>
            )}
            {estadoConectar.status === "error" && (
              <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoConectar.message}</p>
            )}

            <form action={formActionSincronizar} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <input type="hidden" name="caminho" value={caminho} />
              <input type="hidden" name="artistaId" value={artistaId} />
              <Button type="submit" size="sm" disabled={!youtubeChannelId || pendenteSincronizar}>
                <RefreshCw className={pendenteSincronizar ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
                {pendenteSincronizar ? "Sincronizando..." : "Sincronizar"}
              </Button>
              {estadoSincronizar.status === "ok" && (
                <p className="flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoSincronizar.message}</p>
              )}
              {estadoSincronizar.status === "error" && (
                <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoSincronizar.message}</p>
              )}
            </form>
          </>
        )}
      </CardBody>
    </Card>
  );
}
