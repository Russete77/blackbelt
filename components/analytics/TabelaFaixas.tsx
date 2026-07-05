import { Music2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarReceita, formatarStreams } from "@/lib/metricas";
import type { LinhaFaixaAgregada } from "@/types/analytics";

// Tabela "por faixa" do painel — streams, receita e R$/1k streams (só
// calculável quando a linha tem streams importados; "—" caso contrário).
export function TabelaFaixas({
  linhas, tituloVazio = "Nenhuma faixa com métrica vinculada ainda.",
}: {
  linhas: LinhaFaixaAgregada[];
  tituloVazio?: string;
}) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={Music2}
        title={tituloVazio}
        hint="Importe uma planilha mapeando a coluna de faixa para ver o desempenho por música."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Faixa</th>
            <th className="px-4 py-2.5 text-right font-medium">Streams</th>
            <th className="px-4 py-2.5 text-right font-medium">Receita</th>
            <th className="px-4 py-2.5 text-right font-medium">R$/1k streams</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {linhas.map((l) => (
            <tr key={l.chave}>
              <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{l.rotulo}</td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">{formatarStreams(l.streams)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">{formatarReceita(l.receita)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                {l.receitaPor1kStreams != null ? formatarReceita(l.receitaPor1kStreams) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
