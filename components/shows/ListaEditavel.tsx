"use client";
// Lista editável de textos usada nos riders (backline, alimentação, bebidas,
// itens de camarim): linhas com input + remover, e botão de adicionar.
// Controlada pelo pai — o formulário serializa tudo em JSON no submit.
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ListaEditavel({
  rotulo, itens, onChange, placeholder,
}: {
  rotulo: string;
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
      {rotulo}
      <div className="flex flex-col gap-2">
        {itens.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              aria-label={`${rotulo} — item ${i + 1}`}
              onChange={(e) => onChange(itens.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <button
              type="button"
              aria-label={`Remover item ${i + 1} de ${rotulo}`}
              onClick={() => onChange(itens.filter((_, j) => j !== i))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted transition-colors duration-200 hover:bg-surface2 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...itens, ""])}>
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
