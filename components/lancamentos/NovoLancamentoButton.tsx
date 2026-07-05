"use client";
// Wrapper client-only do botão "Novo lançamento": Server Components não
// podem passar funções (a render prop `trigger` de LancamentoFormModal) para
// Client Components — só dados serializáveis. Este wrapper existe só para
// montar essa função do lado do cliente; a página (Server Component) passa
// apenas dados simples (artistaId, faixas).
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LancamentoFormModal } from "./LancamentoFormModal";
import type { Faixa } from "@/types/domain";

export function NovoLancamentoButton({ artistaId, faixas }: { artistaId: string; faixas: Faixa[] }) {
  return (
    <LancamentoFormModal
      artistaId={artistaId}
      faixas={faixas}
      trigger={(abrir) => (
        <Button variant="outline" size="sm" onClick={abrir}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo lançamento
        </Button>
      )}
    />
  );
}
