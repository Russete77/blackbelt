"use client";
import { useEffect } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import type { VersaoFaixa } from "@/types/domain";

// Registra a faixa no player global ao abrir a página (não dá play — políticas
// de autoplay dos browsers exigem gesto do usuário).
//
// Importante: router.refresh() (salvar comentário, subir versão, trocar capa)
// re-renderiza o Server Component e as props chegam com identidade nova, o que
// re-dispara o efeito. Se o player já está nesta faixa, só atualizamos o
// título/versões-irmãs — sem derrubar a versão que o usuário escolheu ouvir.
export function AutoPlay({
  versao, faixaTitulo, versoesIrmas,
}: { versao: VersaoFaixa; faixaTitulo: string; versoesIrmas: VersaoFaixa[] }) {
  const { versaoAtual, tocar, atualizarContexto } = usePlayer();
  const jaNestaFaixa = versaoAtual?.faixaId === versao.faixaId;
  useEffect(() => {
    if (jaNestaFaixa) {
      atualizarContexto(faixaTitulo, versoesIrmas);
    } else {
      tocar(versao, faixaTitulo, versoesIrmas);
    }
  }, [jaNestaFaixa, versao, faixaTitulo, versoesIrmas, tocar, atualizarContexto]);
  return null;
}
