"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GPUData {
  provider: string;
  product: string;
  gpu_count: number;
  vram_gb: number;
  vcpus: number;
  system_ram_gb: number;
  local_storage_tb: number | null;
  price_per_hour_usd: number;
  raw_price: string;
}

export default function PriceVsVRAMChart({
  data,
}: {
  data: GPUData[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8 text-center text-slate-400">
        No chart data available
      </div>
    );
  }

  // Sort by VRAM ascending
  const chartData = [...data].sort(
    (a, b) => a.vram_gb - b.vram_gb
  );

  const minPrice = Math.min(
    ...chartData.map((d) => d.price_per_hour_usd)
  );

  return (
    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 mb-10">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Price vs VRAM
      </h2>

      <div className="w-full h-[450px] md:h-[550px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
          >
            <CartesianGrid stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="product"
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              angle={-25}
              textAnchor="end"
              height={70}
            />

            <YAxis
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
              unit=" $"
            />

            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const gpu = payload[0].payload;

                return (
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm shadow-lg">
                    <p className="font-bold text-white">
                      {gpu.product}
                    </p>
                    <p className="text-slate-400">
                      Provider: {gpu.provider}
                    </p>
                    <p className="text-slate-400">
                      VRAM: {gpu.vram_gb} GB
                    </p>
                    <p className="text-emerald-400 font-semibold">
                      {gpu.raw_price}/hr
                    </p>
                  </div>
                );
              }}
            />

            <Bar
              dataKey="price_per_hour_usd"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.price_per_hour_usd === minPrice
                      ? "#22c55e" // highlight cheapest
                      : "#3b82f6"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
