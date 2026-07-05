import { Suspense } from "react";
import Link from "next/link";
import { BarChart3, Headphones, Wallet, Music2, Link2 } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabelaFaixas } from "@/components/analytics/TabelaFaixas";
import { GraficoBarras, type SerieBarra } from "@/components/analytics/GraficoBarras";
import { GraficoLinha } from "@/components/analytics/GraficoLinha";
import { FiltroAnalytics } from "@/components/analytics/FiltroAnalytics";
import { FiltroTaxas } from "@/components/analytics/FiltroTaxas";
import { ImportarCSV } from "@/components/analytics/ImportarCSV";
import { SincronizarYoutube } from "@/components/analytics/SincronizarYoutube";
import { CotacaoDolar } from "@/components/analytics/CotacaoDolar";
import { getArtistas, getMetricas, contarStatusYoutube, getFaixas, getFaixasDoArtista } from "@/lib/db";
import {
  totaisMetricas, porFaixa, porMes, porArtistaEPlataforma,
  formatarStreams, corCategoria, receitaPor1kStreams,
  converterReceitaParaBRL, porFaixaEPlataforma,
} from "@/lib/metricas";
import { estimarReceitaPorFaixa, taxasDosParams } from "@/lib/estimativa";
import { cotacaoDolar, formatarValorDual } from "@/lib/cambio";
import { youtubeConfigurado } from "@/lib/youtube";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ artista?: string; plataforma?: string; rpm?: string; ryt?: string; rsp?: string; rdz?: string }>;
}) {
  const { artista, plataforma, rpm, ryt, rsp, rdz } = await searchParams;
  const taxas = taxasDosParams({ rpm, ryt, rsp, rdz });

  const [metricasBrutas, artistas, statusYoutube, faixasRelevantes, cotacao] = await Promise.all([
    getMetricas(), getArtistas(), contarStatusYoutube(),
    artista ? getFaixasDoArtista(artista) : getFaixas(),
    cotacaoDolar(),
  ]);

  // Receita de toda linha convertida pra BRL pela cotação do dia ANTES de
  // agregar — royalties em USD (YouTube AdSense, agregadoras) não podem ser
  // somados cegamente com receita em BRL (ver lib/metricas.ts).
  const metricas = converterReceitaParaBRL(metricasBrutas, cotacao.brl);

  const plataformasDistintas = Array.from(new Set(metricas.map((m) => m.plataforma))).sort();

  const filtradas = metricas.filter(
    (m) => (!artista || m.artistaId === artista) && (!plataforma || m.plataforma === plataforma),
  );

  const totais = totaisMetricas(filtradas);
  // O filtro de plataforma só afeta os números agregados por faixa — o
  // conjunto de faixas listadas respeita apenas o filtro de artista (ver
  // faixasRelevantes acima), então uma faixa sem métrica na plataforma
  // selecionada ainda aparece na tabela, com "—".
  // Estimativa por plataforma (?ryt=&rsp=&rdz=, com fallback ao padrão de
  // mercado): faixa sem receita real importada NAQUELA plataforma mas com
  // streams ganha uma receita ESTIMADA (streams × taxa da plataforma),
  // marcada com selo "est." — a receita real sempre precede a estimativa,
  // plataforma a plataforma (ver lib/estimativa.ts).
  const faixaPorPlataforma = porFaixaEPlataforma(filtradas);
  const linhasFaixas = porFaixa(
    faixasRelevantes.map((f) => ({ id: f.id, titulo: f.titulo })),
    filtradas,
  ).map((l) => {
    const dados = faixaPorPlataforma.get(l.chave);
    const estimativa = estimarReceitaPorFaixa(dados?.streams ?? {}, dados?.receita ?? {}, taxas);
    return {
      ...l,
      receita: estimativa.total,
      receitaEstimada: estimativa.estimada,
      porPlataforma: estimativa.porPlataforma,
      receitaPor1kStreams: estimativa.total != null && l.streams != null
        ? receitaPor1kStreams(estimativa.total, l.streams)
        : l.receitaPor1kStreams,
    };
  });
  const linhasMes = porMes(filtradas).map((l) => ({ rotulo: l.rotulo, valor: l.receita }));
  const linhasArtistaPlataforma = porArtistaEPlataforma(filtradas);

  const seriesPlataforma: SerieBarra[] = plataformasDistintas.map((p) => ({
    chave: p,
    nome: p,
    cor: corCategoria(p, plataformasDistintas),
  }));

  const faixasMonetizadas = linhasFaixas.filter((l) => l.streams != null).length;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">Analytics</h1>
          <p className="text-sm text-muted">
            Views × recebimento do selo — transparente, importado direto das planilhas das plataformas.
          </p>
          <div className="mt-1.5">
            <CotacaoDolar cotacao={cotacao} />
          </div>
        </div>
        <ImportarCSV artistas={artistas} />
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="w-full min-w-48 sm:w-auto">
          <Suspense fallback={null}>
            <FiltroAnalytics artistas={artistas} plataformas={plataformasDistintas} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <FiltroTaxas ryt={taxas.youtube} rsp={taxas.spotify} rdz={taxas.deezer} />
        </Suspense>
      </div>

      {metricas.length === 0 && faixasRelevantes.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma métrica importada ainda."
          hint='Clique em "Importar planilha" para trazer streams e receita das plataformas, ou sincronize o YouTube abaixo se já tiver faixas com vídeo vinculado.'
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile icon={Headphones} label="Streams" value={formatarStreams(totais.streams)} />
            <StatTile icon={Wallet} label="Receita" value={formatarValorDual(totais.receita, "BRL", cotacao.brl)} />
            <StatTile icon={Music2} label="Faixas monetizadas" value={String(faixasMonetizadas)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold">Streams por artista, por plataforma</h2>
              {linhasArtistaPlataforma.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">Sem dados para os filtros atuais.</p>
              ) : (
                <GraficoBarras
                  dados={linhasArtistaPlataforma}
                  series={seriesPlataforma}
                  formato="streams"
                  empilhado
                />
              )}
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
              <h2 className="mb-3 text-sm font-semibold">Receita por mês</h2>
              {linhasMes.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">Sem dados para os filtros atuais.</p>
              ) : (
                <GraficoLinha dados={linhasMes} formato="receita" />
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Por faixa</h2>
            <TabelaFaixas linhas={linhasFaixas} taxaBrl={cotacao.brl} />
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <SincronizarYoutube
          configurado={youtubeConfigurado()}
          artistas={artistas}
          status={statusYoutube}
          permitirManual={false}
        />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Quer trazer catálogo e views de um artista específico? Use a aba{" "}
          <strong className="font-medium text-fg">Conectar &amp; Importar</strong> na página do artista —
          veja a lista em{" "}
          <Link href="/artistas" className="underline decoration-dotted underline-offset-2 transition-colors duration-200 hover:text-accent">
            Artistas
          </Link>.
        </p>
      </div>
    </div>
  );
}
