import { Music2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarStreams } from "@/lib/metricas";
import { formatarValorDual } from "@/lib/cambio";
import type { LinhaFaixaAgregada } from "@/types/analytics";

// Tabela "por faixa" do painel — TODA faixa do catálogo aparece (LEFT JOIN
// com as métricas agregadas, ver lib/metricas.ts#porFaixa): streams/receita
// mostram "—" quando a faixa ainda não tem nenhuma métrica importada ou
// sincronizada, em vez de simplesmente sumir da lista. Receita já chega em
// BRL (normalizada pela cotação do dia, ver lib/metricas.ts#converterReceitaParaBRL);
// `taxaBrl` é só para mostrar o equivalente em US$ ao lado.
export function TabelaFaixas({
  linhas, taxaBrl, tituloVazio = "Nenhuma faixa cadastrada ainda.",
}: {
  linhas: LinhaFaixaAgregada[];
  taxaBrl: number;
  tituloVazio?: string;
}) {
  if (linhas.length === 0) {
    return (
      <EmptyState
        icon={Music2}
        title={tituloVazio}
        hint="Cadastre uma faixa no estúdio e importe uma planilha (ou sincronize o YouTube) para ver o desempenho por música."
      />
    );
  }

  const semNumeros = linhas.filter((l) => l.streams == null).length;
  const estimadas = linhas.filter((l) => l.receitaEstimada).length;

  return (
    <div className="flex flex-col gap-2">
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
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.streams != null ? formatarStreams(l.streams) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-fg">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    {l.receita != null ? formatarValorDual(l.receita, "BRL", taxaBrl) : "—"}
                    {l.receitaEstimada && <Badge tone="accent">est.</Badge>}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.receitaPor1kStreams != null ? formatarValorDual(l.receitaPor1kStreams, "BRL", taxaBrl) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        {linhas.length} faixa{linhas.length === 1 ? "" : "s"}
        {semNumeros > 0
          ? ` · ${semNumeros} ainda sem números — importe ou vincule na aba Conectar & Importar.`
          : ""}
        {estimadas > 0
          ? ` · ${estimadas} com receita estimada (est.) por RPM — views sem receita real importada.`
          : ""}
      </p>
    </div>
  );
}
