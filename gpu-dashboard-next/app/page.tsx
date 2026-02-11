"use client";
import React, { useState, useEffect } from "react";

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

export default function GPUPriceMonitor() {
  const [prices, setPrices] = useState<GPUData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/prices")
      .then((res) => res.json())
      .then((data) => {
        setPrices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = prices.filter((p) =>
    p.product.toLowerCase().includes(search.toLowerCase())
  );

  const minPrice =
    prices.length > 0
      ? Math.min(...prices.map((p) => p.price_per_hour_usd))
      : Infinity;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading GPU Prices...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              GPU Price Intelligence
            </h1>
            <p className="text-slate-400 mt-1">
              CloudDealHunt Live Dashboard
            </p>
          </div>
          <input
            type="text"
            placeholder="Search GPU model..."
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm uppercase">
              Total Instances
            </p>
            <p className="text-3xl font-bold mt-1">{prices.length}</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            <p className="text-slate-500 text-sm uppercase">
              Active Providers
            </p>
            <p className="text-3xl font-bold mt-1 text-blue-400">
              {new Set(prices.map((p) => p.provider)).size}
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-emerald-900/30 shadow-sm">
            <p className="text-emerald-500 text-sm uppercase">Starting At</p>
            <p className="text-3xl font-bold mt-1 text-emerald-400">
              $
              {minPrice === Infinity
                ? "0.00"
                : minPrice.toFixed(2)}
              <span className="text-lg text-slate-500">/hr</span>
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm uppercase">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">GPUs</th>
                <th className="px-6 py-4">VRAM</th>
                <th className="px-6 py-4">vCPUs</th>
                <th className="px-6 py-4">System RAM</th>
                <th className="px-6 py-4">Storage</th>
                <th className="px-6 py-4 text-right">Hourly Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((item, i) => (
                <tr
                  key={i}
                  className="hover:bg-slate-800/30 transition-all"
                >
                  <td className="px-6 py-4 font-semibold text-slate-200">
                    {item.product}
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                      {item.provider}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    {item.gpu_count}
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    {item.vram_gb} GB
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    {item.vcpus}
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    {item.system_ram_gb} GB
                  </td>

                  <td className="px-6 py-4 text-slate-400">
                    {item.local_storage_tb
                      ? `${item.local_storage_tb} TB`
                      : "—"}
                  </td>

                  <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                    {item.raw_price}
                    {item.price_per_hour_usd === minPrice && (
                      <span className="ml-2 text-[10px] bg-emerald-500 text-emerald-950 px-1 rounded">
                        CHEAPEST
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
