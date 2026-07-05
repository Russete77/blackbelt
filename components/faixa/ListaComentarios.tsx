"use client";
// Lista de comentários da versão, com controles de editar / resolver / apagar.
// Edição e toggle passam por Server Actions (RLS aplica); apagar só aparece
// para admin (isAdmin vem do servidor, via JWT — ver faixa/[id]/page.tsx).
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import { formatTempo } from "@/components/player/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  alternarResolvido, editarComentario, excluirComentario, type EstadoAcao,
} from "@/app/(app)/actions";
import { cn } from "@/lib/cn";
import type { CategoriaComentario, Comentario, Prioridade } from "@/types/domain";

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };
const CATEGORIAS: CategoriaComentario[] = ["geral", "beat", "mix", "master", "letra"];
const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const LABEL_CATEGORIA: Record<CategoriaComentario, string> = {
  geral: "Geral", beat: "Beat", mix: "Mix", master: "Master", letra: "Letra",
};
const LABEL_PRIORIDADE: Record<Prioridade, string> = {
  alta: "Alta", media: "Média", baixa: "Baixa",
};

export function ListaComentarios({
  comentarios, isAdmin = false,
}: { comentarios: Comentario[]; isAdmin?: boolean }) {
  if (comentarios.length === 0) {
    return <p className="text-sm text-muted">Nenhum comentário nesta versão ainda.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {comentarios.map((c) => (
        <ItemComentario key={c.id} comentario={c} isAdmin={isAdmin} />
      ))}
    </ul>
  );
}

function ItemComentario({ comentario: c, isAdmin }: { comentario: Comentario; isAdmin: boolean }) {
  const { seek } = usePlayer();
  const caminho = usePathname();
  const [editando, setEditando] = useState(false);

  // Envolve a Server Action para fechar o form de edição no sucesso.
  const [estadoEdicao, editarAction, editandoPendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await editarComentario(prev, formData);
      if (resultado.status === "ok") setEditando(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );
  const [estadoResolvido, resolvidoAction, resolvidoPendente] =
    useActionState(alternarResolvido, ESTADO_INICIAL);
  const [estadoExclusao, excluirAction, excluindoPendente] =
    useActionState(excluirComentario, ESTADO_INICIAL);

  return (
    <li
      className={cn(
        "rounded-md bg-surface border border-line p-3 transition",
        c.resolvido && !editando && "opacity-60",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <button
          onClick={() => seek(c.timestampSegundos)}
          className="font-mono text-xs text-accent hover:underline"
          title="Ir para este ponto da faixa"
        >
          {formatTempo(c.timestampSegundos)}
        </button>
        <Badge tone={c.prioridade}>{c.prioridade}</Badge>
        <Badge tone="neutral">{c.categoria}</Badge>
        {c.resolvido && <Badge tone="aprovado">resolvido</Badge>}

        <span className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setEditando((v) => !v)}
            aria-label={editando ? "Cancelar edição" : "Editar comentário"}
            title={editando ? "Cancelar edição" : "Editar"}
            className="rounded-md p-1.5 text-muted transition hover:bg-surface2 hover:text-fg"
          >
            {editando
              ? <X className="h-3.5 w-3.5" aria-hidden />
              : <Pencil className="h-3.5 w-3.5" aria-hidden />}
          </button>
          <form action={resolvidoAction} className="contents">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="resolvido" value={String(!c.resolvido)} />
            <input type="hidden" name="caminho" value={caminho} />
            <button
              type="submit"
              disabled={resolvidoPendente}
              aria-label={c.resolvido ? "Reabrir comentário" : "Marcar como resolvido"}
              title={c.resolvido ? "Reabrir" : "Resolver"}
              className={cn(
                "rounded-md p-1.5 transition hover:bg-surface2 disabled:opacity-50",
                c.resolvido ? "text-success" : "text-muted hover:text-fg",
              )}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </button>
          </form>
          {isAdmin && (
            <form action={excluirAction} className="contents">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="caminho" value={caminho} />
              <button
                type="submit"
                disabled={excluindoPendente}
                aria-label="Apagar comentário"
                title="Apagar"
                className="rounded-md p-1.5 text-muted transition hover:bg-surface2 hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </form>
          )}
        </span>
      </div>

      {editando ? (
        <form action={editarAction} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="caminho" value={caminho} />
          <textarea
            name="texto"
            defaultValue={c.texto}
            required
            rows={3}
            className="resize-none rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
              Categoria
              <select
                name="categoria"
                defaultValue={c.categoria}
                className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>{LABEL_CATEGORIA[cat]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
              Prioridade
              <select
                name="prioridade"
                defaultValue={c.prioridade}
                className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{LABEL_PRIORIDADE[p]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={editandoPendente}>
              <Check className="h-4 w-4" aria-hidden />
              {editandoPendente ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
          {estadoEdicao.status === "error" && (
            <p className="text-xs text-danger">{estadoEdicao.message}</p>
          )}
        </form>
      ) : (
        <>
          <p className={cn("text-sm", c.resolvido && "line-through")}>{c.texto}</p>
          <p className="text-xs text-muted mt-1">— {c.autorNome ?? c.autor}</p>
        </>
      )}

      {estadoResolvido.status === "error" && (
        <p className="mt-1 text-xs text-danger">{estadoResolvido.message}</p>
      )}
      {estadoExclusao.status === "error" && (
        <p className="mt-1 text-xs text-danger">{estadoExclusao.message}</p>
      )}
    </li>
  );
}
