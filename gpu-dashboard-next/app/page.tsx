"use client";

import React, { useState, useEffect, useMemo } from "react";
import PriceVsVRAMChart from "@/components/PriceVsVRAMChart";


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

type SortKey = "price" | "vram" | "vcpus" | "ram" | "gpu";

export default function GPUPriceMonitor() {
  const [prices, setPrices] = useState<GPUData[]>([]);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("price");
  const [ascending, setAscending] = useState(true);
  const [loading, setLoading] = useState(true);

  // ✅ SAFE FETCH
  useEffect(() => {
    fetch("http://127.0.0.1:5000/prices")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPrices(data);
        } else {
          console.error("API did not return array:", data);
          setPrices([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setPrices([]);
        setLoading(false);
      });
  }, []);

  const providers = useMemo(() => {
    if (!prices.length) return ["all"];
    return ["all", ...Array.from(new Set(prices.map((p) => p.provider)))];
  }, [prices]);

  const minPrice = useMemo(() => {
    if (!prices.length) return 0;
    return Math.min(...prices.map((p) => p.price_per_hour_usd));
  }, [prices]);

  const filtered = useMemo(() => {
    let result = [...prices]; // prevent mutation

    // Search filter (safe check)
    if (search.trim()) {
      result = result.filter((p) =>
        p.product?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Provider filter
    if (providerFilter !== "all") {
      result = result.filter((p) => p.provider === providerFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case "price":
          valA = a.price_per_hour_usd;
          valB = b.price_per_hour_usd;
          break;
        case "vram":
          valA = a.vram_gb;
          valB = b.vram_gb;
          break;
        case "vcpus":
          valA = a.vcpus;
          valB = b.vcpus;
          break;
        case "ram":
          valA = a.system_ram_gb;
          valB = b.system_ram_gb;
          break;
        case "gpu":
          valA = a.gpu_count;
          valB = b.gpu_count;
          break;
      }

      return ascending ? valA - valB : valB - valA;
    });

    return result;
  }, [prices, search, providerFilter, sortBy, ascending]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setAscending((prev) => !prev);
    } else {
      setSortBy(key);
      setAscending(true);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-xl">
          Fetching live GPU deals...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              GPU Price Intelligence
            </h1>
            <p className="text-slate-400">
              Compare GPU cloud pricing instantly
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search GPU..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card title="Total Instances" value={prices.length} />
          <Card
            title="Active Providers"
            value={providers.length - 1}
            highlight="text-blue-400"
          />
          <Card
            title="Starting At"
            value={`$${minPrice.toFixed(2)}/hr`}
            highlight="text-emerald-400"
          />
        </div>
        {/* Chart */}
        
        {/* Table */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-sm uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => toggleSort("gpu")}>GPUs</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => toggleSort("vram")}>VRAM</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => toggleSort("vcpus")}>vCPUs</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => toggleSort("ram")}>System RAM</th>
                <th className="px-6 py-4">Storage</th>
                <th className="px-6 py-4 text-right cursor-pointer" onClick={() => toggleSort("price")}>
                  Price {sortBy === "price" && (ascending ? "↑" : "↓")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No GPU matches found.
                  </td>
                </tr>
              )}

              {filtered.map((item, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold">{item.product}</td>

                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                      {item.provider.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-6 py-4">{item.gpu_count}</td>
                  <td className="px-6 py-4">{item.vram_gb} GB</td>
                  <td className="px-6 py-4">{item.vcpus}</td>
                  <td className="px-6 py-4">{item.system_ram_gb} GB</td>
                  <td className="px-6 py-4">
                    {item.local_storage_tb ?? "—"}
                    {item.local_storage_tb && " TB"}
                  </td>

                  <td className="px-6 py-4 text-right font-mono text-emerald-400 font-bold">
                    {item.raw_price}
                    {item.price_per_hour_usd === minPrice && (
                      <span className="ml-2 text-[10px] bg-emerald-500 text-emerald-950 px-1 rounded">
                        BEST DEAL
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

function Card({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number | string;
  highlight?: string;
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
      <p className="text-slate-500 text-sm uppercase">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight || ""}`}>
        {value}
      </p>
    </div>
  );
}
