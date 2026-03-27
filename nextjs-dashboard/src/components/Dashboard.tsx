"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DATA_URL, META_URL, ITEMS_PER_PAGE } from "@/lib/constants";
import { normalizeRow, unique } from "@/lib/utils";
import type { GPURaw, GPURow, Meta } from "@/types/gpu";
import Header from "./Header";
import DataTable from "./DataTable";
import TableSkeleton from "./TableSkeleton";
import PriceHistoryPanel from "./PriceHistoryPanel";

// ─── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<GPURow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState<string | null>(null);

  // Row selection for price history (max 4)
  const [selectedRows, setSelectedRows] = useState<GPURow[]>([]);

  // Filter / sort
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [gpuType, setGpuType] = useState("all");
  const [numGpus, setNumGpus] = useState("all");
  const [sortKey, setSortKey] = useState<keyof GPURow>("price_num");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 200);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [dataRes, metaRes] = await Promise.allSettled([
        fetch(DATA_URL),
        fetch(META_URL),
      ]);

      if (dataRes.status !== "fulfilled" || !dataRes.value.ok) {
        throw new Error(
          `Failed to fetch pricing data (${
            dataRes.status === "fulfilled"
              ? `HTTP ${dataRes.value.status}`
              : "network error"
          })`
        );
      }

      const raw = (await dataRes.value.json()) as GPURaw[];
      if (!Array.isArray(raw)) throw new Error("Unexpected response format");

      const rows = raw
        .map(normalizeRow)
        .filter(
          (r) =>
            (r.gpu || r.provider) &&
            r.gpu_count !== null &&
            r.vram !== null &&
            r.vcpu !== null &&
            r.ram !== null
        );
      setData(rows);

      if (metaRes.status === "fulfilled" && metaRes.value.ok) {
        setMeta((await metaRes.value.json()) as Meta);
      }

      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived state ─────────────────────────────────────────────────────────────
  const providers = useMemo(
    () => unique(data.map((r) => r.provider).filter(Boolean)).sort(),
    [data]
  );

  const gpuTypes = useMemo(
    () => unique(data.map((r) => r.gpu).filter(Boolean)).sort(),
    [data]
  );

  const gpuCounts = useMemo(
    () =>
      unique(data.map((r) => (r.gpu_count !== null ? String(r.gpu_count) : "")).filter(Boolean))
        .sort((a, b) => Number(a) - Number(b)),
    [data]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return data
      .filter((r) => {
        if (provider !== "all" && r.provider !== provider) return false;
        if (gpuType !== "all" && r.gpu !== gpuType) return false;
        if (numGpus !== "all" && String(r.gpu_count) !== numGpus) return false;
        if (q) {
          const hay = `${r.provider} ${r.gpu}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        let c = 0;
        if (typeof va === "number" && typeof vb === "number") {
          c = va - vb;
        } else {
          c = String(va).localeCompare(String(vb));
        }
        return sortDir === "asc" ? c : -c;
      });
  }, [data, debouncedSearch, provider, gpuType, numGpus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSort = (key: keyof GPURow) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setProvider("all");
    setGpuType("all");
    setNumGpus("all");
    setSortKey("price_num");
    setSortDir("asc");
    setPage(1);
    setSelectedRows([]);
  };

  const handleSelectRow = (row: GPURow) => {
    setSelectedRows((prev) => {
      const exists = prev.some((r) => r.provider === row.provider && r.gpu === row.gpu);
      if (exists) return prev.filter((r) => !(r.provider === row.provider && r.gpu === row.gpu));
      if (prev.length >= 4) return prev;
      return [...prev, row];
    });
  };

  const handleRemoveRow = (row: GPURow) => {
    setSelectedRows((prev) => prev.filter((r) => !(r.provider === row.provider && r.gpu === row.gpu)));
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const prices = data
      .filter((r) => r.price_num !== null)
      .map((r) => r.price_num as number);
    const minPrice = prices.length ? Math.min(...prices) : null;
    return {
      minPrice,
      updatedAt: meta?.generated_at_utc ?? meta?.generated_at ?? null,
    };
  }, [data, meta]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header
        updatedAt={stats.updatedAt}
        rowCount={status === "done" ? data.length : 0}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-7">
          <h1 className="relative z-0 text-center font-sans text-[24px] md:text-5xl font-semibold leading-[108%] tracking-[-0.24px] md:tracking-[-0.025rem] text-zinc-900 dark:text-zinc-50">
            GPU Cloud Pricing
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500">
            Compare pricing across neo cloud providers · Data refreshes nightly
          </p>
        </div>

        {/* Table */}
        <div className="mt-6">
          {status === "loading" && <TableSkeleton />}

          {status === "error" && (
            <div className="rounded-xl border border-red-300/60 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-10 text-center">
              <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                Try again
              </button>
            </div>
          )}

          {status === "done" && (
            <>
              <DataTable
                rows={paginated}
                providers={providers}
                gpuTypes={gpuTypes}
                gpuCounts={gpuCounts}
                selectedProvider={provider}
                selectedGpuType={gpuType}
                selectedNumGpus={numGpus}
                search={search}
                onSearch={(s) => { setSearch(s); setPage(1); }}
                onProvider={(p) => { setProvider(p); setPage(1); }}
                onGpuType={(t) => { setGpuType(t); setPage(1); }}
                onNumGpus={(n) => { setNumGpus(n); setPage(1); }}
                onReset={handleReset}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
                minPrice={stats.minPrice}
                selectedRows={selectedRows}
                onSelectRow={handleSelectRow}
              />

              {selectedRows.length > 0 && (
                <PriceHistoryPanel
                  rows={selectedRows}
                  onClose={() => setSelectedRows([])}
                  onRemoveRow={handleRemoveRow}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl border-t border-zinc-200 dark:border-zinc-800/50 px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-xs text-zinc-500 dark:text-zinc-600">
          Scraped nightly from public pricing pages ·{" "}
          <a
            href={DATA_URL}
            target="_blank"
            rel="noreferrer"
            className="text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-400"
          >
            View raw JSON
          </a>{" "}
          · Historical snapshots at{" "}
          <code className="font-mono">freellm.org/history/YYYY-MM-DD/all.json</code>
        </p>
      </footer>
    </div>
  );
}
