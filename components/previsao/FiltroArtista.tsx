"use client";
// Filtro por artista da Previsão de Lançamentos — mesmo padrão de
// components/shows/FiltroArtista.tsx e components/analytics/FiltroAnalytics.tsx:
// navega via query string (?artista=) pro filtro acontecer no servidor e a
// URL ficar compartilhável.
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import type { Artista } from "@/types/domain";

export function FiltroArtista({ artistas }: { artistas: Artista[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params.get("artista") ?? "";

  return (
    <Select
      aria-label="Filtrar por artista"
      value={atual}
      onChange={(e) => {
        const id = e.target.value;
        router.replace(id ? `/previsao?artista=${id}` : "/previsao");
      }}
    >
      <option value="">Todos os artistas</option>
      {artistas.map((a) => (
        <option key={a.id} value={a.id}>{a.nome}</option>
      ))}
    </Select>
  );
}
