"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface HistoryPoint {
  date: string;
  price: number;
  label: string;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  currentPrice: number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; color: string; name: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (!visible.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-[11px] text-zinc-500">{label}</p>
      {visible.map((p, i) => (
        <p key={i} className="font-mono text-sm font-semibold" style={{ color: p.color }}>
          ${p.value.toFixed(2)}/hr
          {visible.length > 1 && (
            <span className="ml-1.5 text-[10px] font-normal text-zinc-500">{p.name}</span>
          )}
        </p>
      ))}
    </div>
  );
}

export default function PriceChart({
  data,
  series,
}: {
  data: Record<string, string | number | null>[];
  series: ChartSeries[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          tickFormatter={(v) => `$${v}`}
          width={52}
          domain={["auto", "auto"]}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
        />

        {series.map((s) =>
          s.currentPrice !== null ? (
            <ReferenceLine
              key={`ref_${s.key}`}
              y={s.currentPrice}
              stroke={s.color}
              strokeDasharray="4 3"
              strokeOpacity={0.35}
            />
          ) : null
        )}

        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={`price_${i}`}
            name={s.label}
            stroke={s.color}
            strokeWidth={1.5}
            fill={`url(#grad_${i})`}
            dot={false}
            activeDot={{ r: 4, fill: s.color, stroke: "#09090b", strokeWidth: 2 }}
            connectNulls={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
