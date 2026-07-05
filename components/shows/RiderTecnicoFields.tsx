"use client";
// Seção editável do rider técnico dentro do formulário de show.
// Controlada pelo pai (ShowForm), que serializa o objeto em JSON no submit.
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ListaEditavel } from "@/components/shows/ListaEditavel";
import type { RiderInput, RiderTecnico } from "@/types/shows";

export function RiderTecnicoFields({
  valor, onChange,
}: { valor: RiderTecnico; onChange: (v: RiderTecnico) => void }) {
  const setInputs = (inputs: RiderInput[]) => onChange({ ...valor, inputs });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="P.A.">
          <Input
            value={valor.pa}
            placeholder="Ex.: line array, mínimo 10 kW"
            onChange={(e) => onChange({ ...valor, pa: e.target.value })}
          />
        </Field>
        <Field label="Monitores">
          <Input
            value={valor.monitores}
            placeholder="Ex.: 4 monitores de chão + 2 in-ears"
            onChange={(e) => onChange({ ...valor, monitores: e.target.value })}
          />
        </Field>
      </div>

      <ListaEditavel
        rotulo="Backline"
        itens={valor.backline}
        placeholder="Ex.: bateria completa, amp de guitarra..."
        onChange={(backline) => onChange({ ...valor, backline })}
      />

      {/* Mapa de canais: canal / fonte / microfone por linha */}
      <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
        Inputs / canais
        <div className="flex flex-col gap-2">
          {valor.inputs.length > 0 && (
            <div className="grid grid-cols-[3.5rem_1fr_1fr_2.75rem] gap-2 text-[11px] uppercase tracking-wide">
              <span>Canal</span><span>Fonte</span><span>Microfone</span><span aria-hidden />
            </div>
          )}
          {valor.inputs.map((linha, i) => (
            <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr_2.75rem] items-center gap-2">
              <Input
                value={linha.canal}
                aria-label={`Canal da linha ${i + 1}`}
                placeholder={String(i + 1)}
                className="px-2 text-center"
                onChange={(e) => setInputs(valor.inputs.map((v, j) => (j === i ? { ...v, canal: e.target.value } : v)))}
              />
              <Input
                value={linha.fonte}
                aria-label={`Fonte da linha ${i + 1}`}
                placeholder="Ex.: voz principal"
                className="min-w-0"
                onChange={(e) => setInputs(valor.inputs.map((v, j) => (j === i ? { ...v, fonte: e.target.value } : v)))}
              />
              <Input
                value={linha.microfone}
                aria-label={`Microfone da linha ${i + 1}`}
                placeholder="Ex.: SM58 / DI"
                className="min-w-0"
                onChange={(e) => setInputs(valor.inputs.map((v, j) => (j === i ? { ...v, microfone: e.target.value } : v)))}
              />
              <button
                type="button"
                aria-label={`Remover canal ${i + 1}`}
                onClick={() => setInputs(valor.inputs.filter((_, j) => j !== i))}
                className="grid h-11 w-11 place-items-center rounded-md text-muted transition-colors duration-200 hover:bg-surface2 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setInputs([...valor.inputs, { canal: String(valor.inputs.length + 1), fonte: "", microfone: "" }])}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar canal
          </Button>
        </div>
      </div>

      <Field label="Observações">
        <Textarea
          rows={3}
          value={valor.observacoes}
          placeholder="Ex.: passagem de som às 16h; técnico da casa disponível."
          onChange={(e) => onChange({ ...valor, observacoes: e.target.value })}
        />
      </Field>
    </div>
  );
}
