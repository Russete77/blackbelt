"use client";
// Wrapper client-only do botão "Novo documento": Server Components não
// podem passar funções (a render prop `trigger` de DocumentoFormModal) para
// Client Components — só dados serializáveis. Mesmo padrão de
// components/lancamentos/NovoLancamentoButton.tsx.
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentoFormModal } from "./DocumentoFormModal";

export function NovoDocumentoButton({ artistaId }: { artistaId: string }) {
  return (
    <DocumentoFormModal
      artistaId={artistaId}
      trigger={(abrir) => (
        <Button variant="outline" size="sm" onClick={abrir}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo documento
        </Button>
      )}
    />
  );
}
