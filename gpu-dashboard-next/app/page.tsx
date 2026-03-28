"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Zap, Search, RotateCcw, ChevronLeft, ChevronRight, Star, Check, Calculator, BarChart3,X } from "lucide-react";

// --- CHART.JS IMPORTS ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Scatter, Bar } from 'react-chartjs-2';

// --- REGISTER CHART COMPONENTS ---
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

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

interface HistoryPoint {
  date: string;
  price: number;
}

export default function GPUPriceMonitor() {
  // Data State
  const [prices, setPrices] = useState<GPUData[]>([]);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [gpuType, setGpuType] = useState("all");
  const [vramRange, setVramRange] = useState<[number, number]>([0, 200]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  
  // Sort & Toggles
  const [priceOrder, setPriceOrder] = useState("asc");
  const [bestValue, setBestValue] = useState(false);
  const [topDeals, setTopDeals] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 12;

  // Features State (Calculator, Modal, Analytics)
  const [compareList, setCompareList] = useState<GPUData[]>([]);
  const [selectedGPU, setSelectedGPU] = useState<GPUData | null>(null);
  const [modalTab, setModalTab] = useState<"specs" | "trends">("specs");
  const [analyticsTab, setAnalyticsTab] = useState<"scatter" | "distribution" | "histogram">("scatter");
  
  // Calculator Interactive State
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(22);
  // Add this line with your other states
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const normalize = (value?: string) => value ? value.toUpperCase().trim() : "";

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

  const providerColors: Record<string, string> = {
    coreweave: '#8b5cf6', // Purple
    denvr: '#f59e0b', // Amber
    crusoe: '#10b981', // Emerald
    lambda: '#3b82f6', // Blue
    runpod: '#ec4899', // Pink
    azure: '#0ea5e9', // Light Blue
    gcp: '#ef4444', // Red
    nebius: '#84cc16', // Lime
  };

  // --- INITIAL DATA FETCH & THEME SETUP ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.backgroundColor = "#000000";
    }

    const fetchPrices = async () => {
      try {
        const mergedMap = new Map<string, GPUData>();

        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const date = d.toISOString().split("T")[0];
          const url = `https://freellm.org/history/${date}/all.json`;

          try {
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                data.forEach((item: Partial<GPUData>) => {
                  const provider = item.provider || "Unknown";
                  const product = item.product || "Unknown GPU";
                  const key = `${provider}-${product}`;
                  const rawPrice = Number(item.price_per_hour_usd) || 0;
                  
                  if (rawPrice > 0 && !mergedMap.has(key)) {
                    mergedMap.set(key, {
                      provider, 
                      product,
                      gpu_count: item.gpu_count ?? 0,
                      vram_gb: Number(item.vram_gb) || 0,
                      vcpus: Number(item.vcpus) || 0,
                      system_ram_gb: Number(item.system_ram_gb) || 0,
                      local_storage_tb: item.local_storage_tb ?? null,
                      price_per_hour_usd: rawPrice,
                      raw_price: item.raw_price || `$${rawPrice.toFixed(3)}/hr`,
                    });
                  }
                });
              }
            }
          } catch (err) {}
        }

        const cleanedData = Array.from(mergedMap.values());
        
        if (cleanedData.length > 0) {
          setPrices(cleanedData);
          const minV = Math.min(...cleanedData.map(p => p.vram_gb));
          const maxV = Math.max(...cleanedData.map(p => p.vram_gb));
          const minP = Math.min(...cleanedData.map(p => p.price_per_hour_usd));
          const maxP = Math.max(...cleanedData.map(p => p.price_per_hour_usd));
          
          setVramRange([minV, maxV]);
          setPriceRange([minP, maxP]);
        } else {
          setPrices([]);
        }
      } catch (err) {
        setPrices([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, []);

  // --- DERIVED DATA ---
  const gpuTypes = useMemo(() => {
    const types = new Set<string>();
    prices.forEach((p) => {
      if (p.product.includes("A100")) types.add("A100");
      else if (p.product.includes("H100")) types.add("H100");
      else if (p.product.includes("L40")) types.add("L40");
    });
    return ["all", ...Array.from(types)];
  }, [prices]);

  const limits = useMemo(() => {
    if (!prices.length) return { minVRAM: 0, maxVRAM: 200, minPrice: 0, maxPrice: 100 };
    return {
      minVRAM: Math.min(...prices.map((p) => p.vram_gb)),
      maxVRAM: Math.max(...prices.map((p) => p.vram_gb)),
      minPrice: Math.min(...prices.map((p) => p.price_per_hour_usd)),
      maxPrice: Math.max(...prices.map((p) => p.price_per_hour_usd)),
    };
  }, [prices]);

  const providers = useMemo(() => {
    if (!prices.length) return ["all"];
    return ["all", ...Array.from(new Set(prices.map((p) => normalize(p.provider))))];
  }, [prices]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [search, providerFilter, priceOrder, gpuType, bestValue, vramRange, priceRange, topDeals]);

  const filtered = useMemo(() => {
    let result = [...prices];
    
    if (gpuType !== "all") result = result.filter((p) => p.product.toUpperCase().includes(gpuType));
    
    result = result.filter((p) => p.vram_gb >= (vramRange[0] ?? 0) && p.vram_gb <= (vramRange[1] ?? limits.maxVRAM));
    result = result.filter((p) => p.price_per_hour_usd >= (priceRange[0] ?? 0) && p.price_per_hour_usd <= (priceRange[1] ?? limits.maxPrice));

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) => `${p.product} ${p.provider}`.toLowerCase().includes(searchLower));
    }
    
    if (providerFilter !== "all") result = result.filter((p) => normalize(p.provider) === providerFilter);

    result.sort((a, b) => {
      if (bestValue) {
        const ratioA = a.vram_gb > 0 ? (a.price_per_hour_usd / a.vram_gb) : Infinity;
        const ratioB = b.vram_gb > 0 ? (b.price_per_hour_usd / b.vram_gb) : Infinity;
        return ratioA - ratioB;
      }
      return priceOrder === "asc" ? a.price_per_hour_usd - b.price_per_hour_usd : b.price_per_hour_usd - a.price_per_hour_usd;
    });

    if (topDeals) result = result.slice(0, 10);
    return result;
  }, [prices, search, providerFilter, priceOrder, gpuType, bestValue, vramRange, priceRange, topDeals, limits]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    if (!filtered.length) return { total: 0, providers: [], cheapest: 0, cheapestGPU: "N/A", avg: 0 };
    
    const validItems = filtered.filter(p => p.price_per_hour_usd > 0);
    if (!validItems.length) return { total: filtered.length, providers: [], cheapest: 0, cheapestGPU: "N/A", avg: 0 };

    const total = filtered.length;
    const providers = Array.from(new Set(filtered.map((p) => p.provider)));
    const cheapestItem = validItems.reduce((min, curr) => curr.price_per_hour_usd < min.price_per_hour_usd ? curr : min);
    const avg = validItems.reduce((sum, p) => sum + p.price_per_hour_usd, 0) / validItems.length;

    return {
      total, providers, cheapest: cheapestItem.price_per_hour_usd,
      cheapestGPU: `${cheapestItem.product} · ${cheapestItem.provider}`, avg,
    };
  }, [filtered]);

  // --- ACTIONS & HANDLERS ---
  const resetFilters = () => {
    setSearch("");
    setProviderFilter("all");
    setGpuType("all");
    setVramRange([limits.minVRAM, limits.maxVRAM]);
    setPriceRange([limits.minPrice, limits.maxPrice]);
    setPriceOrder("asc");
    setBestValue(false);
    setTopDeals(false);
    setCurrentPage(1);
  };

  const toggleCompare = (gpu: GPUData) => {
    const exists = compareList.some((item) => item.product === gpu.product && item.provider === gpu.provider);
    if (exists) {
      setCompareList((prev) => prev.filter((item) => !(item.product === gpu.product && item.provider === gpu.provider)));
    } else if (compareList.length < 3) {
      setCompareList((prev) => [...prev, gpu]);
    }
  };

  const fetchHistory = async (gpu: GPUData) => {
    let history: HistoryPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      const url = `https://freellm.org/history/${date}/all.json`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data: GPUData[] = await res.json();
        const match = data.find((item) => item.product === gpu.product && item.provider === gpu.provider);
        if (match && Number(match.price_per_hour_usd) > 0) {
          history.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: Number(match.price_per_hour_usd),
          });
        }
      } catch (err) {}
    }
    setHistoryData(history.reverse());
  };

  // --- SCATTER CHART LOGIC ---
  const scatterDatasets = useMemo(() => {
    const providerGroups = Array.from(new Set(filtered.map(d => d.provider)));
    return providerGroups.map(provider => {
      const pColor = providerColors[provider.toLowerCase()] || '#a1a1aa';
      return {
        label: provider.toUpperCase(),
        data: filtered.filter(d => d.provider === provider).map(d => ({
          x: d.vram_gb,
          y: d.price_per_hour_usd,
          gpuName: d.product
        })),
        backgroundColor: pColor,
        borderColor: pColor,
        pointRadius: 6,
        pointHoverRadius: 9,
      }
    });
  }, [filtered]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#a1a1aa', boxWidth: 10, usePointStyle: true, padding: 20 } },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        titleColor: '#fff', bodyColor: '#ccc', borderColor: '#333', borderWidth: 1, padding: 12,
        callbacks: {
          label: function(context: any) {
            return `${context.raw.gpuName}: $${context.parsed.y.toFixed(2)}/hr (${context.parsed.x}GB VRAM)`;
          }
        }
      },
    },
    scales: {
      x: { 
        title: { display: true, text: 'VRAM (GB)', color: '#888' },
        grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [4, 4] }, 
        ticks: { color: '#666' } 
      },
      y: {
        title: { display: true, text: 'Price/hr ($)', color: '#888' },
        grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [4, 4] },
        ticks: { color: '#666', callback: function(value: any) { return '$' + value; } }
      }
    }
  };

  // Line Chart for Modal
  const lineChartData = {
    labels: historyData.map(d => d.date),
    datasets: [{
      label: 'Price ($/hr)', data: historyData.map(d => d.price),
      borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderWidth: 3, fill: true, tension: 0.4, 
      pointBackgroundColor: '#0a0a0a', pointBorderColor: '#3b82f6', pointBorderWidth: 2, pointRadius: 4,
      pointHoverRadius: 6, pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#3b82f6',
    }],
  };

  const lineChartOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.95)', titleColor: '#888', bodyColor: '#fff', borderColor: '#333', borderWidth: 1, padding: 12, displayColors: false,
        callbacks: { label: function(context: any) { return `$${context.parsed.y.toFixed(3)} / hr`; } }
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#666', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, border: { dash: [4, 4] }, ticks: { color: '#666', font: { size: 11 }, callback: function(value: any) { return '$' + value; } }, beginAtZero: false }
    }
  };

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse flex items-center space-x-3">
          <Zap className="w-6 h-6 text-blue-500" fill="currentColor" />
          <span className="text-lg font-medium tracking-widest uppercase text-gray-500">Loading Market Data...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans p-6 selection:bg-blue-500/30 pb-24">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2 group">
            <Zap className="w-6 h-6 text-blue-500 group-hover:scale-110 transition" fill="currentColor" />
            <span className="text-xl font-bold tracking-tight">CloudDealHunt</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a href="#" className="text-white border-b-2 border-blue-500 pb-1">GPU Tracker</a>
          </div>
          <div className="w-[120px] flex justify-end"></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto space-y-10 flex flex-col items-center mt-8 px-6">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-4">
           <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
             GPU Price Intelligence
           </h1>
           <p className="text-gray-400 text-lg max-w-2xl mx-auto">
             Real-time monitoring and comparison of cloud computing costs across all major providers.
           </p>
        </div>
            <button 
  onClick={() => setIsAnalyticsOpen(true)}
  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-bold text-xs uppercase tracking-widest"
>
  <BarChart3 className="w-4 h-4" /> 
  Market Insights
</button>
        {/* STATS GRID */}
        <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-2">Total Listings</p>
            <p className="text-3xl font-bold tracking-tight">{stats.total}</p>
            <p className="text-xs text-gray-600 mt-1">Live market instances</p>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-2">Unique Providers</p>
            <p className="text-3xl font-bold tracking-tight">{stats.providers.length}</p>
            <p className="text-xs text-gray-600 truncate mt-1">{stats.providers.join(", ") || "N/A"}</p>
          </div>
          <div className="bg-blue-600/5 border border-blue-500/30 rounded-2xl p-6 shadow-sm">
            <p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest mb-2">Cheapest Rate</p>
            <p className="text-3xl font-bold tracking-tight text-blue-500">${stats.cheapest.toFixed(2)}</p>
            <p className="text-xs text-blue-400/60 truncate mt-1">{stats.cheapestGPU}</p>
          </div>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-sm hover:border-gray-700 transition">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-2">Market Average</p>
            <p className="text-3xl font-bold tracking-tight">${stats.avg.toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-1">across active networks</p>
          </div>
        </div>

        {/* QUICK FILTERS */}
        <div className="flex flex-wrap gap-3 w-full justify-center md:justify-start">
          {gpuTypes.map(type => (
            <button
              key={type}
              onClick={() => setGpuType(type)}
              className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all ${
                gpuType === type 
                ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                : "bg-[#0a0a0a] border-gray-800 text-gray-400 hover:border-gray-500"
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>

        

        {/* MAIN FILTER BAR */}
        <div className="w-full bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 items-end">
            
            <div className="space-y-2 lg:col-span-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text" 
                  placeholder="GPU or Provider..." 
                  value={search || ""}
                  className="w-full bg-black border border-gray-800 rounded-lg py-3 pl-11 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 lg:col-span-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Provider</label>
              <select
                className="w-full bg-black border border-gray-800 rounded-lg py-3 px-4 text-sm focus:border-blue-500 outline-none cursor-pointer appearance-none"
                value={providerFilter || "all"} 
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                {providers.map((p) => <option key={p} value={p}>{p === "all" ? "All Providers" : p}</option>)}
              </select>
            </div>

            <div className="space-y-4 lg:col-span-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-gray-500">VRAM</span>
                <span className="text-white">{vramRange[0] ?? 0}–{vramRange[1] ?? 200} GB</span>
              </div>
              <div className="flex gap-2 relative">
                <input 
                  type="range" 
                  min={limits.minVRAM} 
                  max={limits.maxVRAM} 
                  value={vramRange[0] ?? limits.minVRAM} 
                  onChange={(e) => setVramRange([+e.target.value, vramRange[1]])} 
                  className="w-1/2 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
                <input 
                  type="range" 
                  min={limits.minVRAM} 
                  max={limits.maxVRAM} 
                  value={vramRange[1] ?? limits.maxVRAM} 
                  onChange={(e) => setVramRange([vramRange[0], +e.target.value])} 
                  className="w-1/2 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
              </div>
            </div>

            <div className="space-y-4 lg:col-span-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                <span className="text-gray-500">Price</span>
                <span className="text-white">${(priceRange[0] ?? limits.minPrice).toFixed(2)}–${(priceRange[1] ?? limits.maxPrice).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="range" 
                  min={limits.minPrice} 
                  max={limits.maxPrice} 
                  step="0.01" 
                  value={priceRange[0] ?? limits.minPrice} 
                  onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])} 
                  className="w-1/2 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
                <input 
                  type="range" 
                  min={limits.minPrice} 
                  max={limits.maxPrice} 
                  step="0.01" 
                  value={priceRange[1] ?? limits.maxPrice} 
                  onChange={(e) => setPriceRange([priceRange[0], +e.target.value])} 
                  className="w-1/2 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                />
              </div>
            </div>

            <div className="space-y-2 lg:col-span-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sort By</label>
              <select
                className="w-full bg-black border border-gray-800 rounded-lg py-3 px-4 text-sm outline-none cursor-pointer disabled:opacity-50 appearance-none"
                value={priceOrder || "asc"} 
                onChange={(e) => setPriceOrder(e.target.value)} 
                disabled={bestValue}
              >
                <option value="asc">Price (Low to High)</option>
                <option value="desc">Price (High to Low)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-gray-800/60">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <div className="text-sm text-gray-500">
                {filtered.length > 0 ? (
                  <>Showing <span className="text-white font-bold">{(currentPage - 1) * ROWS_PER_PAGE + 1} - {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)}</span> of <span className="text-white font-bold">{filtered.length}</span> results</>
                ) : ("No results found")}
              </div>
              <button 
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition ml-4 bg-gray-900 px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer hover:text-white transition font-medium">
                <input 
                  type="checkbox" 
                  checked={bestValue || false} 
                  onChange={() => setBestValue(!bestValue)} 
                  className="w-4 h-4 rounded border-gray-600 bg-black checked:bg-blue-500 accent-blue-500 cursor-pointer" 
                />
                Best Value (Price/VRAM)
              </label>
              <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer hover:text-white transition font-medium">
                <input 
                  type="checkbox" 
                  checked={topDeals || false} 
                  onChange={() => setTopDeals(!topDeals)} 
                  className="w-4 h-4 rounded border-gray-600 bg-black checked:bg-blue-500 accent-blue-500 cursor-pointer" 
                />
                Top Deals Only
              </label>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="w-full border border-gray-800 rounded-2xl overflow-hidden bg-[#0a0a0a] shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 font-bold bg-black/40">
                <tr>
                  <th className="px-6 py-5">GPU Model</th>
                  <th className="px-6 py-5">Provider</th>
                  <th className="px-6 py-5 text-center">Nodes</th>
                  <th className="px-6 py-5 text-center">VRAM</th>
                  <th className="px-6 py-5 text-center">vCPUs</th>
                  <th className="px-6 py-5 text-center">RAM</th>
                  <th className="px-6 py-5 text-center">Storage</th>
                  <th className="px-6 py-5 text-right">Price/hr</th>
                  <th className="px-6 py-5 text-center">Compare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, i) => {
                    const normalized = normalize(item.provider);
                    const logo = providerLogos[Object.keys(providerLogos).find((key) => normalized.includes(key)) || ""];
                    
                    return (
                      <tr 
                        key={i} 
                        onClick={() => { 
                          setSelectedGPU(item); 
                          setModalTab("specs");
                          fetchHistory(item); 
                        }} 
                        className="hover:bg-blue-500/[0.02] transition cursor-pointer group"
                      >
                        <td className="px-6 py-4 font-semibold text-gray-200 group-hover:text-blue-400 transition-colors">{item.product}</td>
                        <td className="px-6 py-4 flex items-center gap-3 text-gray-400">
                          {logo && <Image src={logo} alt={normalized} width={20} height={20} className="rounded-sm" />}
                          <span className="capitalize">{item.provider.toLowerCase()}</span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500">{item.gpu_count}</td>
                        <td className="px-6 py-4 text-center text-white font-mono">{item.vram_gb} <span className="text-[10px] text-gray-500 font-sans">GB</span></td>
                        <td className="px-6 py-4 text-center text-gray-500">{item.vcpus}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{item.system_ram_gb} <span className="text-[10px] text-gray-500">GB</span></td>
                        <td className="px-6 py-4 text-center text-gray-500">{item.local_storage_tb ? `${item.local_storage_tb} TB` : "—"}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-block px-3 py-1 rounded-md bg-white/5 text-white font-mono font-bold">{item.raw_price}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            onClick={(e) => e.stopPropagation()} 
                            checked={compareList.some(c => c.product === item.product && c.provider === item.provider) || false} 
                            onChange={() => toggleCompare(item)} 
                            disabled={!compareList.some(c => c.product === item.product && c.provider === item.provider) && compareList.length >= 3} 
                            className="w-5 h-5 rounded border-gray-700 bg-black checked:bg-blue-500 cursor-pointer accent-blue-500 transition-all" 
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={9} className="text-center py-20 text-gray-500">No GPUs found matching your filters. Try adjusting the sliders.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-5 border-t border-gray-800 bg-[#0a0a0a]">
              <button 
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1} 
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black border border-gray-800 rounded-lg hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <div className="text-sm text-gray-500 font-medium">
                Page <span className="text-white mx-1">{currentPage}</span> of <span className="text-white mx-1">{totalPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-black border border-gray-800 rounded-lg hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div> 

      {/* MODAL (Tabs: Specs / Trends) */}
      {selectedGPU && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0a0a0a] border border-gray-800 p-6 md:p-8 rounded-3xl w-full max-w-3xl relative shadow-2xl">
            <button 
              onClick={() => setSelectedGPU(null)} 
              className="absolute top-5 right-5 text-gray-500 hover:text-white transition text-xl"
            >
              ✕
            </button>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">GPU Details</h2>
              <div className="flex bg-[#111] p-1 rounded-full border border-gray-800">
                <button 
                  onClick={() => setModalTab('specs')}
                  className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${modalTab === 'specs' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Specs
                </button>
                <button 
                  onClick={() => setModalTab('trends')}
                  className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${modalTab === 'trends' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Price Trends
                </button>
              </div>
            </div>

            {modalTab === 'specs' ? (
              <div className="w-full border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800/60 bg-[#111]/40">
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">Provider & Model</span>
                  <div className="text-right">
                    <div className="text-blue-500 text-[10px] font-bold uppercase tracking-widest">{selectedGPU.provider}</div>
                    <div className="text-white font-semibold text-sm">{selectedGPU.product}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">Nodes / GPUs</span>
                  <span className="text-blue-400 font-medium text-sm flex items-center gap-1.5">
                    {selectedGPU.gpu_count} <Star className="w-3.5 h-3.5 fill-current"/>
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">VRAM (GB)</span>
                  <span className="text-blue-400 font-medium text-sm flex items-center gap-1.5">
                    {selectedGPU.vram_gb} <Star className="w-3.5 h-3.5 fill-current"/>
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">vCPUs</span>
                  <span className="text-blue-400 font-medium text-sm flex items-center gap-1.5">
                    {selectedGPU.vcpus} <Star className="w-3.5 h-3.5 fill-current"/>
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">RAM (GB)</span>
                  <span className="text-blue-400 font-medium text-sm flex items-center gap-1.5">
                    {selectedGPU.system_ram_gb} <Star className="w-3.5 h-3.5 fill-current"/>
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition">
                  <span className="text-gray-500 text-sm font-medium">Storage (TB)</span>
                  <span className="text-gray-300 font-medium text-sm">
                    {selectedGPU.local_storage_tb ? `${selectedGPU.local_storage_tb} TB` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 md:px-6 hover:bg-[#1a1a1a] transition bg-green-900/10">
                  <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Price/hr</span>
                  <span className="text-emerald-400 font-bold text-lg flex items-center gap-1.5">
                    ${selectedGPU.price_per_hour_usd.toFixed(3)} <Check className="w-5 h-5"/>
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="mb-4">
                  <p className="text-white text-lg font-bold">{selectedGPU.product}</p>
                  <p className="text-blue-500 text-[10px] font-bold uppercase tracking-widest">{selectedGPU.provider}</p>
                </div>
                {historyData.length === 0 ? (
                  <p className="text-gray-500 h-[300px] flex items-center justify-center italic bg-[#111]/40 rounded-2xl border border-gray-800">
                    Generating price trend...
                  </p>
                ) : (
                  <div className="h-[300px] w-full relative bg-[#111]/40 p-4 rounded-2xl border border-gray-800">
                    <Line options={lineChartOptions} data={lineChartData} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ... existing table and pagination ... */}

      {/* 🔥 PLACE THE NEW POPUP SECTION HERE (Just before </main>) */}
      {isAnalyticsOpen && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    
    {/* Background */}
    <div 
      className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      onClick={() => setIsAnalyticsOpen(false)}
    />

    {/* Modal */}
    <div className="relative w-full max-w-6xl bg-[#0a0a0a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="text-blue-500" /> Market Analytics & Calculator
        </h2>
        <button 
          onClick={() => setIsAnalyticsOpen(false)} 
          className="text-gray-500 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* CONTENT */}
      <div className="p-8 overflow-y-auto max-h-[80vh]">
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT - CALCULATOR */}
          <div className="lg:col-span-4 bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-6">
              <Calculator className="w-5 h-5 text-blue-500" /> Monthly Cost Calculator
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400">Hours/day: {hoursPerDay}</p>
                <input type="range" min="1" max="24" value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(+e.target.value)}
                  className="w-full accent-blue-500" />
              </div>

              <div>
                <p className="text-xs text-gray-400">Days/month: {daysPerMonth}</p>
                <input type="range" min="1" max="31" value={daysPerMonth}
                  onChange={(e) => setDaysPerMonth(+e.target.value)}
                  className="w-full accent-blue-500" />
              </div>

              {compareList.length === 0 ? (
                <p className="text-gray-500 text-sm">Select GPUs to calculate cost</p>
              ) : (
                compareList.map((gpu) => {
                  const monthly = gpu.price_per_hour_usd * hoursPerDay * daysPerMonth;
                  return (
                    <div key={gpu.product} className="border border-green-500/30 p-3 rounded-lg">
                      <p className="text-xs text-gray-400">{gpu.provider}</p>
                      <p className="text-white text-sm">{gpu.product}</p>
                      <p className="text-green-400 font-bold">${monthly.toFixed(2)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT - CHART */}
          <div className="lg:col-span-8 bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Market Analytics
            </div>

            <div className="h-[400px]">
              <Scatter options={scatterOptions} data={{ datasets: scatterDatasets }} />
            </div>
          </div>

        </div>

      </div>
    </div>
  </div>
)}
    </main> // This is the final closing tag of your file
  );
}