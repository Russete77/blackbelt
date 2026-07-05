"use client";
// Input opcional "RPM (R$/1.000 views)" — mesmo padrão de FiltroAnalytics
// (estado vive na query string, não em um form/Server Action): quando
// informado, o servidor estima receita para faixas sem receita real
// importada mas com streams (típico do YouTube, que só entrega views).
// Aplica no blur/Enter (não a cada tecla) para não navegar a cada dígito.
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function FiltroRpm({ rpmAtual }: { rpmAtual?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(rpmAtual != null && rpmAtual > 0 ? String(rpmAtual) : "");

  function aplicar() {
    const proximos = new URLSearchParams(params.toString());
    const numero = Number(valor.trim().replace(",", "."));
    if (valor.trim() && Number.isFinite(numero) && numero > 0) {
      proximos.set("rpm", String(numero));
    } else {
      proximos.delete("rpm");
    }
    const query = proximos.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="rpm" className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted">
        <Calculator className="h-3.5 w-3.5 shrink-0" aria-hidden />
        RPM (R$/1k views)
      </label>
      <Input
        id="rpm"
        inputMode="decimal"
        placeholder="ex: 1,50"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={aplicar}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); aplicar(); }
        }}
        className="w-24"
      />
    </div>
  );
}
