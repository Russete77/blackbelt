"use client";
// Error boundary do grupo autenticado: falha do Supabase (indisponibilidade,
// RLS negando, id inválido) cai aqui em vez do error screen genérico do Next.
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na rota autenticada:", error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold">Algo deu errado por aqui</h2>
        <p className="mb-6 max-w-sm text-sm text-muted">
          Não conseguimos carregar esta tela. Pode ser uma instabilidade
          momentânea — tente de novo.
        </p>
        <Button onClick={reset} size="sm">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
