"use client";
// Botão "Editar" do detalhe do show: abre o ShowFormModal pré-preenchido.
// Wrapper client-only pelo mesmo motivo de NovoShowButton. Substitui o
// antigo link para /shows/[id]/editar (agora sem rota própria).
import { Pencil } from "lucide-react";
import { ShowFormModal } from "@/components/shows/ShowFormModal";
import type { Artista } from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";

export function EditarShowButton({ artistas, show }: { artistas: Artista[]; show: ShowDetalhado }) {
  return (
    <ShowFormModal
      artistas={artistas}
      show={show}
      trigger={(abrir) => (
        <button
          type="button"
          onClick={abrir}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium text-fg transition-all duration-200 hover:border-accent/40 hover:bg-surface2"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </button>
      )}
    />
  );
}
