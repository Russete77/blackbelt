"use client";
// Gráfico de barras genérico do módulo Analytics — usado tanto para uma
// série só ("Receita por artista", cor única) quanto para barras empilhadas
// por categoria ("Streams por plataforma, por artista"). Recharts exige
// client component (mede o container no browser).
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { tokens } from "@/lib/tokens";

export interface SerieBarra {
  chave: string;
  nome: string;
  cor: string;
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
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
  return (
    <div className="rounded-md border border-line bg-surface2 px-3 py-2 text-xs shadow-lg shadow-black/30">
      <p className="mb-1 font-medium text-fg">{label}</p>
      <div className="flex flex-col gap-0.5">
        {payload.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            <span className="text-muted">{item.name}</span>
            <span className="ml-auto font-mono text-fg">{formatarValor(item.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GraficoBarras({
  dados, categoriaChave = "rotulo", series, formatarValor, empilhado = false, altura = 260,
}: {
  dados: Record<string, string | number>[];
  categoriaChave?: string;
  series: SerieBarra[];
  formatarValor: (n: number) => string;
  empilhado?: boolean;
  altura?: number;
}) {
  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tokens.colors.line} strokeOpacity={0.6} />
          <XAxis
            dataKey={categoriaChave}
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
            cursor={{ fill: tokens.colors.surface2, opacity: 0.5 }}
            content={<TooltipPersonalizado formatarValor={formatarValor} />}
          />
          {series.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: tokens.colors.muted, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {series.map((serie) => (
            <Bar
              key={serie.chave}
              dataKey={serie.chave}
              name={serie.nome}
              fill={serie.cor}
              stackId={empilhado ? "pilha" : undefined}
              radius={empilhado ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
