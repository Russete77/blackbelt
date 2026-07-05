"use client";
// Linha de tendência (receita por mês) — série única, então sem legenda
// (o título do card já nomeia a série). Área sutil sob a linha reforça a
// leitura de tendência sem virar "chartjunk".
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { tokens } from "@/lib/tokens";
import { formatarValorPorTipo, type FormatoValor } from "@/lib/metricas";

export type { FormatoValor };

function TooltipPersonalizado({
  active, payload, label, formatarValor,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
  formatarValor: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <p className="mb-1 font-medium text-fg">{label}</p>
      <p className="font-mono text-accent">{formatarValor(payload[0].value ?? 0)}</p>
    </div>
  );
}

export function GraficoLinha({
  dados, formato = "receita", cor = tokens.colors.accent, altura = 260,
}: {
  dados: { rotulo: string; valor: number }[];
  formato?: FormatoValor;
  cor?: string;
  altura?: number;
}) {
  const formatarValor = (v: number) => formatarValorPorTipo(formato, v);
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
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
          <Area
            type="monotone"
            dataKey="valor"
            stroke={cor}
            strokeWidth={2}
            fill="url(#areaReceita)"
            dot={{ r: 3, fill: cor, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: cor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
