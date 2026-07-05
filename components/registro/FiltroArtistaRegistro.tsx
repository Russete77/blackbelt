"use client";
// Filtro por artista da lista de Registro — navega via query string
// (?artista=) pro filtro acontecer no servidor, mesmo padrão de
// components/shows/FiltroArtista.tsx (componente próprio pra não editar o
// de Shows, que é hardcoded pra /shows).
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import type { Artista } from "@/types/domain";

export function FiltroArtistaRegistro({ artistas }: { artistas: Artista[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params.get("artista") ?? "";

  return (
    <Select
      aria-label="Filtrar por artista"
      value={atual}
      onChange={(e) => {
        const id = e.target.value;
        router.replace(id ? `/registro?artista=${id}` : "/registro");
      }}
    >
      <option value="">Todos os artistas</option>
      {artistas.map((a) => (
        <option key={a.id} value={a.id}>{a.nome}</option>
      ))}
    </Select>
  );
}
