"use client";
// "Roteiro de clipe (IA)" na aba Clipes: escolhe a faixa e gera o roteiro cena
// a cena a partir da letra/gênero dela (Server Action gerarRoteiroClipe, que usa
// o adaptador agnóstico de provedor — ver lib/ai.ts). Sem chave de IA, a action
// devolve um erro claro pedindo pra configurar (nada de mock). Copiar leva o
// roteiro pro clipboard pra colar numa demanda de clipe.
import { useState, useTransition } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { gerarRoteiroClipe, type EstadoRoteiro } from "@/app/(app)/faixa/[id]/roteiro-actions";
import type { Faixa } from "@/types/domain";

export function RoteiroIA({ faixas }: { faixas: Faixa[] }) {
  const [aberto, setAberto] = useState(false);
  const [faixaId, setFaixaId] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [estado, setEstado] = useState<EstadoRoteiro>({ status: "idle" });
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  function gerar() {
    if (!faixaId) {
      setEstado({ status: "error", message: "Escolha uma faixa primeiro." });
      return;
    }
    setCopiado(false);
    iniciar(async () => setEstado(await gerarRoteiroClipe(faixaId, instrucoes)));
  }

  async function copiar() {
    if (!estado.roteiro) return;
    try {
      await navigator.clipboard.writeText(estado.roteiro);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Roteiro de clipe (IA)
      </Button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="Roteiro de clipe (IA)">
        <div className="flex flex-col gap-3">
          <Field label="Faixa">
            <Select value={faixaId} onChange={(e) => setFaixaId(e.target.value)}>
              <option value="">Escolha a faixa…</option>
              {faixas.map((f) => (
                <option key={f.id} value={f.id}>{f.titulo}</option>
              ))}
            </Select>
          </Field>

          <Field label="Direção do artista (opcional)">
            <Textarea
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              rows={4}
              placeholder="Briefing pra IA seguir: história/conceito, referências (clipes, filmes), mood, locações, figurino, elementos obrigatórios, o que EVITAR, orçamento…"
            />
          </Field>

          {pendente && (
            <p className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Gerando o roteiro a partir da letra e do gênero…
            </p>
          )}
          {!pendente && estado.status === "error" && (
            <p className="text-sm text-danger" role="alert">{estado.message}</p>
          )}
          {!pendente && estado.status === "ok" && estado.roteiro && (
            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface2/40 p-4 text-sm leading-relaxed">
              {estado.roteiro}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={gerar} disabled={pendente || !faixaId}>
              {pendente ? "Gerando…" : estado.status === "ok" ? "Gerar outro" : "Gerar"}
            </Button>
            {estado.status === "ok" && estado.roteiro && (
              <Button variant="outline" size="sm" onClick={copiar}>
                {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
