"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { faixas, getVersoesDaFaixa, getComentariosDaVersao } from "@/mock/data";
import { Waveform } from "@/components/player/Waveform";
import { usePlayer } from "@/components/player/PlayerContext";
import { AutoPlay } from "@/components/faixa/AutoPlay";
import { ListaComentarios } from "@/components/faixa/ListaComentarios";
import { CommentPin } from "@/components/faixa/CommentPin";
import { labelEstagio } from "@/lib/labels";

export default function FaixaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const faixa = faixas.find((f) => f.id === id);
  if (!faixa) return notFound();

  const versoes = getVersoesDaFaixa(faixa.id);
  const { versaoAtual, duracao } = usePlayer();
  const versaoExibida = versaoAtual?.faixaId === faixa.id ? versaoAtual : versoes[versoes.length - 1];
  const comentarios = getComentariosDaVersao(versaoExibida.id);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <AutoPlay versao={versoes[versoes.length - 1]} />
      <h1 className="text-2xl font-bold">{faixa.titulo}</h1>
      <p className="text-muted text-sm mb-6">
        {faixa.genero} · {labelEstagio(faixa.estagio)} · {versaoExibida.rotulo}
      </p>

      <div className="relative mb-2">
        <div className="relative pt-3">
          {comentarios.map((c) => (
            <CommentPin key={c.id} comentario={c} duracao={duracao || versaoExibida.duracaoSegundos} />
          ))}
          <Waveform versaoId={versaoExibida.id} height={112} />
        </div>
      </div>
      <p className="text-xs text-muted mb-6">Clique na onda para navegar. Os pinos dourados são comentários.</p>

      <h2 className="text-lg font-semibold mb-3">Comentários</h2>
      <ListaComentarios comentarios={comentarios} />
    </div>
  );
}
