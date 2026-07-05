"use client";
import { useEffect } from "react";
import { usePlayer } from "@/components/player/PlayerContext";
import type { VersaoFaixa } from "@/types/domain";

export function AutoPlay({ versao }: { versao: VersaoFaixa }) {
  const { tocar } = usePlayer();
  useEffect(() => { tocar(versao); }, [versao, tocar]);
  return null;
}
