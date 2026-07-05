import { Music2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarStreams } from "@/lib/metricas";
import { formatarValorDual } from "@/lib/cambio";
import { labelPlataforma } from "@/lib/labels";
import type { LinhaFaixaSplit } from "@/types/analytics";

// Tabela "por faixa" da página Números do artista — cada linha é uma faixa
// onde o artista aparece em faixa_artistas (inclui feats de outros donos).
// "Receita da faixa" é o total da faixa inteira; "Recebimento" já aplica o
// percentual do artista — é o número que interessa de verdade pra ele. Ambos
// já chegam em BRL normalizado (ver lib/metricas.ts#converterReceitaParaBRL);
// `taxaBrl` só serve pra mostrar o equivalente em US$ ao lado.
export function TabelaFaixasSplit({
  linhas, taxaBrl, tituloVazio = "Nenhuma faixa com split cadastrado ainda para este artista.",
}: {
  linhas: LinhaFaixaSplit[];
  taxaBrl: number;
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
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {l.receita != null ? formatarValorDual(l.receita, "BRL", taxaBrl) : "—"}
                    {l.receitaEstimada && <Badge tone="accent">est.</Badge>}
                  </span>
                  {l.porPlataforma && l.porPlataforma.length > 0 && (
                    <p className="mt-0.5 whitespace-nowrap font-sans text-[11px] text-muted">
                      {l.porPlataforma
                        .map((p) => `${labelPlataforma(p.plataforma)} ${formatarValorDual(p.valor, "BRL", taxaBrl)}${p.real ? "" : " est."}`)
                        .join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.percentual}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-accent">
                  {l.recebimento != null ? formatarValorDual(l.recebimento, "BRL", taxaBrl) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {linhas.length} faixa{linhas.length === 1 ? "" : "s"} com split
        {estimadas > 0
          ? ` · ${estimadas} com receita estimada (est.) por taxa média de plataforma — streams sem receita real importada naquela plataforma.`
          : ""}
      </p>
    </div>
  );
}
