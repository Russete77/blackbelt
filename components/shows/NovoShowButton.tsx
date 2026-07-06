"use client";
// Botão "Novo show": abre o ShowFormModal. Wrapper client-only porque Server
// Components não podem passar funções (a render prop `trigger`) para Client
// Components — só dados serializáveis. Mesmo padrão de
// components/clipes/NovoClipeButton.tsx. Substitui o antigo link para
// /shows/novo (agora sem rota própria).
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShowFormModal } from "@/components/shows/ShowFormModal";
import type { Artista } from "@/types/domain";

export function NovoShowButton({
  artistas, artistaId, size = "md",
}: { artistas: Artista[]; artistaId?: string; size?: "sm" | "md" }) {
  return (
    <ShowFormModal
      artistas={artistas}
      artistaIdInicial={artistaId}
      trigger={(abrir) => (
        <Button type="button" size={size} onClick={abrir}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo show
        </Button>
      )}
    />
  );
}
