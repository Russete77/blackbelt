"use client";
// Seção editável do rider de camarim dentro do formulário de show.
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ListaEditavel } from "@/components/shows/ListaEditavel";
import type { RiderCamarim } from "@/types/shows";

export function RiderCamarimFields({
  valor, onChange,
}: { valor: RiderCamarim; onChange: (v: RiderCamarim) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nº de pessoas" className="sm:max-w-40">
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          value={valor.pessoas ?? ""}
          placeholder="Ex.: 6"
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ ...valor, pessoas: e.target.value !== "" && Number.isFinite(n) && n > 0 ? Math.floor(n) : null });
          }}
        />
      </Field>

      <ListaEditavel
        rotulo="Alimentação"
        itens={valor.alimentacao}
        placeholder="Ex.: frutas frescas, refeição quente para 6..."
        onChange={(alimentacao) => onChange({ ...valor, alimentacao })}
      />
      <ListaEditavel
        rotulo="Bebidas"
        itens={valor.bebidas}
        placeholder="Ex.: água sem gás (12), energético..."
        onChange={(bebidas) => onChange({ ...valor, bebidas })}
      />
      <ListaEditavel
        rotulo="Itens"
        itens={valor.itens}
        placeholder="Ex.: toalhas pretas (8), espelho, arara..."
        onChange={(itens) => onChange({ ...valor, itens })}
      />

      <Field label="Observações">
        <Textarea
          rows={3}
          value={valor.observacoes}
          placeholder="Ex.: camarim exclusivo, com ar-condicionado e banheiro privativo."
          onChange={(e) => onChange({ ...valor, observacoes: e.target.value })}
        />
      </Field>
    </div>
  );
}
