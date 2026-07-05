import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BarChart3, Headphones, Wallet, HandCoins } from "lucide-react";
import { getArtista, getMetricasDoArtista, getFaixasComSplitDoArtista } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { TabelaFaixasSplit } from "@/components/analytics/TabelaFaixasSplit";
import { GraficoBarras, type SerieBarra } from "@/components/analytics/GraficoBarras";
import { FiltroRpm } from "@/components/analytics/FiltroRpm";
import { ImportarCSV } from "@/components/analytics/ImportarCSV";
import { SincronizarYoutube } from "@/components/analytics/SincronizarYoutube";
import {
  totaisMetricas, porPlataforma, formatarReceita, formatarStreams, PALETA_CATEGORICA,
  receitaComEstimativa, recebimentoArtista,
} from "@/lib/metricas";
import { youtubeConfigurado } from "@/lib/youtube";
import type { LinhaFaixaSplit } from "@/types/analytics";

export default async function NumerosPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rpm?: string }>;
}) {
  const { slug } = await params;
  const { rpm: rpmParam } = await searchParams;
  const rpmBruto = rpmParam ? Number(rpmParam.replace(",", ".")) : null;
  const rpm = rpmBruto != null && Number.isFinite(rpmBruto) && rpmBruto > 0 ? rpmBruto : null;

  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [metricas, faixasComSplit] = await Promise.all([
    getMetricasDoArtista(artista.id),
    getFaixasComSplitDoArtista(artista.id),
  ]);
  const totais = totaisMetricas(metricas);
  const linhasPlataforma = porPlataforma(metricas).map((l) => ({ rotulo: l.rotulo, streams: l.streams }));

  // "Por faixa" com split (%) — inclui feats: a receita mostrada é da FAIXA
  // inteira (todos os participantes), e "recebimento" já aplica o % do
  // artista. RPM (?rpm=) estima receita quando só há views (YouTube) e
  // nenhuma receita real importada ainda — sempre com selo "est.".
  const linhasFaixasSplit: LinhaFaixaSplit[] = faixasComSplit.map((f) => {
    const { valor, estimada } = receitaComEstimativa(f.receita, f.streams, rpm);
    return {
      chave: f.id,
      rotulo: f.titulo,
      papel: f.papel,
      percentual: f.percentual,
      streams: f.streams,
      receita: valor,
      receitaEstimada: estimada,
      recebimento: recebimentoArtista(valor, f.percentual),
    };
  });
  const recebimentoTotal = linhasFaixasSplit.reduce((s, l) => s + (l.recebimento ?? 0), 0);

  // Uma série só (streams por plataforma do MESMO artista): a identidade
  // categórica aqui é a posição no eixo X, não a cor — todas as barras usam
  // o mesmo slot (regra de "barras nominais" da paleta de dataviz).
  const serieUnica: SerieBarra[] = [{ chave: "streams", nome: "Streams", cor: PALETA_CATEGORICA[0] }];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Números</h2>
        <ImportarCSV artistas={[{ id: artista.id, nome: artista.nome }]} artistaFixoId={artista.id} />
      </div>

      {metricas.length === 0 && faixasComSplit.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`Nenhuma métrica importada ainda para ${artista.nome}.`}
          hint="Streams e desempenho por plataforma aparecerão aqui assim que forem importados."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile icon={Headphones} label="Streams" value={formatarStreams(totais.streams)} />
            <StatTile icon={Wallet} label="Receita" value={formatarReceita(totais.receita)} />
            <StatTile
              icon={HandCoins}
              label="Recebimento do artista"
              value={formatarReceita(recebimentoTotal)}
              hint="Receita de cada faixa × % do artista (inclui feats)"
            />
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold">Streams por plataforma</h3>
            {linhasPlataforma.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">Sem dados para os filtros atuais.</p>
            ) : (
              <GraficoBarras dados={linhasPlataforma} series={serieUnica} formato="streams" altura={220} />
            )}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-sm font-semibold">
                Por faixa <span className="font-normal text-muted">(recebimento pelo split, inclui feats)</span>
              </h3>
              <Suspense fallback={null}>
                <FiltroRpm rpmAtual={rpm ?? undefined} />
              </Suspense>
            </div>
            <TabelaFaixasSplit
              linhas={linhasFaixasSplit}
              tituloVazio={`Nenhuma faixa com split cadastrado ainda para ${artista.nome}.`}
            />
          </div>
        </>
      )}

      <div className="border-t border-line pt-4">
        <SincronizarYoutube configurado={youtubeConfigurado()} artistas={[]} artistaFixoId={artista.id} />
      </div>
    </div>
  );
}
