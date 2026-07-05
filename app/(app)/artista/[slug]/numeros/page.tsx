import { notFound } from "next/navigation";
import { BarChart3, Headphones, Wallet } from "lucide-react";
import { getArtista, getMetricasDoArtista, getFaixasDoArtista } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { TabelaFaixas } from "@/components/analytics/TabelaFaixas";
import { GraficoBarras, type SerieBarra } from "@/components/analytics/GraficoBarras";
import { ImportarCSV } from "@/components/analytics/ImportarCSV";
import { SincronizarYoutube } from "@/components/analytics/SincronizarYoutube";
import {
  totaisMetricas, porFaixa, porPlataforma, formatarReceita, formatarStreams, PALETA_CATEGORICA,
} from "@/lib/metricas";
import { youtubeConfigurado } from "@/lib/youtube";

export default async function NumerosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artista = await getArtista(slug);
  if (!artista) return notFound();

  const [metricas, faixas] = await Promise.all([
    getMetricasDoArtista(artista.id),
    getFaixasDoArtista(artista.id),
  ]);
  const totais = totaisMetricas(metricas);
  const linhasFaixas = porFaixa(faixas.map((f) => ({ id: f.id, titulo: f.titulo })), metricas);
  const linhasPlataforma = porPlataforma(metricas).map((l) => ({ rotulo: l.rotulo, streams: l.streams }));

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

      {metricas.length === 0 && faixas.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`Nenhuma métrica importada ainda para ${artista.nome}.`}
          hint="Streams e desempenho por plataforma aparecerão aqui assim que forem importados."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile icon={Headphones} label="Streams" value={formatarStreams(totais.streams)} />
            <StatTile icon={Wallet} label="Receita" value={formatarReceita(totais.receita)} />
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
            <h3 className="mb-3 text-sm font-semibold">Por faixa</h3>
            <TabelaFaixas
              linhas={linhasFaixas}
              tituloVazio={`Nenhuma faixa cadastrada ainda para ${artista.nome}.`}
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
