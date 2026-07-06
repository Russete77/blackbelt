"use client";
// Lista dinâmica de "linhas" com múltiplos campos (autores, intérpretes,
// músicos, cue sheet) — generaliza components/shows/ListaEditavel.tsx (que
// só suporta um campo de texto por linha) pros formulários de Registro.
// Controlada pelo pai — o formulário serializa tudo em JSON no submit.
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ListaLinhasEditavel<T>({
  rotulo, itens, onChange, novoItem, renderLinha, vazio,
}: {
  rotulo: string;
  itens: T[];
  onChange: (itens: T[]) => void;
  novoItem: () => T;
  renderLinha: (item: T, atualizar: (patch: Partial<T>) => void, indice: number) => React.ReactNode;
  vazio?: string;
}) {
  function atualizar(indice: number, patch: Partial<T>) {
    onChange(itens.map((item, i) => (i === indice ? { ...item, ...patch } : item)));
  }
  function remover(indice: number) {
    onChange(itens.filter((_, i) => i !== indice));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">{rotulo}</span>
      {itens.length === 0 && vazio && <p className="text-xs text-muted">{vazio}</p>}
      <div className="flex flex-col gap-2">
        {itens.map((item, i) => (
          <div
            key={i}
            className="flex flex-wrap items-start gap-2 rounded-md border border-line bg-surface2/40 p-2"
          >
            <div className="flex flex-1 flex-wrap gap-2">{renderLinha(item, (patch) => atualizar(i, patch), i)}</div>
            <button
              type="button"
              aria-label={`Remover linha ${i + 1} de ${rotulo}`}
              onClick={() => remover(i)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted transition-colors duration-200 hover:bg-surface2 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...itens, novoItem()])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Adicionar
      </Button>
    </div>
  );
}
