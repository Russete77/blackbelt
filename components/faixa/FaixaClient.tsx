"use client";
import { useState } from "react";
import { AutoPlay } from "@/components/faixa/AutoPlay";
import { Waveform } from "@/components/player/Waveform";
import { usePlayer } from "@/components/player/PlayerContext";
import { CommentPin } from "@/components/faixa/CommentPin";
import { ListaComentarios } from "@/components/faixa/ListaComentarios";
import { UploadVersao } from "@/components/faixa/UploadVersao";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { NovoComentario } from "@/components/faixa/NovoComentario";
import { Button } from "@/components/ui/Button";
import { MessageSquarePlus, Music } from "lucide-react";
import { labelEstagio } from "@/lib/labels";
import type { Comentario, Faixa, VersaoFaixa } from "@/types/domain";

interface FaixaClientProps {
  faixa: Faixa;
  versoes: VersaoFaixa[];
  comentariosPorVersao: Record<string, Comentario[]>;
  // Calculado no servidor (app_metadata.role do JWT) — mostra o botão de apagar.
  isAdmin?: boolean;
}

export function FaixaClient({ faixa, versoes, comentariosPorVersao, isAdmin = false }: FaixaClientProps) {
  const ultimaVersao = versoes[versoes.length - 1];
  const { versaoAtual, duracao, tempoAtual } = usePlayer();
  // Tempo (s) capturado pelo clique na onda ou pelo playhead — abre o form.
  const [tsComentario, setTsComentario] = useState<number | null>(null);
  // Com zoom, a onda rola horizontalmente e os pinos (posição em %) desalinham
  // — escondemos até voltar ao ajuste automático.
  const [zoomAtivo, setZoomAtivo] = useState(false);
  const versaoExibida = versaoAtual?.faixaId === faixa.id ? versaoAtual : ultimaVersao;
  const comentarios = versaoExibida ? (comentariosPorVersao[versaoExibida.id] ?? []) : [];

  const capa = faixa.capaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={faixa.capaUrl}
      alt={`Capa de ${faixa.titulo}`}
      className="h-16 w-16 shrink-0 rounded-md object-cover"
    />
  ) : (
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-surface2">
      <Music className="h-6 w-6 text-muted" aria-hidden />
    </div>
  );

  if (!ultimaVersao) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          {capa}
          <div>
            <h1 className="text-2xl font-bold">{faixa.titulo}</h1>
            <p className="text-muted text-sm">
              {faixa.genero} · {labelEstagio(faixa.estagio)}
            </p>
            <CapaUploader tipo="faixa" id={faixa.id} rotulo="Capa" className="mt-1 inline-block" />
          </div>
        </div>
        <p className="text-sm text-muted mb-4">Nenhuma versão enviada ainda para esta faixa.</p>
        <UploadVersao faixaId={faixa.id} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <AutoPlay versao={ultimaVersao} faixaTitulo={faixa.titulo} versoesIrmas={versoes} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {capa}
          <div>
            <h1 className="text-2xl font-bold">{faixa.titulo}</h1>
            <p className="text-muted text-sm">
              {faixa.genero} · {labelEstagio(faixa.estagio)} · {versaoExibida.rotulo}
            </p>
            <CapaUploader tipo="faixa" id={faixa.id} rotulo="Capa" className="mt-1 inline-block" />
          </div>
        </div>
        <UploadVersao faixaId={faixa.id} />
      </div>

      <div className="relative mb-2">
        <div className="relative pt-3">
          {!zoomAtivo && comentarios.map((c) => (
            <CommentPin key={c.id} comentario={c} duracao={duracao || versaoExibida.duracaoSegundos} />
          ))}
          <Waveform
            versaoId={versaoExibida.id}
            arquivoUrl={versaoExibida.arquivoUrl}
            height={112}
            onInteraction={(segundos) => setTsComentario(segundos)}
            onZoomAtivo={setZoomAtivo}
          />
        </div>
      </div>
      <p className="text-xs text-muted mb-6">
        Clique na onda para navegar e comentar naquele ponto. Os pinos dourados são comentários.
      </p>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Comentários</h2>
        <Button variant="outline" size="sm" onClick={() => setTsComentario(tempoAtual)}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          Adicionar comentário aqui
        </Button>
      </div>
      {tsComentario !== null && (
        <div className="mb-4">
          <NovoComentario
            versaoId={versaoExibida.id}
            timestampSegundos={tsComentario}
            onFechar={() => setTsComentario(null)}
          />
        </div>
      )}
      <ListaComentarios comentarios={comentarios} isAdmin={isAdmin} />
    </div>
  );
}
