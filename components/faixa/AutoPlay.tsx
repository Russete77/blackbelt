"use client";
import { useEffect } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import type { VersaoFaixa } from "@/types/domain";

export function AutoPlay({
  versao, faixaTitulo, versoesIrmas,
}: { versao: VersaoFaixa; faixaTitulo: string; versoesIrmas: VersaoFaixa[] }) {
  const { tocar } = usePlayer();
  useEffect(() => {
    tocar(versao, faixaTitulo, versoesIrmas);
  }, [versao, faixaTitulo, versoesIrmas, tocar]);
  return null;
}
