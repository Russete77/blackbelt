import { Suspense } from "react";
import { TrendingUp, Headphones, Wallet, Music2, Info, TriangleAlert } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { FiltroArtista } from "@/components/previsao/FiltroArtista";
import { GraficoTendencia, type PontoTendencia } from "@/components/previsao/GraficoTendencia";
import { getArtistas, getMetricas, getMetricasDoArtista } from "@/lib/db";
import { porMes, converterReceitaParaBRL, formatarStreams } from "@/lib/metricas";
import { projetar, mediaPorFaixa, type PontoMensal } from "@/lib/previsao";
import { cotacaoDolar, formatarValorDual } from "@/lib/cambio";

// Quantos meses à frente a tendência é projetada — janela curta o bastante
// pra não parecer uma "bola de cristal" (ver AGENTS/spec: 3–6 meses).
const MESES_PROJETADOS = 6;
// Menos que isso de meses com métrica real: a taxa de crescimento tem pouca
// base estatística (ver lib/previsao.ts#taxaCrescimentoMensal) — a página
// avisa em vez de deixar o gráfico parecer mais confiável do que é.
const MESES_MINIMOS_CONFIAVEIS = 3;

// Junta o histórico real (chave "YYYY-MM") com a projeção (lib/previsao.ts)
// num único eixo de tempo pro gráfico: o último ponto do histórico também
// aparece na série `projecao` (mesmo valor), só pra linha tracejada nascer
// visualmente de onde a linha sólida parou — sem esse "empréstimo" o
// gráfico teria um buraco entre o real e o projetado.
function combinarComProjecao(historico: PontoMensal[], meses: number): PontoTendencia[] {
  const projecao = projetar(historico, meses);
  const pontosHistorico: PontoTendencia[] = historico.map((h, i) => ({
    rotulo: h.rotulo,
    historico: h.valor,
    projecao: i === historico.length - 1 && projecao.length > 0 ? h.valor : null,
  }));
  const pontosProjecao: PontoTendencia[] = projecao.map((p) => ({
    rotulo: p.rotulo,
    historico: null,
    projecao: p.valor,
  }));
  return [...pontosHistorico, ...pontosProjecao];
}

export default async function PrevisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ artista?: string }>;
}) {
  const { artista } = await searchParams;

  const [metricasBrutas, artistas, cotacao] = await Promise.all([
    artista ? getMetricasDoArtista(artista) : getMetricas(),
    getArtistas(),
    cotacaoDolar(),
  ]);

  // Mesma normalização do Analytics: receita de toda linha convertida pra
  // BRL pela cotação do dia ANTES de agregar (ver lib/metricas.ts).
  const metricas = converterReceitaParaBRL(metricasBrutas, cotacao.brl);

  // As views do YouTube são um SNAPSHOT cumulativo (o total de views até hoje,
  // gravado todo na data da sincronização), não um fluxo mensal. Incluí-las na
  // série mensal faz o último mês saltar de alguns milhares para o total
  // acumulado (bilhões) e a projeção explodir num "hockey-stick" sem sentido.
  // Por isso a tendência/projeção usa SÓ métricas de fluxo mensal real
  // (planilha/Spotify) — o total acumulado do YouTube vive no Analytics.
  const PLATAFORMAS_SNAPSHOT = new Set(["youtube"]);
  const metricasFluxo = metricas.filter((m) => !PLATAFORMAS_SNAPSHOT.has(m.plataforma));

  const serieMensal = porMes(metricasFluxo);
  const serieStreams: PontoMensal[] = serieMensal.map((l) => ({ chave: l.chave, rotulo: l.rotulo, valor: l.streams }));
  const serieReceita: PontoMensal[] = serieMensal.map((l) => ({ chave: l.chave, rotulo: l.rotulo, valor: l.receita }));

  const tendenciaStreams = combinarComProjecao(serieStreams, MESES_PROJETADOS);
  const tendenciaReceita = combinarComProjecao(serieReceita, MESES_PROJETADOS);

  const expectativa = mediaPorFaixa(metricasFluxo);
  const historicoCurto = serieMensal.length > 0 && serieMensal.length < MESES_MINIMOS_CONFIAVEIS;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Projeção de streams e receita</h1>
          <p className="max-w-2xl text-sm text-muted">
            Tendência futura estimada a partir do histórico de métricas já importado — uma projeção, não uma
            garantia.
          </p>
        </div>
      </div>

      <div className="mb-6 w-full min-w-48 sm:w-auto">
        <Suspense fallback={null}>
          <FiltroArtista artistas={artistas} />
        </Suspense>
      </div>

      {metricas.length === 0 || serieMensal.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Histórico insuficiente para projetar uma tendência."
          hint="Importe ou sincronize métricas de streams/receita (aba Analytics) para este artista — quanto mais meses de dado real, mais confiável a projeção."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {historicoCurto && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                Só {serieMensal.length} {serieMensal.length === 1 ? "mês" : "meses"} de histórico real — a tendência
                abaixo tem baixa confiança estatística. Ela tende a melhorar à medida que mais métricas forem
                importadas.
              </p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-1 text-sm font-semibold">Streams — histórico e projeção</h2>
              <p className="mb-3 text-xs text-muted">
                Fluxo mensal (não inclui o total acumulado do YouTube). Linha sólida: real. Tracejada:
                projeção dos próximos {MESES_PROJETADOS} meses.
              </p>
              <GraficoTendencia dados={tendenciaStreams} formato="streams" />
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-1 text-sm font-semibold">Receita — histórico e projeção</h2>
              <p className="mb-3 text-xs text-muted">
                Linha sólida: real. Linha tracejada: projeção para os próximos {MESES_PROJETADOS} meses.
              </p>
              <GraficoTendencia dados={tendenciaReceita} formato="receita" />
            </div>
          </div>

          <div>
            <h2 className="mb-1 text-sm font-semibold">Expectativa de um novo lançamento</h2>
            <p className="mb-3 text-xs text-muted">
              Média de streams e receita por faixa já lançada{artista ? " deste artista" : " no selo"} — uma
              estimativa do que uma faixa nova tende a fazer, não uma promessa de resultado.
            </p>
            {expectativa.faixasConsideradas === 0 ? (
              <EmptyState
                icon={Music2}
                title="Nenhuma faixa com métrica suficiente para estimar uma média."
                hint="Assim que houver streams/receita importados por faixa, a expectativa aparece aqui."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile
                  icon={Headphones}
                  label="Streams esperados"
                  value={formatarStreams(expectativa.streamsMedios)}
                  hint="estimativa · média por faixa"
                />
                <StatTile
                  icon={Wallet}
                  label="Receita esperada"
                  value={formatarValorDual(expectativa.receitaMedia, "BRL", cotacao.brl)}
                  hint="estimativa · média por faixa"
                />
                <StatTile
                  icon={Music2}
                  label="Faixas consideradas"
                  value={String(expectativa.faixasConsideradas)}
                  hint="base da média acima"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-surface/60 px-4 py-3 text-xs text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p>
          Tudo nesta página é <strong className="font-medium text-fg">projeção/estimativa</strong> calculada a
          partir do histórico disponível — nunca um número garantido. Quanto mais meses de métrica real
          importada/sincronizada, mais confiável a projeção.
        </p>
      </div>
    </div>
  );
}
