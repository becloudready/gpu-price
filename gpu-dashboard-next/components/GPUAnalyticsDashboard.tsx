"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
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

type ChartType =
  | "priceVram"
  | "scatter"
  | "providerAvg"
  | "marketShare";

export default function GPUAnalyticsDashboard({
  data,
}: {
  data: GPUData[];
}) {
  const [chartType, setChartType] =
    useState<ChartType>("priceVram");

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-slate-400">
        No chart data available
      </div>
    );
  }

  // =========================
  // Sorted Data
  // =========================
  const sortedData = [...data].sort(
    (a, b) => a.vram_gb - b.vram_gb
  );

  const minPrice = Math.min(
    ...sortedData.map((d) => d.price_per_hour_usd)
  );

  // =========================
  // Provider Avg
  // =========================
  const providerMap: Record<string, number[]> = {};

  data.forEach((item) => {
    if (!providerMap[item.provider]) {
      providerMap[item.provider] = [];
    }
    providerMap[item.provider].push(
      item.price_per_hour_usd
    );
  });

  const providerAvgData = Object.keys(
    providerMap
  ).map((provider) => {
    const prices = providerMap[provider];
    const avg =
      prices.reduce((a, b) => a + b, 0) /
      prices.length;

    return {
      provider,
      avgPrice: Number(avg.toFixed(2)),
    };
  });

  // =========================
  // Market Share
  // =========================
  const pieData = Object.keys(providerMap).map(
    (provider) => ({
      name: provider,
      value: providerMap[provider].length,
    })
  );

  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f43f5e",
  ];

  // =========================
  // Chart Renderer
  // =========================
  const renderChart = () => {
    switch (chartType) {
      case "priceVram":
        return (
          <BarChart
            data={sortedData}
            margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="product"
              angle={-25}
              textAnchor="end"
              height={80}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke="#94a3b8" unit="$" />
            <Tooltip />
            <Bar
              dataKey="price_per_hour_usd"
              radius={[8, 8, 0, 0]}
            >
              {sortedData.map((entry, index) => (
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
        );

      case "scatter":
        return (
          <ScatterChart>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="vram_gb"
              name="VRAM"
              unit="GB"
            />
            <YAxis
              type="number"
              dataKey="price_per_hour_usd"
              name="Price"
              unit="$"
            />
            <Tooltip />
            <Scatter data={data} fill="#3b82f6" />
          </ScatterChart>
        );

      case "providerAvg":
        return (
          <BarChart data={providerAvgData}>
            <CartesianGrid />
            <XAxis dataKey="provider" />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="avgPrice"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        );

      case "marketShare":
        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              outerRadius={140}
              label
            >
              {pieData.map((_, index) => (
                <Cell
                  key={index}
                  fill={
                    COLORS[index % COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
    }
  };

  return (
    <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">
          GPU Analytics Dashboard
        </h2>

        <select
          value={chartType}
          onChange={(e) =>
            setChartType(e.target.value as ChartType)
          }
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="priceVram">
            Price vs VRAM (Bar)
          </option>
          <option value="scatter">
            Price vs VRAM (Scatter)
          </option>
          <option value="providerAvg">
            Provider Average Price
          </option>
          <option value="marketShare">
            Market Distribution
          </option>
        </select>
      </div>

      <div className="w-full h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}