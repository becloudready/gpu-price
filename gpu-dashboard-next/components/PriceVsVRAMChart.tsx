"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Legend,
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
  const [chartType, setChartType] = useState("bar");

  const sortedByVRAM = useMemo(() => {
    return [...data].sort((a, b) => a.vram_gb - b.vram_gb);
  }, [data]);

  const minPrice = useMemo(() => {
    if (!data.length) return 0;
    return Math.min(...data.map((d) => d.price_per_hour_usd));
  }, [data]);

  const marketDistribution = useMemo(() => {
    const map: Record<string, number> = {};

    for (const gpu of data) {
      map[gpu.provider] = (map[gpu.provider] || 0) + 1;
    }

    return Object.keys(map).map((provider) => ({
      provider,
      count: map[provider],
    }));
  }, [data]);

  const pieColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f43f5e",
  ];

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400">
        No chart data available
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 mb-10">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          GPU Market Analytics
        </h2>

        <select
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm"
        >
          <option value="bar">Price vs VRAM (Column)</option>
          <option value="scatter">Price vs VRAM (Scatter)</option>
          <option value="pie">Market Distribution</option>
        </select>
      </div>

      {/* Chart Area */}
      <div className="w-full h-[500px]">
        <ResponsiveContainer width="100%" height="100%">

          {/* COLUMN CHART */}
          {chartType === "bar" && (
            <BarChart data={sortedByVRAM}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="product"
                stroke="#94a3b8"
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis stroke="#94a3b8" unit="$" />
              <Tooltip />
              <Bar dataKey="price_per_hour_usd" radius={[8, 8, 0, 0]}>
                {sortedByVRAM.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.price_per_hour_usd === minPrice
                        ? "#22c55e"
                        : "#3b82f6"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}

          {/* SCATTER CHART */}
          {chartType === "scatter" && (
            <ScatterChart>
              <CartesianGrid stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="vram_gb"
                unit="GB"
                stroke="#94a3b8"
              />
              <YAxis
                type="number"
                dataKey="price_per_hour_usd"
                unit="$"
                stroke="#94a3b8"
              />
              <Tooltip />
              <Scatter data={sortedByVRAM} fill="#3b82f6" />
            </ScatterChart>
          )}

          {/* PIE CHART */}
          {chartType === "pie" && (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={marketDistribution}
                dataKey="count"
                nameKey="provider"
                outerRadius={150}
                label
              >
                {marketDistribution.map((_, index) => (
                  <Cell
                    key={index}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          )}

        </ResponsiveContainer>
      </div>
    </div>
  );
}