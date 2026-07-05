"use client";
// YouTube — "footprint" cross-channel: busca por nome em TODOS os canais
// (não só o do artista), cobrindo feats/parcerias em canais de terceiros
// (gravadoras parceiras, outros artistas). A busca é ruidosa (covers,
// homônimos, lyric video de fã) — por isso exige curadoria humana: o usuário
// MARCA os vídeos que realmente são do artista antes de importar.
import { useActionState, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Search, Video, AlertTriangle, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import {
  buscarFootprintYoutube, importarVideosSelecionados, type EstadoImportacaoFootprint,
} from "@/app/(app)/importar/actions";
import type { VideoBuscaYoutube } from "@/lib/youtube";

const ESTADO_INICIAL: EstadoImportacaoFootprint = { status: "idle" };

export function BuscarFootprintYoutube({
  artistaId, nomeArtista, configurado,
}: { artistaId: string; nomeArtista: string; configurado: boolean }) {
  const caminho = usePathname();
  const [termo, setTermo] = useState(nomeArtista);
  const [resultados, setResultados] = useState<VideoBuscaYoutube[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [buscando, iniciarBusca] = useTransition();
  const [buscaErro, setBuscaErro] = useState<string | null>(null);

  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoImportacaoFootprint, formData: FormData) => importarVideosSelecionados(prev, formData),
    ESTADO_INICIAL,
  );

  if (!configurado) return null; // aviso de YOUTUBE_API_KEY já aparece no card de canal — evita duplicar

  function buscar() {
    setBuscaErro(null);
    iniciarBusca(async () => {
      const resultado = await buscarFootprintYoutube(termo);
      setResultados(resultado);
      setMarcados(new Set());
      if (resultado.length === 0) setBuscaErro("Nenhum vídeo encontrado com esse termo.");
    });
  }

  function alternar(videoId: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(videoId)) novo.delete(videoId); else novo.add(videoId);
      return novo;
    });
  }

  const selecionados = resultados.filter((v) => marcados.has(v.videoId));
  const videosJson = JSON.stringify(
    selecionados.map((v) => ({ videoId: v.videoId, titulo: v.titulo, viewCount: v.viewCount })),
  );

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold">Aparições em outros canais (footprint)</h3>
        </div>
        <p className="text-xs text-muted">
          Busca em TODOS os canais do YouTube, não só o do artista — cobre feats e parcerias com outras gravadoras.
          A busca é ruidosa: marque só os vídeos que realmente são de {nomeArtista} antes de importar.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Buscar por nome" className="min-w-[10rem] flex-1">
            <Input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Nome do artista"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(); } }}
            />
          </Field>
          <Button type="button" size="sm" variant="outline" onClick={buscar} disabled={buscando || !termo.trim()}>
            <Search className="h-4 w-4" aria-hidden /> {buscando ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {buscaErro && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{buscaErro}
          </p>
        )}

        {resultados.length > 0 && (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="caminho" value={caminho} />
            <input type="hidden" name="artistaId" value={artistaId} />
            <input type="hidden" name="videosJson" value={videosJson} />

            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {resultados.map((v) => (
                <li key={v.videoId}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-2 transition-colors duration-200 hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-surface2/60">
                    <input
                      type="checkbox"
                      className="mt-1 accent-accent"
                      checked={marcados.has(v.videoId)}
                      onChange={() => alternar(v.videoId)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{v.titulo}</p>
                      <p className="text-xs text-muted">
                        {v.canalTitulo} · {v.viewCount.toLocaleString("pt-BR")} views
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={selecionados.length === 0 || pendente}>
                <Download className="h-4 w-4" aria-hidden />
                {pendente
                  ? "Importando..."
                  : selecionados.length > 0
                    ? `Importar ${selecionados.length} marcado(s)`
                    : "Importar marcados"}
              </Button>
              {estado.status === "ok" && (
                <p className="flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}</p>
              )}
              {estado.status === "error" && (
                <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}</p>
              )}
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
