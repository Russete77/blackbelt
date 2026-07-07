"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AutoPlay } from "@/components/faixa/AutoPlay";
import { Waveform } from "@/components/player/Waveform";
import { usePlayer } from "@/components/player/PlayerContext";
import { ListaComentarios } from "@/components/faixa/ListaComentarios";
import { UploadVersao } from "@/components/faixa/UploadVersao";
import { SepararStems } from "@/components/faixa/SepararStems";
import { ListaVersoes } from "@/components/faixa/ListaVersoes";
import { GerarRoteiro } from "@/components/faixa/GerarRoteiro";
import { CapaUploader } from "@/components/capa/CapaUploader";
import { VincularYoutube } from "@/components/faixa/VincularYoutube";
import { NovoComentario } from "@/components/faixa/NovoComentario";
import { SplitsFaixa } from "@/components/faixa/SplitsFaixa";
import { Button } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowLeft, MessageSquarePlus, Music } from "lucide-react";
import { labelEstagio } from "@/lib/labels";
import type { Comentario, Faixa, VersaoFaixa } from "@/types/domain";
import type { SplitFaixa } from "@/lib/db";

interface FaixaClientProps {
  faixa: Faixa;
  versoes: VersaoFaixa[];
  comentariosPorVersao: Record<string, Comentario[]>;
  // Calculado no servidor (app_metadata.role do JWT) — mostra o botão de apagar.
  isAdmin?: boolean;
  splits: SplitFaixa[];
  artistas: { id: string; nome: string }[];
}

export function FaixaClient({
  faixa, versoes, comentariosPorVersao, isAdmin = false, splits, artistas,
}: FaixaClientProps) {
  const router = useRouter();
  const ultimaVersao = versoes[versoes.length - 1];
  const { versaoAtual, tempoAtual } = usePlayer();
  // Tempo (s) do comentário em edição — só é aberto pelo botão "Adicionar
  // comentário aqui"; arrastar a onda apenas reposiciona um form já aberto.
  // Guarda junto a versão a que pertence: trocar de versão descarta o form
  // (senão o comentário iria para a versão errada, com timestamp herdado).
  const [comentarioPendente, setComentarioPendente] =
    useState<{ versaoId: string; ts: number } | null>(null);
  const versaoExibida = versaoAtual?.faixaId === faixa.id ? versaoAtual : ultimaVersao;
  const comentarios = versaoExibida ? (comentariosPorVersao[versaoExibida.id] ?? []) : [];
  const tsComentario =
    comentarioPendente && comentarioPendente.versaoId === versaoExibida?.id
      ? comentarioPendente.ts
      : null;

  const capa = <Cover src={faixa.capaUrl} alt={`Capa de ${faixa.titulo}`} icon={Music} size="md" />;
  const voltar = (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Voltar
    </button>
  );

  if (!ultimaVersao) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        {voltar}
        <div className="mb-6 flex items-center gap-4">
          {capa}
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl uppercase tracking-tight md:text-3xl">{faixa.titulo}</h1>
            <p className="text-sm text-muted">
              {[faixa.genero, labelEstagio(faixa.estagio)].filter(Boolean).join(" · ")}
            </p>
            <CapaUploader tipo="faixa" id={faixa.id} rotulo="Capa" className="mt-1.5 inline-block" />
            <VincularYoutube faixaId={faixa.id} youtubeVideoId={faixa.youtubeVideoId} />
          </div>
        </div>
        <EmptyState
          icon={Music}
          title="Nenhuma versão enviada ainda para esta faixa."
          hint="Suba um beat, vocal, mix ou master para começar a colaborar."
          className="mb-4"
        />
        <UploadVersao faixaId={faixa.id} />
        <div className="mt-6">
          <SplitsFaixa faixaId={faixa.id} artistas={artistas} participantesIniciais={splits} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <AutoPlay versao={ultimaVersao} faixaTitulo={faixa.titulo} versoesIrmas={versoes} />
      {voltar}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-in-up">
        <div className="flex items-center gap-4">
          {capa}
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl uppercase tracking-tight md:text-3xl">{faixa.titulo}</h1>
            <p className="truncate text-sm text-muted">
              {[faixa.genero, labelEstagio(faixa.estagio), versaoExibida.rotulo]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <CapaUploader tipo="faixa" id={faixa.id} rotulo="Capa" className="mt-1.5 inline-block" />
            <VincularYoutube faixaId={faixa.id} youtubeVideoId={faixa.youtubeVideoId} />
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <GerarRoteiro faixaId={faixa.id} faixaTitulo={faixa.titulo} />
          {/* Stems só de uma versão "cheia" — não faz sentido separar um stem. */}
          {!versaoExibida.arquivoPath?.startsWith(`${faixa.id}/stems/`) && (
            <SepararStems versaoId={versaoExibida.id} rotulo={versaoExibida.rotulo} />
          )}
          <UploadVersao faixaId={faixa.id} />
        </div>
      </div>

      <div className="relative mb-2">
        <div className="relative pt-3">
          <Waveform
            versaoId={versaoExibida.id}
            arquivoUrl={versaoExibida.arquivoUrl}
            comentarios={comentarios}
            height={112}
            onInteraction={(segundos) =>
              // Só reposiciona um comentário JÁ aberto (arrastar enquanto edita);
              // clicar/arrastar pra navegar não deve abrir o form sozinho — quem
              // abre é o botão explícito "Adicionar comentário aqui" abaixo.
              setComentarioPendente((atual) =>
                atual && atual.versaoId === versaoExibida.id
                  ? { versaoId: versaoExibida.id, ts: segundos }
                  : atual)}
          />
        </div>
      </div>
      <p className="mb-6 text-xs text-muted">
        Clique na onda para navegar. Os pinos dourados são comentários.
      </p>

      <ListaVersoes faixa={faixa} versoes={versoes} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Comentários</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setComentarioPendente({ versaoId: versaoExibida.id, ts: tempoAtual })}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          Adicionar comentário aqui
        </Button>
      </div>
      {tsComentario !== null && (
        <div className="mb-4">
          <NovoComentario
            versaoId={versaoExibida.id}
            timestampSegundos={tsComentario}
            onFechar={() => setComentarioPendente(null)}
          />
        </div>
      )}
      <ListaComentarios comentarios={comentarios} isAdmin={isAdmin} />

      <div className="mt-6">
        <SplitsFaixa faixaId={faixa.id} artistas={artistas} participantesIniciais={splits} />
      </div>
    </div>
  );
}
