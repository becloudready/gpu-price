"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
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

export default function GPUPriceMonitor() {
  const [prices, setPrices] = useState<GPUData[]>([]);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [compareList, setCompareList] = useState<GPUData[]>([]);
  const [loading, setLoading] = useState(true);

  // 🆕 SORT STATE
  const [priceOrder, setPriceOrder] = useState("asc");

  // 🧮 Calculator State
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(30);

  const normalize = (value?: string) =>
    value ? value.toUpperCase().trim() : "";

  const providerLogos: Record<string, string> = {
    AZURE: "/providers/azure.png",
    COREWEAVE: "/providers/coreweave.png",
    CRUSOE: "/providers/crusoe.png",
    DENVR: "/providers/denvr.png",
    GCP: "/providers/gcp.png",
    LAMBDA: "/providers/lambda.png",
    NEBIUS: "/providers/nebius.png",
    RUNPOD: "/providers/runpod.png",
  };

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/prices");
        const data = await res.json();
        setPrices(Array.isArray(data) ? data : []);
      } catch {
        setPrices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const providers = useMemo(() => {
    if (!prices.length) return ["all"];
    return [
      "all",
      ...Array.from(new Set(prices.map((p) => normalize(p.provider)))),
    ];
  }, [prices]);

  const filtered = useMemo(() => {
    let result = [...prices];

    // SEARCH
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        `${p.product} ${p.provider}`
          .toLowerCase()
          .includes(searchLower)
      );
    }

    // FILTER
    if (providerFilter !== "all") {
      result = result.filter(
        (p) => normalize(p.provider) === providerFilter
      );
    }

    // 🔥 PRICE SORT
    result.sort((a, b) => {
      return priceOrder === "asc"
        ? a.price_per_hour_usd - b.price_per_hour_usd
        : b.price_per_hour_usd - a.price_per_hour_usd;
    });

    return result;
  }, [prices, search, providerFilter, priceOrder]);

  const toggleCompare = (gpu: GPUData) => {
    const exists = compareList.some(
      (item) =>
        item.product === gpu.product &&
        item.provider === gpu.provider
    );

    if (exists) {
      setCompareList((prev) =>
        prev.filter(
          (item) =>
            !(
              item.product === gpu.product &&
              item.provider === gpu.provider
            )
        )
      );
    } else if (compareList.length < 3) {
      setCompareList((prev) => [...prev, gpu]);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">
              GPU Price Intelligence
            </h1>
            <p className="text-slate-400">
              Compare GPU cloud pricing instantly
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search GPU or Provider..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2"
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

            {/* 🔥 SORT BUTTON */}
            <button
              onClick={() =>
                setPriceOrder(priceOrder === "asc" ? "desc" : "asc")
              }
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2"
            >
              Sort Price {priceOrder === "asc" ? "⬆" : "⬇"}
            </button>
          </div>
        </div>

        {/* 🧮 CALCULATOR PANEL */}
        {compareList.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold">Cost Calculator</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {compareList.map((gpu) => {
                const monthly =
                  gpu.price_per_hour_usd *
                  hoursPerDay *
                  daysPerMonth;

                return (
                  <div
                    key={`${gpu.provider}-${gpu.product}`}
                    className="bg-slate-800 rounded-xl p-5"
                  >
                    <h3 className="font-semibold">
                      {gpu.provider} - {gpu.product}
                    </h3>
                    <p className="text-emerald-400 font-bold">
                      ${monthly.toFixed(2)} / month
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🔥 COMPARE COUNT */}
        {compareList.length > 0 && (
          <p className="text-sm text-emerald-400">
            Comparing {compareList.length}/3 GPUs
          </p>
        )}

        {/* TABLE */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">Provider</th>
                <th className="px-6 py-4 text-center">GPUs</th>
                <th className="px-6 py-4 text-center">VRAM</th>
                <th className="px-6 py-4 text-center">vCPUs</th>
                <th className="px-6 py-4 text-center">RAM</th>
                <th className="px-6 py-4 text-center">Storage</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-center">Compare</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filtered.map((item, i) => {
                const normalized = normalize(item.provider);
                const logo =
                  providerLogos[
                    Object.keys(providerLogos).find((key) =>
                      normalized.includes(key)
                    ) || ""
                  ];

                return (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4">{item.product}</td>

                    <td className="px-6 py-4 flex items-center gap-2">
                      {logo && (
                        <Image
                          src={logo}
                          alt={normalized}
                          width={24}
                          height={24}
                        />
                      )}
                      {item.provider}
                    </td>

                    <td className="px-6 py-4 text-center">{item.gpu_count}</td>
                    <td className="px-6 py-4 text-center">{item.vram_gb} GB</td>
                    <td className="px-6 py-4 text-center">{item.vcpus}</td>
                    <td className="px-6 py-4 text-center">{item.system_ram_gb} GB</td>
                    <td className="px-6 py-4 text-center">{item.local_storage_tb ?? "—"}</td>

                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                      {item.raw_price}
                    </td>

                    {/* ✅ COMPARE FIX */}
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={compareList.some(
                          (c) =>
                            c.product === item.product &&
                            c.provider === item.provider
                        )}
                        onChange={() => toggleCompare(item)}
                        disabled={
                          !compareList.some(
                            (c) =>
                              c.product === item.product &&
                              c.provider === item.provider
                          ) && compareList.length >= 3
                        }
                        className="w-4 h-4 accent-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CHART */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 min-h-[400px]">
          {filtered.length > 0 ? (
            <PriceVsVRAMChart data={filtered} />
          ) : (
            <div className="text-center text-slate-500">
              No chart data available.
            </div>
          )}
        </div>

      </div>
    </main>
  );
}