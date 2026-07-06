import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BarChart3, Headphones, Wallet, HandCoins } from "lucide-react";
import { getArtista, getMetricasDoArtista, getFaixasDoArtistaComNumeros } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { TabelaFaixasSplit } from "@/components/analytics/TabelaFaixasSplit";
import { DefinirSplitMassa } from "@/components/splits/DefinirSplitMassa";
import { GraficoBarras, type SerieBarra } from "@/components/analytics/GraficoBarras";
import { FiltroTaxas } from "@/components/analytics/FiltroTaxas";
import { ImportarCSV } from "@/components/analytics/ImportarCSV";
import { SincronizarYoutube } from "@/components/analytics/SincronizarYoutube";
import { CotacaoDolar } from "@/components/analytics/CotacaoDolar";
import {
  porPlataforma, formatarStreams, PALETA_CATEGORICA,
  recebimentoArtista, converterReceitaParaBRL,
} from "@/lib/metricas";
import { estimarReceitaPorFaixa, taxasDosParams } from "@/lib/estimativa";
import { cotacaoDolar, formatarValorDual } from "@/lib/cambio";
import { youtubeConfigurado } from "@/lib/youtube";
import type { LinhaFaixaSplit } from "@/types/analytics";

export default async function NumerosPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rpm?: string; ryt?: string; rsp?: string; rdz?: string }>;
}) {
  const { slug } = await params;
  const { rpm, ryt, rsp, rdz } = await searchParams;
  const taxas = taxasDosParams({ rpm, ryt, rsp, rdz });

  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [cotacao, metricasBrutas] = await Promise.all([
    cotacaoDolar(),
    getMetricasDoArtista(artista.id),
  ]);
  const faixasComSplit = await getFaixasDoArtistaComNumeros(artista.id, cotacao.brl);
  // Receita convertida pra BRL pela cotação do dia ANTES de agregar — ver
  // mesmo racional em app/(app)/analytics/page.tsx e lib/metricas.ts.
  const metricas = converterReceitaParaBRL(metricasBrutas, cotacao.brl);
  const linhasPlataforma = porPlataforma(metricas).map((l) => ({ rotulo: l.rotulo, streams: l.streams }));

  // "Por faixa" com split (%) — inclui feats: a receita mostrada é da FAIXA
  // inteira (todos os participantes), e "recebimento" já aplica o % do
  // artista. Estimativa por plataforma (?ryt=&rsp=&rdz=) preenche receita
  // quando só há streams (ex.: views do YouTube) e nenhuma receita real
  // importada AINDA naquela plataforma — sempre com selo "est." (ver
  // lib/estimativa.ts).
  const linhasFaixasSplit: LinhaFaixaSplit[] = faixasComSplit.map((f) => {
    const estimativa = estimarReceitaPorFaixa(f.streamsPorPlataforma, f.receitaPorPlataforma, taxas);
    return {
      chave: f.id,
      rotulo: f.titulo,
      papel: f.papel,
      percentual: f.percentual,
      streams: f.streams,
      receita: estimativa.total,
      receitaEstimada: estimativa.estimada,
      porPlataforma: estimativa.porPlataforma,
      recebimento: recebimentoArtista(estimativa.total, f.percentual),
    };
  });
  const recebimentoTotal = linhasFaixasSplit.reduce((s, l) => s + (l.recebimento ?? 0), 0);
  // Mesma base do "Recebimento" (getFaixasDoArtistaComNumeros, que agrega por
  // faixa incluindo feats) — não `getMetricasDoArtista`, que não inclui feats
  // e deixava "Streams" e "Recebimento" descasados no topo da página.
  const streamsTotal = linhasFaixasSplit.reduce((s, l) => s + (l.streams ?? 0), 0);
  // Igual ao StatTile "Receita" de app/(app)/analytics/page.tsx: precisa
  // somar a receita JÁ COM a estimativa por plataforma (não `totais.receita`
  // puro), senão este número no topo não muda quando o usuário ajusta as
  // taxas em FiltroTaxas — mesmo enquanto "Recebimento do artista" e a
  // tabela "Por faixa" abaixo mudam. Os dois lugares têm que bater.
  const receitaTotalEstimada = linhasFaixasSplit.reduce((s, l) => s + (l.receita ?? 0), 0);
  const totalTemEstimativa = linhasFaixasSplit.some((l) => l.receitaEstimada);

  // Uma série só (streams por plataforma do MESMO artista): a identidade
  // categórica aqui é a posição no eixo X, não a cor — todas as barras usam
  // o mesmo slot (regra de "barras nominais" da paleta de dataviz).
  const serieUnica: SerieBarra[] = [{ chave: "streams", nome: "Streams", cor: PALETA_CATEGORICA[0] }];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Números</h2>
          <div className="mt-1">
            <CotacaoDolar cotacao={cotacao} />
          </div>
        </div>
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
            <StatTile icon={Headphones} label="Streams" value={formatarStreams(streamsTotal)} />
            <StatTile
              icon={Wallet}
              label="Receita"
              value={formatarValorDual(receitaTotalEstimada, "BRL", cotacao.brl) + (totalTemEstimativa ? " · est." : "")}
            />
            <StatTile
              icon={HandCoins}
              label="Recebimento do artista"
              value={formatarValorDual(recebimentoTotal, "BRL", cotacao.brl)}
              hint="Receita de cada faixa × % do artista (inclui feats)"
              info="O que fica pra você: a receita da faixa vezes o seu %."
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
                <FiltroTaxas ryt={taxas.youtube} rsp={taxas.spotify} rdz={taxas.deezer} />
              </Suspense>
            </div>
            <div className="mb-3">
              <DefinirSplitMassa artistaId={artista.id} />
            </div>
            <TabelaFaixasSplit
              linhas={linhasFaixasSplit}
              taxaBrl={cotacao.brl}
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
