"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DATA_URL, META_URL, ITEMS_PER_PAGE } from "@/lib/constants";
import { normalizeRow, unique } from "@/lib/utils";
import CostCalculator from "./CostCalculator";
import type { GPURaw, GPURow, Meta } from "@/types/gpu";
import Header from "./Header";
import DataTable from "./DataTable";
import TableSkeleton from "./TableSkeleton";
import PriceHistoryPanel from "./PriceHistoryPanel";
import GPUCompare from "./GPUCompare";
import { LayoutDashboard, Settings2, TrendingDown, Zap } from "lucide-react";

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Dashboard() {
  const [data, setData] = useState<GPURow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(true);
  const [selectedRows, setSelectedRows] = useState<GPURow[]>([]);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [gpuType, setGpuType] = useState("all");
  const [numGpus, setNumGpus] = useState("all");
  const [sortKey, setSortKey] = useState<keyof GPURow>("price_num");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 200);

  const loadData = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [dataRes, metaRes] = await Promise.allSettled([fetch(DATA_URL), fetch(META_URL)]);
      if (dataRes.status !== "fulfilled" || !dataRes.value.ok) throw new Error("Fetch failed");
      const raw = (await dataRes.value.json()) as GPURaw[];
      const rows = raw.map(normalizeRow).filter(r => (r.gpu || r.provider) && r.gpu_count !== null);
      setData(rows);
      if (metaRes.status === "fulfilled" && metaRes.value.ok) setMeta((await metaRes.value.json()) as Meta);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
      setStatus("error");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const providers = useMemo(() => unique(data.map((r) => r.provider).filter(Boolean)).sort(), [data]);
  const gpuTypes = useMemo(() => unique(data.map((r) => r.gpu).filter(Boolean)).sort(), [data]);
  const gpuCounts = useMemo(() => unique(data.map((r) => String(r.gpu_count)).filter(Boolean)).sort((a, b) => Number(a) - Number(b)), [data]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return data
      .filter((r) => {
        if (provider !== "all" && r.provider !== provider) return false;
        if (gpuType !== "all" && r.gpu !== gpuType) return false;
        if (numGpus !== "all" && String(r.gpu_count) !== numGpus) return false;
        if (q) return `${r.provider} ${r.gpu}`.toLowerCase().includes(q);
        return true;
      })
      .sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va === null || vb === null) return 0;
        const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? c : -c;
      });
  }, [data, debouncedSearch, provider, gpuType, numGpus, sortKey, sortDir]);

  const insights = useMemo(() => {
    const valid = filtered.filter((r) => r.price_num !== null);
    if (valid.length === 0) return null;
    const cheapest = valid.reduce((min, r) => (r.price_num as number) < (min.price_num as number) ? r : min);
    const bestValue = valid.reduce((best, r) => {
      const val = (r.vram as number) / (r.price_num as number);
      const bestVal = (best.vram as number) / (best.price_num as number);
      return val > bestVal ? r : best;
    });
    return { cheapest, bestValue };
  }, [filtered]);

  const stats = useMemo(() => ({
    minPrice: data.length ? Math.min(...data.filter(r => r.price_num).map(r => r.price_num as number)) : null,
    updatedAt: meta?.generated_at_utc ?? meta?.generated_at ?? null,
  }), [data, meta]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <Header updatedAt={stats.updatedAt} rowCount={data.length} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* --- Hero Section --- */}
        <section className="text-center mb-10 space-y-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 italic uppercase leading-none">
            CloudDealHunt <span className="text-indigo-600">Analytics</span>
          </h1>
          <p className="text-zinc-500 max-w-2xl mx-auto font-medium text-sm">
            Advanced GPU Pricing Engine. Compare rates across neo-cloud providers with real-time value indexing.
          </p>
        </section>

        {status === "loading" && <TableSkeleton />}

        {status === "done" && (
          <div className="flex flex-col">
            
            {/* --- Control Bar --- */}
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="text-indigo-500" size={20} />
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Dashboard View</span>
              </div>
              <button
                onClick={() => setShowTools(!showTools)}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-black uppercase transition hover:opacity-90 active:scale-95"
              >
                <Settings2 size={14} />
                {showTools ? "Hide Tools" : "Show Insights"}
              </button>
            </div>

            {/* --- Tools & Insights Wrapper --- */}
            {showTools ? (
              <div className="flex flex-col space-y-10 mb-10 animate-in fade-in slide-in-from-top-2 duration-500">
                {/* Advanced Tools */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4">
                    <CostCalculator data={filtered} />
                  </div>
                  <div className="lg:col-span-8">
                    <GPUCompare data={filtered} />
                  </div>
                </div>

                {/* Insight Cards */}
                {insights && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InsightCard 
                      title="Cheapest Node" 
                      icon={<TrendingDown />} 
                      row={insights.cheapest} 
                      color="emerald" 
                      metric={`$${insights.cheapest.price_num}/hr`}
                    />
                    <InsightCard 
                      title="Best Value Node" 
                      icon={<Zap />} 
                      row={insights.bestValue} 
                      color="indigo" 
                      metric={`${((insights.bestValue.vram || 0) / (insights.bestValue.price_num || 1)).toFixed(2)} GB/$`}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {/* --- Main Data Table (Moves up when tools are hidden) --- */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Market Inventory</h3>
              </div>
              <DataTable
                rows={filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)}
                providers={unique(data.map(r => r.provider)).sort()}
                gpuTypes={unique(data.map(r => r.gpu)).sort()}
                gpuCounts={unique(data.map(r => String(r.gpu_count))).sort((a,b) => Number(a)-Number(b))}
                selectedProvider={provider}
                selectedGpuType={gpuType}
                selectedNumGpus={numGpus}
                search={search}
                onSearch={(s) => { setSearch(s); setPage(1); }}
                onProvider={(p) => { setProvider(p); setPage(1); }}
                onGpuType={(t) => { setGpuType(t); setPage(1); }}
                onNumGpus={(n) => { setNumGpus(n); setPage(1); }}
                onReset={() => { setProvider("all"); setGpuType("all"); setNumGpus("all"); setSearch(""); }}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={(k) => { if(sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc"); else setSortKey(k); }}
                page={page}
                totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                onPageChange={setPage}
                minPrice={stats.minPrice}
                selectedRows={selectedRows}
                onSelectRow={(row) => setSelectedRows(prev => prev.find(r => r.id === row.id) ? prev.filter(r => r.id !== row.id) : [...prev, row].slice(-4))}
              />
            </section>
          </div>
        )}
      </main>

      {selectedRows.length > 0 && (
        <PriceHistoryPanel rows={selectedRows} onClose={() => setSelectedRows([])} onRemoveRow={(row) => setSelectedRows(selectedRows.filter((r) => !(r.provider === row.provider && r.gpu === row.gpu)))} />
      )}
    </div>
  );
}

// --- Sub-component: Insight Card ---
function InsightCard({ title, icon, row, color, metric }: { title: string, icon: React.ReactNode, row: GPURow, color: string, metric: string }) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600",
    indigo: "border-indigo-200 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600",
  };

  return (
    <div className={`p-6 rounded-3xl border ${colors[color]} flex items-center justify-between shadow-sm`}>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{row.gpu} <span className="text-zinc-400 font-medium">via</span> {row.provider}</h4>
        <p className="text-xl font-black italic">{metric}</p>
      </div>
      <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-inner text-zinc-400">
        {icon}
      </div>
    </div>
  );
}