"use client";
// Wrapper client-only do botão "Novo clipe": Server Components não podem
// passar funções (a render prop `trigger` de ClipeFormModal) para Client
// Components — só dados serializáveis. Mesmo padrão de
// components/lancamentos/NovoLancamentoButton.tsx.
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClipeFormModal } from "./ClipeFormModal";
import type { Faixa } from "@/types/domain";

export function NovoClipeButton({ artistaId, faixas }: { artistaId: string; faixas: Faixa[] }) {
  return (
    <ClipeFormModal
      artistaId={artistaId}
      faixas={faixas}
      trigger={(abrir) => (
        <Button variant="outline" size="sm" onClick={abrir}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo clipe
        </Button>
      )}
    />
  );
}
