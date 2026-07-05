"use client";
// Formulário inline de novo comentário ancorado num tempo da versão.
// Insert direto em `comentarios` via client do BROWSER (sessão do usuário —
// RLS aplica; autor = auth.uid()), depois router.refresh() para o pin + lista.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formatTempo } from "@/components/player/format";
import type { CategoriaComentario, Prioridade } from "@/types/domain";

const CATEGORIAS: CategoriaComentario[] = ["geral", "beat", "mix", "master", "letra"];
const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const LABEL_CATEGORIA: Record<CategoriaComentario, string> = {
  geral: "Geral", beat: "Beat", mix: "Mix", master: "Master", letra: "Letra",
};
const LABEL_PRIORIDADE: Record<Prioridade, string> = {
  alta: "Alta", media: "Média", baixa: "Baixa",
};

export function NovoComentario({
  versaoId, timestampSegundos, onFechar,
}: { versaoId: string; timestampSegundos: number; onFechar: () => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaComentario>("geral");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!texto.trim()) {
      setErro("Escreva o comentário.");
      return;
    }
    setSalvando(true);
    setErro(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const { error } = await supabase.from("comentarios").insert({
        versao_id: versaoId,
        timestamp_segundos: Math.round(timestampSegundos * 100) / 100,
        categoria,
        prioridade,
        autor: user.id,
        texto: texto.trim(),
        resolvido: false,
      });
      if (error) throw new Error("Não foi possível salvar o comentário.");

      setTexto("");
      onFechar();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <MessageSquarePlus className="h-4 w-4 text-accent" aria-hidden />
          Comentário em <span className="font-mono text-accent">{formatTempo(timestampSegundos)}</span>
        </h3>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="text-muted hover:text-fg transition"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          rows={3}
          placeholder="O que precisa mudar neste ponto?"
          className="resize-none rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            Categoria
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaComentario)}
              className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{LABEL_CATEGORIA[c]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
            Prioridade
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as Prioridade)}
              className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{LABEL_PRIORIDADE[p]}</option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" size="sm" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar comentário"}
        </Button>
        {erro && <p className="text-xs text-danger">{erro}</p>}
      </div>
    </form>
  );
}
