"use client";
import { AutoPlay } from "@/components/faixa/AutoPlay";
import { Waveform } from "@/components/player/Waveform";
import { usePlayer } from "@/components/player/PlayerContext";
import { CommentPin } from "@/components/faixa/CommentPin";
import { ListaComentarios } from "@/components/faixa/ListaComentarios";
import { UploadVersao } from "@/components/faixa/UploadVersao";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { Music } from "lucide-react";
import { labelEstagio } from "@/lib/labels";
import type { Comentario, Faixa, VersaoFaixa } from "@/types/domain";

interface FaixaClientProps {
  faixa: Faixa;
  versoes: VersaoFaixa[];
  comentariosPorVersao: Record<string, Comentario[]>;
}

export function FaixaClient({ faixa, versoes, comentariosPorVersao }: FaixaClientProps) {
  const ultimaVersao = versoes[versoes.length - 1];
  const { versaoAtual, duracao } = usePlayer();
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
          {comentarios.map((c) => (
            <CommentPin key={c.id} comentario={c} duracao={duracao || versaoExibida.duracaoSegundos} />
          ))}
          <Waveform versaoId={versaoExibida.id} arquivoUrl={versaoExibida.arquivoUrl} height={112} />
        </div>
      </div>
      <p className="text-xs text-muted mb-6">Clique na onda para navegar. Os pinos dourados são comentários.</p>

      <h2 className="text-lg font-semibold mb-3">Comentários</h2>
      <ListaComentarios comentarios={comentarios} />
    </div>
  );
}
