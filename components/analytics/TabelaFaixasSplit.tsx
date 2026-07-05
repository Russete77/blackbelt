import { Music2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarReceita, formatarStreams } from "@/lib/metricas";
import type { LinhaFaixaSplit } from "@/types/analytics";

// Tabela "por faixa" da página Números do artista — cada linha é uma faixa
// onde o artista aparece em faixa_artistas (inclui feats de outros donos).
// "Receita da faixa" é o total da faixa inteira; "Recebimento" já aplica o
// percentual do artista — é o número que interessa de verdade pra ele.
export function TabelaFaixasSplit({
  linhas, tituloVazio = "Nenhuma faixa com split cadastrado ainda para este artista.",
}: {
  linhas: LinhaFaixaSplit[];
  tituloVazio?: string;
}) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={Music2}
        title={tituloVazio}
        hint='Cadastre os participantes e o % de cada um na seção "Participantes & Split" da página da faixa.'
      />
    );
  }

  const estimadas = linhas.filter((l) => l.receitaEstimada).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Faixa</th>
              <th className="px-4 py-2.5 font-medium">Papel</th>
              <th className="px-4 py-2.5 text-right font-medium">Streams</th>
              <th className="px-4 py-2.5 text-right font-medium">Receita da faixa</th>
              <th className="px-4 py-2.5 text-right font-medium">% do artista</th>
              <th className="px-4 py-2.5 text-right font-medium">Recebimento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {linhas.map((l) => (
              <tr key={l.chave}>
                <td className="max-w-[200px] truncate px-4 py-2.5 font-medium">{l.rotulo}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{l.papel ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.streams != null ? formatarStreams(l.streams) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">
                  <span className="inline-flex items-center gap-1.5">
                    {l.receita != null ? formatarReceita(l.receita) : "—"}
                    {l.receitaEstimada && <Badge tone="accent">est.</Badge>}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.percentual}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-accent">
                  {l.recebimento != null ? formatarReceita(l.recebimento) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {linhas.length} faixa{linhas.length === 1 ? "" : "s"} com split
        {estimadas > 0
          ? ` · ${estimadas} com receita estimada (est.) por RPM — views sem receita real importada.`
          : ""}
      </p>
    </div>
  );
}
