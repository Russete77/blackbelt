import Link from "next/link";
import { HandCoins, Headphones, ListChecks, Bell, PartyPopper } from "lucide-react";
import {
  getMetricasDoArtista, getFaixasDoArtistaComNumeros, getDemandasDoArtista, contarNaoLidas,
} from "@/lib/db";
import { totaisMetricas, formatarStreams, recebimentoArtista, converterReceitaParaBRL } from "@/lib/metricas";
import { estimarReceitaPorFaixa, taxasDosParams } from "@/lib/estimativa";
import { cotacaoDolar, formatarValorDual } from "@/lib/cambio";
import { InfoTip } from "@/components/ui/InfoTip";
import { cn } from "@/lib/cn";

// Resumo do artista ("e daí?" antes do detalhe) — tira strip compacta acima
// das abas, visível em toda página do workspace do artista. NÃO é a página
// Números por inteiro: é um resumo com 4 números grandes que respondem
// "quanto rendi, como meus sons estão, o que preciso fazer" de cara.
//
// Recebimento e Streams usam EXATAMENTE as mesmas funções/fontes que
// app/(app)/artista/[slug]/numeros/page.tsx (getFaixasDoArtistaComNumeros +
// estimarReceitaPorFaixa + recebimentoArtista para recebimento;
// getMetricasDoArtista + totaisMetricas para streams), com as MESMAS taxas
// padrão de estimativa (taxasDosParams({}) === o que a página Números mostra
// sem nenhum filtro em ?ryt=&rsp=&rdz=) — os dois lugares têm que bater.
//
// Esta tira não recebe searchParams (fica no layout do artista, visível em
// toda aba, não só em Números) — por isso o valor aqui é sempre a
// ESTIMATIVA PADRÃO (taxas sem filtro). Se o usuário ajustar as taxas em
// Números, os dois números podem divergir; o rótulo/caption abaixo deixa
// isso explícito em vez de fingir que é sempre igual.
export async function ResumoArtista({ artistaId, slug }: { artistaId: string; slug: string }) {
  const taxas = taxasDosParams({});

  const cotacao = await cotacaoDolar();
  const [metricasBrutas, faixasComSplit, demandas, naoLidas] = await Promise.all([
    getMetricasDoArtista(artistaId),
    getFaixasDoArtistaComNumeros(artistaId, cotacao.brl),
    getDemandasDoArtista(artistaId),
    contarNaoLidas(),
  ]);

  const metricas = converterReceitaParaBRL(metricasBrutas, cotacao.brl);
  const totais = totaisMetricas(metricas);

  const recebimentoTotal = faixasComSplit.reduce((soma, f) => {
    const estimativa = estimarReceitaPorFaixa(f.streamsPorPlataforma, f.receitaPorPlataforma, taxas);
    return soma + (recebimentoArtista(estimativa.total, f.percentual) ?? 0);
  }, 0);

  const demandasPendentes = demandas.filter((d) => d.status !== "concluida").length;

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
      <CardResumo
        icon={HandCoins}
        label="Recebimento do artista"
        info="O que fica pra você: a receita da faixa vezes o seu %."
        value={formatarValorDual(recebimentoTotal, "BRL", cotacao.brl)}
        caption="estimativa padrão · ajuste as taxas em Números"
      />
      <CardResumo
        icon={Headphones}
        label="Streams"
        value={formatarStreams(totais.streams)}
      />
      <CardResumo
        icon={ListChecks}
        label="Demandas pendentes"
        value={String(demandasPendentes)}
        href={`/artista/${slug}/demandas`}
      />
      <CardResumo
        icon={Bell}
        label="Novidades"
        value={naoLidas > 0 ? String(naoLidas) : "Tudo em dia"}
        icone2={naoLidas === 0 ? PartyPopper : undefined}
      />
    </div>
  );
}

function CardResumo({
  icon: Icon, icone2: Icon2, label, info, value, caption, href,
}: {
  icon: typeof HandCoins;
  icone2?: typeof HandCoins;
  label: string;
  info?: string;
  value: string;
  caption?: string;
  href?: string;
}) {
  const IconeExibido = Icon2 ?? Icon;
  const conteudo = (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-line bg-surface p-3.5 md:p-4",
        href && "transition-colors duration-200 hover:border-accent/40 hover:bg-surface2",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-muted">
        <IconeExibido className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide">{label}</span>
        {info && <InfoTip texto={info} />}
      </div>
      <p className="truncate font-mono text-xl font-semibold text-fg md:text-2xl">{value}</p>
      {caption && <p className="mt-1 text-[11px] text-muted">{caption}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {conteudo}
      </Link>
    );
  }
  return conteudo;
}
