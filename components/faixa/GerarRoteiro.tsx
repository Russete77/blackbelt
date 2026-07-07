"use client";
// "Gerar roteiro de clipe (IA)" — chama a Server Action gerarRoteiroClipe, que
// monta o prompt com o contexto da faixa e usa o adaptador agnóstico (lib/ai.ts).
// Sem chave de IA configurada, mostra um rascunho de EXEMPLO (mock) e avisa —
// o fluxo funciona sem custo até plugarem a chave. Ver
// app/(app)/faixa/[id]/roteiro-actions.ts.
import { useState, useTransition } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { gerarRoteiroClipe, type EstadoRoteiro } from "@/app/(app)/faixa/[id]/roteiro-actions";

export function GerarRoteiro({ faixaId, faixaTitulo }: { faixaId: string; faixaTitulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoRoteiro>({ status: "idle" });
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  function gerar() {
    setCopiado(false);
    iniciar(async () => setEstado(await gerarRoteiroClipe(faixaId)));
  }

  function abrir() {
    setAberto(true);
    if (estado.status === "idle") gerar();
  }

  async function copiar() {
    if (!estado.roteiro) return;
    try {
      await navigator.clipboard.writeText(estado.roteiro);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard indisponível — ignora */
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={abrir} title={`Gerar roteiro de clipe para "${faixaTitulo}"`}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Roteiro de clipe (IA)
      </Button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="Roteiro de clipe (IA)">
        <div className="flex flex-col gap-3">
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
            <>
              {estado.mock && (
                <div className="flex items-center gap-2">
                  <Badge tone="accent">rascunho de exemplo</Badge>
                  <span className="text-xs text-muted">Configure a chave de IA no ambiente pra gerar de verdade.</span>
                </div>
              )}
              <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface2/40 p-4 text-sm leading-relaxed">
                {estado.roteiro}
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={gerar} disabled={pendente}>
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
