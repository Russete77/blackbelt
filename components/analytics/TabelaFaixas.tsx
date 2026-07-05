import { Music2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarReceita, formatarStreams } from "@/lib/metricas";
import type { LinhaFaixaAgregada } from "@/types/analytics";

// Tabela "por faixa" do painel — TODA faixa do catálogo aparece (LEFT JOIN
// com as métricas agregadas, ver lib/metricas.ts#porFaixa): streams/receita
// mostram "—" quando a faixa ainda não tem nenhuma métrica importada ou
// sincronizada, em vez de simplesmente sumir da lista.
export function TabelaFaixas({
  linhas, tituloVazio = "Nenhuma faixa cadastrada ainda.",
}: {
  linhas: LinhaFaixaAgregada[];
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
                  {l.receita != null ? formatarReceita(l.receita) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                  {l.receitaPor1kStreams != null ? formatarReceita(l.receitaPor1kStreams) : "—"}
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
      </p>
    </div>
  );
}
