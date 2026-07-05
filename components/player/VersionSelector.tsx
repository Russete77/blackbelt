"use client";
import { usePlayer } from "./PlayerContext";
import { getVersoesDaFaixa } from "@/mock/data";
import { labelTipoVersao } from "@/lib/labels";

export function VersionSelector() {
  const { versaoAtual, tocar } = usePlayer();
  if (!versaoAtual) return null;
  const versoes = getVersoesDaFaixa(versaoAtual.faixaId);
  if (versoes.length < 2) return null;
  return (
    <select
      aria-label="Versão"
      value={versaoAtual.id}
      onChange={(e) => {
        const v = versoes.find((x) => x.id === e.target.value);
        if (v) tocar(v);
      }}
      className="bg-surface2 text-xs rounded-md px-2 py-1 border border-line"
    >
      {versoes.map((v) => (
        <option key={v.id} value={v.id}>{labelTipoVersao(v.tipo)} — {v.rotulo}</option>
      ))}
    </select>
  );
}
