"use client";
// "Definir meu % em massa" — atalho pra não ter que abrir faixa por faixa em
// "Participantes & Split" (components/faixa/SplitsFaixa.tsx) só pra fechar o
// split do artista. É um DEFAULT em lote: continua dando pra refinar depois
// faixa a faixa. Ver app/(app)/splits/massa-actions.ts.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Percent, Users, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  definirSplitEmMassa, type EstadoSplitMassa, type EscopoSplitMassa,
} from "@/app/(app)/splits/massa-actions";

const ESTADO_INICIAL: EstadoSplitMassa = { status: "idle" };

const ESCOPOS: { valor: EscopoSplitMassa; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas as faixas" },
  { valor: "sem_split", rotulo: "Só as sem split ainda" },
  { valor: "feats", rotulo: "Só os feats" },
];

export function DefinirSplitMassa({ artistaId }: { artistaId: string }) {
  const caminho = usePathname();
  const [percentual, setPercentual] = useState("100");
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoSplitMassa, formData: FormData) => definirSplitEmMassa(prev, formData),
    ESTADO_INICIAL,
  );

  return (
    <div className="rounded-lg border border-line bg-surface2/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Users className="h-3.5 w-3.5" aria-hidden />
        Definir meu % em massa
        <span className="font-normal">— aplica um padrão; dá pra ajustar depois faixa a faixa.</span>
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="artistaId" value={artistaId} />
        <input type="hidden" name="caminho" value={caminho} />
        <Field label="Meu %" className="w-24">
          <div className="relative">
            <Input
              name="percentual"
              type="number"
              min={0}
              max={100}
              step="0.01"
              inputMode="decimal"
              required
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              className="pr-7"
            />
            <Percent className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          </div>
        </Field>
        <Field label="Em quais faixas" className="w-48">
          <Select name="escopo" defaultValue="sem_split">
            {ESCOPOS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </Select>
        </Field>
        <Button type="submit" variant="outline" size="sm" disabled={pendente}>
          {pendente ? "Aplicando..." : "Aplicar"}
        </Button>
        {estado.status === "ok" && (
          <p className="flex w-full items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {estado.message}
          </p>
        )}
        {estado.status === "error" && (
          <p className="flex w-full items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {estado.message}
          </p>
        )}
      </form>
    </div>
  );
}
