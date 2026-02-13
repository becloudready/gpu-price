"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  const chartData = data.map((item) => ({
    ...item,
    x: item.vram_gb,
    y: item.price_per_hour_usd,
  }));

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
      <h2 className="text-xl font-bold mb-4 text-white">
        Price vs VRAM
      </h2>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke="#1e293b" />

            <XAxis
              type="number"
              dataKey="x"
              name="VRAM"
              unit=" GB"
              stroke="#94a3b8"
            />

            <YAxis
              type="number"
              dataKey="y"
              name="Price"
              unit=" $"
              domain={["auto", "auto"]}
              stroke="#94a3b8"
            />

            <Tooltip
              content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const gpu = payload[0].payload;

                return (
                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-sm">
                    <p className="font-bold">{gpu.product}</p>
                    <p>Provider: {gpu.provider}</p>
                    <p>VRAM: {gpu.vram_gb} GB</p>
                    <p>Price: {gpu.raw_price}/hr</p>
                  </div>
                );
              }}
            />

            <Scatter data={chartData} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
