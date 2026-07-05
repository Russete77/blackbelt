"use client";
// Deezer: busca (keyless) de candidatos por nome + conectar + importar o
// catálogo inteiro (top + faixas de álbuns) pro projeto "Catálogo" do
// artista. A busca roda via Server Action (buscarCandidatosDeezer) porque a
// API da Deezer não manda CORS — não dá pra chamar direto do browser.
import { useActionState, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Search, Link as LinkIcon, Check, AlertTriangle, Music, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import {
  buscarCandidatosDeezer, conectarDeezer, importarCatalogoDeezer,
  type EstadoAcao, type EstadoImportacaoDeezer,
} from "@/app/(app)/importar/actions";
import type { CandidatoArtistaDeezer } from "@/lib/deezer";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const ESTADO_IMPORTACAO_INICIAL: EstadoImportacaoDeezer = { status: "idle" };

export function ConectarDeezer({
  artistaId, nomeArtista, deezerArtistId,
}: { artistaId: string; nomeArtista: string; deezerArtistId?: string }) {
  const caminho = usePathname();
  const [termo, setTermo] = useState(nomeArtista);
  const [candidatos, setCandidatos] = useState<CandidatoArtistaDeezer[]>([]);
  const [buscando, iniciarBusca] = useTransition();
  const [buscaErro, setBuscaErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(deezerArtistId ?? null);

  const [estadoConectar, formActionConectar, pendenteConectar] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => conectarDeezer(prev, formData),
    ESTADO_INICIAL,
  );
  const [estadoImportar, formActionImportar, pendenteImportar] = useActionState(
    async (prev: EstadoImportacaoDeezer, formData: FormData) => importarCatalogoDeezer(prev, formData),
    ESTADO_IMPORTACAO_INICIAL,
  );

  function buscar() {
    setBuscaErro(null);
    iniciarBusca(async () => {
      const resultado = await buscarCandidatosDeezer(termo);
      setCandidatos(resultado);
      if (resultado.length === 0) setBuscaErro("Nenhum artista encontrado no Deezer com esse nome.");
    });
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-accent" aria-hidden />
          <h3 className="text-sm font-semibold">Deezer</h3>
        </div>
        <p className="text-xs text-muted">
          Busca sem chave de API: encontre o artista no Deezer e importe o catálogo inteiro de uma vez.
        </p>

        {deezerArtistId && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> Conectado (id do artista Deezer: {deezerArtistId})
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nome do artista no Deezer" className="min-w-[10rem] flex-1">
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

        {candidatos.length > 0 && (
          <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
            {candidatos.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line p-2 transition-colors duration-200 hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-surface2/60">
                  <input
                    type="radio"
                    name="candidatoDeezer"
                    className="accent-accent"
                    checked={selecionado === c.id}
                    onChange={() => setSelecionado(c.id)}
                  />
                  {c.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.fotoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface2 text-muted">
                      <Music className="h-4 w-4" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Users className="h-3 w-3" aria-hidden /> {c.fas.toLocaleString("pt-BR")} fãs
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}

        <form action={formActionConectar} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="deezerArtistId" value={selecionado ?? ""} />
          <Button type="submit" size="sm" variant="outline" disabled={!selecionado || pendenteConectar}>
            <LinkIcon className="h-4 w-4" aria-hidden /> {pendenteConectar ? "Conectando..." : "Conectar"}
          </Button>
          {estadoConectar.status === "ok" && (
            <p className="flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoConectar.message}</p>
          )}
          {estadoConectar.status === "error" && (
            <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoConectar.message}</p>
          )}
        </form>

        <form action={formActionImportar} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="artistaId" value={artistaId} />
          <Button type="submit" size="sm" disabled={!deezerArtistId || pendenteImportar}>
            <Download className="h-4 w-4" aria-hidden /> {pendenteImportar ? "Importando..." : "Importar catálogo"}
          </Button>
          {estadoImportar.status === "ok" && (
            <p className="flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoImportar.message}</p>
          )}
          {estadoImportar.status === "error" && (
            <p className="flex items-center gap-1.5 text-xs text-danger"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estadoImportar.message}</p>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
