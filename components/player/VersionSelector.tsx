"use client";
import { usePlayer } from "./PlayerContext";
import { labelTipoVersao } from "@/lib/labels";

export function VersionSelector() {
  const { versaoAtual, versoesIrmas, faixaTitulo, tocar } = usePlayer();
  if (!versaoAtual) return null;
  if (versoesIrmas.length < 2) return null;
  return (
    <select
      aria-label="Versão"
      value={versaoAtual.id}
      onChange={(e) => {
        const v = versoesIrmas.find((x) => x.id === e.target.value);
        if (v) tocar(v, faixaTitulo, versoesIrmas);
      }}
      className="h-9 max-w-[7rem] rounded-md border border-line bg-surface2 px-2 text-xs text-fg outline-none transition-colors duration-200 focus:border-accent sm:max-w-none"
    >
      {versoesIrmas.map((v) => (
        <option key={v.id} value={v.id}>{labelTipoVersao(v.tipo)} — {v.rotulo}</option>
      ))}
    </select>
  );
}
