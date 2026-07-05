import { ArrowLeftRight, TriangleAlert } from "lucide-react";
import { formatarReceita } from "@/lib/metricas";
import { horaAtualizacao, type Cotacao } from "@/lib/cambio";

// Indicador discreto "Dólar hoje: R$ X,XX" — mostrado no topo do Analytics e
// da página Números do artista, perto de onde os valores em R$/US$ aparecem.
// Quando a AwesomeAPI falhou (ver lib/cambio.ts#cotacaoDolar), avisa que a
// cotação é uma estimativa em vez de fingir que é a do dia.
export function CotacaoDolar({ cotacao }: { cotacao: Cotacao }) {
  if (cotacao.indisponivel) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-warning">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Cotação do dólar indisponível — usando {formatarReceita(cotacao.brl)} (estimativa)
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 font-mono text-xs text-muted">
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
      Dólar hoje: {formatarReceita(cotacao.brl)}
      <span className="text-muted/70">· atualizado às {horaAtualizacao(cotacao.atualizadoEm)}</span>
    </p>
  );
}
