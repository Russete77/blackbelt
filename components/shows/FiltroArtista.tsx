"use client";
// Filtro por artista da agenda do selo — navega via query string (?artista=)
// para o filtro acontecer no servidor e a URL ser compartilhável.
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
        router.replace(id ? `/shows?artista=${id}` : "/shows");
      }}
    >
      <option value="">Todos os artistas</option>
      {artistas.map((a) => (
        <option key={a.id} value={a.id}>{a.nome}</option>
      ))}
    </Select>
  );
}
