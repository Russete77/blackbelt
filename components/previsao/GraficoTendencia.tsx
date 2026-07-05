"use client";
// Tendência + projeção da Previsão de Lançamentos: histórico real (linha
// sólida, área preenchida — mesmo tratamento visual de GraficoLinha) seguido
// da projeção estimada (linha tracejada, cor apagada, SEM preenchimento) —
// a diferença visual é intencional: nunca deixar a parte projetada parecer
// tão "certa" quanto o histórico. Recharts exige client component (mede o
// container no browser).
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { tokens } from "@/lib/tokens";
import { formatarValorPorTipo, type FormatoValor } from "@/lib/metricas";

export type { FormatoValor };

// Um ponto do eixo do tempo: `historico` traz o valor real (null nos meses
// futuros), `projecao` traz o valor projetado (null nos meses passados). O
// último mês real também recebe `projecao` = seu próprio valor — é assim
// que a linha tracejada visualmente "sai" de onde o histórico parou, em vez
// de deixar um buraco no meio do gráfico.
export interface PontoTendencia {
  rotulo: string;
  historico: number | null;
  projecao: number | null;
}

interface TooltipPayloadItem {
  dataKey?: string;
  value?: number | null;
}

function TooltipPersonalizado({
  active, payload, label, formatarValor,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatarValor: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  // Nos meses com histórico e projeção coincidindo (o ponto de virada), o
  // histórico é o valor "de verdade" a mostrar; nos demais, só uma das duas
  // séries tem valor não-nulo nesse ponto.
  const item = payload.find((p) => p.dataKey === "historico" && p.value != null)
    ?? payload.find((p) => p.dataKey === "projecao" && p.value != null);
  if (!item || item.value == null) return null;
  const projetado = item.dataKey === "projecao";
  return (
    <div className="rounded-md border border-line bg-surface2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <p className="mb-1 font-medium text-fg">{label}</p>
      <p className="font-mono text-accent">{formatarValor(item.value)}</p>
      {projetado && (
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted">projeção (estimativa)</p>
      )}
    </div>
  );
}

export function GraficoTendencia({
  dados, formato = "streams", altura = 260,
}: {
  dados: PontoTendencia[];
  formato?: FormatoValor;
  altura?: number;
}) {
  const formatarValor = (v: number) => formatarValorPorTipo(formato, v);
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaTendenciaHistorico" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.colors.accent} stopOpacity={0.25} />
              <stop offset="100%" stopColor={tokens.colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={tokens.colors.line} strokeOpacity={0.6} />
          <XAxis
            dataKey="rotulo"
            tick={{ fill: tokens.colors.muted, fontSize: 11 }}
            axisLine={{ stroke: tokens.colors.line }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tokens.colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatarValor(v)}
            width={64}
          />
          <Tooltip
            cursor={{ stroke: tokens.colors.line }}
            content={<TooltipPersonalizado formatarValor={formatarValor} />}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: tokens.colors.muted, paddingTop: 8 }}
            iconType="plainline"
          />
          <Area
            type="monotone"
            dataKey="historico"
            name="Histórico"
            stroke={tokens.colors.accent}
            strokeWidth={2}
            fill="url(#areaTendenciaHistorico)"
            dot={{ r: 3, fill: tokens.colors.accent, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: tokens.colors.accent, strokeWidth: 0 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projecao"
            name="Projeção (estimativa)"
            stroke={tokens.colors.muted}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3, fill: tokens.colors.muted, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: tokens.colors.muted, strokeWidth: 0 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
