"use client";
// "Participantes & Split" — quem aparece na faixa e qual % de cada um.
// Numa faixa com feat, a receita pertence à faixa inteira (dono do
// vídeo/fonograma); o recebimento de cada artista é receita × seu %
// (ver lib/metricas.ts#recebimentoArtista e a página Números do artista).
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Users, Percent, Plus, Trash2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { salvarSplits, type EstadoSplits } from "@/app/(app)/splits/actions";

const ESTADO_INICIAL: EstadoSplits = { status: "idle" };

interface Participante {
  artistaId: string;
  papel: string;
  percentual: number;
}

export function SplitsFaixa({
  faixaId, artistas, participantesIniciais,
}: {
  faixaId: string;
  artistas: { id: string; nome: string }[];
  participantesIniciais: { artistaId: string; papel: string | null; percentual: number }[];
}) {
  const caminho = usePathname();
  const [participantes, setParticipantes] = useState<Participante[]>(
    participantesIniciais.map((p) => ({
      artistaId: p.artistaId,
      papel: p.papel ?? "",
      percentual: p.percentual,
    })),
  );
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoSplits, formData: FormData) => salvarSplits(prev, formData),
    ESTADO_INICIAL,
  );

  const soma = Math.round(participantes.reduce((s, p) => s + (Number(p.percentual) || 0), 0) * 100) / 100;
  const somaOk = participantes.length === 0 || Math.abs(soma - 100) < 0.01;
  const artistasDisponiveis = artistas.filter((a) => !participantes.some((p) => p.artistaId === a.id));

  function adicionar() {
    const proximo = artistasDisponiveis[0];
    if (!proximo) return;
    setParticipantes((prev) => [...prev, { artistaId: proximo.id, papel: "principal", percentual: 0 }]);
  }

  function remover(indice: number) {
    setParticipantes((prev) => prev.filter((_, i) => i !== indice));
  }

  function atualizar(indice: number, patch: Partial<Participante>) {
    setParticipantes((prev) => prev.map((p, i) => (i === indice ? { ...p, ...patch } : p)));
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted" aria-hidden />
          Participantes &amp; Split
        </h3>
        {participantes.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-xs",
              somaOk ? "text-muted" : "text-warning",
            )}
          >
            <Percent className="h-3.5 w-3.5" aria-hidden />
            soma {soma}%{!somaOk && " — não fecha 100%"}
          </span>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="faixaId" value={faixaId} />
        <input type="hidden" name="caminho" value={caminho} />
        <input type="hidden" name="participantes" value={JSON.stringify(participantes)} />

        {participantes.length === 0 ? (
          <p className="text-xs text-muted">Nenhum participante cadastrado ainda nesta faixa.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {participantes.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label="Artista"
                  value={p.artistaId}
                  onChange={(e) => atualizar(i, { artistaId: e.target.value })}
                  className="w-full sm:w-44"
                >
                  {artistas
                    .filter((a) => a.id === p.artistaId || !participantes.some((o) => o.artistaId === a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                </Select>
                <Input
                  aria-label="Papel"
                  value={p.papel}
                  onChange={(e) => atualizar(i, { papel: e.target.value })}
                  placeholder="Papel (principal, feat, produtor...)"
                  className="w-full sm:w-48"
                />
                <div className="flex items-center gap-1.5">
                  <Input
                    aria-label="Percentual"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={p.percentual}
                    onChange={(e) => atualizar(i, { percentual: Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-xs text-muted">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => remover(i)}
                  aria-label={`Remover ${p.papel || "participante"}`}
                  className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={adicionar}
            disabled={artistasDisponiveis.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar participante
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={pendente || !somaOk}
            title={!somaOk ? "A soma dos percentuais precisa fechar 100% para salvar" : undefined}
          >
            {pendente ? "Salvando..." : "Salvar splits"}
          </Button>
        </div>

        {estado.status === "ok" && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
          </p>
        )}
        {estado.status === "error" && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
          </p>
        )}
      </form>
    </div>
  );
}
