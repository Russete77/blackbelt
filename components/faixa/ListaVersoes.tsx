"use client";
// Lista de todas as versões da faixa (beat, vocal, mix, master + stems gerados
// pelo Demucs). Cada linha toca a versão no player (troca a onda) e permite
// baixar aquele arquivo isolado. É aqui que os stems separados aparecem — sem
// esta lista, só a última versão ficava visível na página.
import { Play, Download, Pause } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import { labelTipoVersao } from "@/lib/labels";
import type { Faixa, VersaoFaixa } from "@/types/domain";

// Força o navegador a BAIXAR (Content-Disposition: attachment) em vez de abrir:
// a signed URL do Supabase Storage aceita o parâmetro ?download=<nome>.
function urlDownload(arquivoUrl: string, nome: string): string {
  const sep = arquivoUrl.includes("?") ? "&" : "?";
  return `${arquivoUrl}${sep}download=${encodeURIComponent(nome)}`;
}

function nomeArquivo(faixaTitulo: string, rotulo: string): string {
  return `${faixaTitulo} - ${rotulo}.mp3`.replace(/[\\/:*?"<>|]/g, "_");
}

export function ListaVersoes({ faixa, versoes }: { faixa: Faixa; versoes: VersaoFaixa[] }) {
  const { versaoAtual, playing, tocar, toggle } = usePlayer();
  if (versoes.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold">
        Versões <span className="font-normal text-muted">({versoes.length})</span>
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
        {versoes.map((v) => {
          const ativa = versaoAtual?.id === v.id;
          const tocandoEsta = ativa && playing;
          return (
            <li
              key={v.id}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${ativa ? "bg-surface2/60" : ""}`}
            >
              <button
                type="button"
                onClick={() => (ativa ? toggle() : tocar(v, faixa.titulo, versoes))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-accent transition-colors hover:bg-surface2 hover:border-accent/40"
                aria-label={`${tocandoEsta ? "Pausar" : "Tocar"} ${v.rotulo}`}
              >
                {tocandoEsta ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{v.rotulo}</p>
                <p className="text-xs text-muted">{labelTipoVersao(v.tipo)}</p>
              </div>
              {v.arquivoUrl && (
                <a
                  href={urlDownload(v.arquivoUrl, nomeArquivo(faixa.titulo, v.rotulo))}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-fg"
                  title={`Baixar "${v.rotulo}"`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
