"use client";
// Inputs opcionais de taxa por plataforma — YouTube (R$/1.000 views),
// Spotify e Deezer (R$/stream) — mesmo padrão do antigo FiltroRpm: estado
// vive na query string (?ryt=&rsp=&rdz=), não em form/Server Action.
// Aplica no blur/Enter (não a cada tecla) pra não navegar a cada dígito.
// Alimenta a estimativa de receita por plataforma (ver lib/estimativa.ts)
// para faixas sem receita real importada naquela plataforma — o antigo
// ?rpm= (só YouTube) é substituído por ?ryt= assim que o usuário confirma
// qualquer taxa aqui.
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

type ChaveTaxa = "ryt" | "rsp" | "rdz";

const CAMPOS: { chave: ChaveTaxa; rotulo: string }[] = [
  { chave: "ryt", rotulo: "YouTube R$/1k views" },
  { chave: "rsp", rotulo: "Spotify R$/stream" },
  { chave: "rdz", rotulo: "Deezer R$/stream" },
];

export function FiltroTaxas({ ryt, rsp, rdz }: { ryt: number; rsp: number; rdz: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [valores, setValores] = useState<Record<ChaveTaxa, string>>({
    ryt: String(ryt), rsp: String(rsp), rdz: String(rdz),
  });
  // Voltar/avançar do browser muda a query sem remontar o componente —
  // re-sincroniza os inputs quando as props (derivadas da URL) mudam.
  const [propsAnteriores, setPropsAnteriores] = useState({ ryt, rsp, rdz });
  if (propsAnteriores.ryt !== ryt || propsAnteriores.rsp !== rsp || propsAnteriores.rdz !== rdz) {
    setPropsAnteriores({ ryt, rsp, rdz });
    setValores({ ryt: String(ryt), rsp: String(rsp), rdz: String(rdz) });
  }

  function aplicar(chave: ChaveTaxa) {
    const proximos = new URLSearchParams(params.toString());
    const numero = Number(valores[chave].trim().replace(",", "."));
    if (valores[chave].trim() && Number.isFinite(numero) && numero > 0) {
      proximos.set(chave, String(numero));
    } else {
      proximos.delete(chave);
    }
    // ?rpm= (filtro antigo, só YouTube) sai da URL assim que qualquer taxa
    // aqui é confirmada — ryt passa a ser a única fonte da verdade.
    proximos.delete("rpm");
    const query = proximos.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted">
        <Calculator className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Taxas est.
      </span>
      {CAMPOS.map((c) => (
        <Field
          key={c.chave}
          label={c.rotulo}
          className="flex-none flex-col gap-1 whitespace-nowrap text-xs text-muted sm:flex-row sm:items-center sm:gap-1.5"
        >
          <Input
            id={c.chave}
            inputMode="decimal"
            value={valores[c.chave]}
            onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
            onBlur={() => aplicar(c.chave)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); aplicar(c.chave); }
            }}
            className="w-full sm:w-20"
          />
        </Field>
      ))}
    </div>
  );
}
