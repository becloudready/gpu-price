"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { GPURaw, GPURow } from "@/types/gpu";
import { normalizeRow, fmtPrice } from "@/lib/utils";
import { HISTORY_BASE_URL } from "@/lib/constants";
import type { HistoryPoint, ChartSeries } from "./PriceChart";

const PriceChart = dynamic(() => import("./PriceChart"), { ssr: false });

const SERIES_COLORS = ["#6366f1", "#10b981", "#f97316", "#f43f5e"];

// ─── Provider badge ────────────────────────────────────────────────────────────

const PROVIDER_STYLES: Record<
  string,
  { dot: string; text: string; bg: string; ring: string }
> = {
  coreweave:  { dot: "bg-violet-400",  text: "text-violet-700 dark:text-violet-300",  bg: "bg-violet-500/10",  ring: "ring-violet-500/20"  },
  runpod:     { dot: "bg-orange-400",  text: "text-orange-700 dark:text-orange-300",  bg: "bg-orange-500/10",  ring: "ring-orange-500/20"  },
  lambda:     { dot: "bg-blue-400",    text: "text-blue-700 dark:text-blue-300",      bg: "bg-blue-500/10",    ring: "ring-blue-500/20"    },
  lambdalabs: { dot: "bg-blue-400",    text: "text-blue-700 dark:text-blue-300",      bg: "bg-blue-500/10",    ring: "ring-blue-500/20"    },
  nebius:     { dot: "bg-cyan-400",    text: "text-cyan-700 dark:text-cyan-300",      bg: "bg-cyan-500/10",    ring: "ring-cyan-500/20"    },
  crusoe:     { dot: "bg-emerald-400", text: "text-emerald-700 dark:text-emerald-300",bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  denvr:      { dot: "bg-rose-400",    text: "text-rose-700 dark:text-rose-300",      bg: "bg-rose-500/10",    ring: "ring-rose-500/20"    },
};

function ProviderBadge({ name }: { name: string }) {
  const s = PROVIDER_STYLES[name.toLowerCase()] ?? {
    dot: "bg-zinc-400", text: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800", ring: "ring-zinc-300 dark:ring-zinc-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {name}
    </span>
  );
}

// ─── Historical data fetching ─────────────────────────────────────────────────

function getLastNDays(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

async function fetchPriceHistory(row: GPURow): Promise<HistoryPoint[]> {
  const dates = getLastNDays(60);
  const results = await Promise.allSettled(
    dates.map(async (date) => {
      try {
        const res = await fetch(`${HISTORY_BASE_URL}/${date}/all.json`);
        if (!res.ok) return null;
        const data = (await res.json()) as GPURaw[];
        if (!Array.isArray(data)) return null;
        const match = data
          .map(normalizeRow)
          .find(
            (r) =>
              r.provider.toLowerCase() === row.provider.toLowerCase() &&
              r.gpu.toLowerCase() === row.gpu.toLowerCase()
          );
        if (!match || match.price_num === null) return null;
        return { date, price: match.price_num, label: formatLabel(date) } as HistoryPoint;
      } catch {
        return null;
      }
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<HistoryPoint | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is HistoryPoint => v !== null);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowKey(row: GPURow) {
  return `${row.provider}::${row.gpu}`;
}

function mergeSeriesData(
  allPoints: Map<string, HistoryPoint[]>,
  rows: GPURow[]
): Record<string, string | number | null>[] {
  const dateMap = new Map<string, Record<string, string | number | null>>();
  rows.forEach((row, i) => {
    const points = allPoints.get(rowKey(row)) ?? [];
    points.forEach(({ date, price, label }) => {
      if (!dateMap.has(date)) dateMap.set(date, { date, label });
      dateMap.get(date)![`price_${i}`] = price;
    });
  });
  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}

const SPEC_ROWS: { label: string; getValue: (r: GPURow) => string | number | null; accent?: boolean }[] = [
  { label: "Price / hr",   getValue: (r) => fmtPrice(r),   accent: true },
  { label: "Region",       getValue: (r) => r.region },
  { label: "GPU Count",    getValue: (r) => r.gpu_count },
  { label: "VRAM (GB)",    getValue: (r) => r.vram },
  { label: "vCPU",         getValue: (r) => r.vcpu },
  { label: "RAM (GB)",     getValue: (r) => r.ram },
  { label: "Storage (TB)", getValue: (r) => r.storage },
];

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="px-1 pb-2">
      <div className="flex items-end gap-1" style={{ height: 180 }}>
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="shimmer flex-1 rounded-sm"
            style={{ height: `${30 + Math.abs(Math.sin(i * 0.65) * 60)}%` }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-2.5 w-10 rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function PriceHistoryPanel({
  rows,
  onClose,
  onRemoveRow,
}: {
  rows: GPURow[];
  onClose: () => void;
  onRemoveRow: (row: GPURow) => void;
}) {
  const [allPoints, setAllPoints] = useState<Map<string, HistoryPoint[]>>(new Map());
  const [loadingCount, setLoadingCount] = useState(rows.length);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch history — re-run whenever the set of selected rows changes
  const keysString = rows.map(rowKey).join("|");
  useEffect(() => {
    let cancelled = false;
    setAllPoints(new Map());
    setLoadingCount(rows.length);

    rows.forEach((row) => {
      const key = rowKey(row);
      fetchPriceHistory(row)
        .then((data) => {
          if (!cancelled) {
            setAllPoints((prev) => new Map([...prev, [key, data]]));
            setLoadingCount((prev) => Math.max(0, prev - 1));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAllPoints((prev) => new Map([...prev, [key, []]]));
            setLoadingCount((prev) => Math.max(0, prev - 1));
          }
        });
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysString]);

  const loading = loadingCount > 0;
  const mergedData = useMemo(() => mergeSeriesData(allPoints, rows), [allPoints, rows]);

  const chartSeries: ChartSeries[] = rows.map((row, i) => ({
    key: rowKey(row),
    label: `${row.provider} ${row.gpu}`,
    color: SERIES_COLORS[i],
    currentPrice: row.price_num,
  }));

  const hasEnoughData = rows.some(
    (row) => (allPoints.get(rowKey(row))?.length ?? 0) >= 2
  );

  const prices = rows.map((r) => r.price_num).filter((p): p is number => p !== null);
  const minCompPrice = prices.length > 1 ? Math.min(...prices) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="GPU price comparison"
      className="drawer-enter fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-zinc-300/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-950 shadow-2xl"
    >
      {/* Drag handle */}
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-3">
        <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {rows.map((row, i) => (
              <div
                key={rowKey(row)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 py-1 pl-2.5 pr-1.5"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[i] }}
                />
                <ProviderBadge name={row.provider} />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{row.gpu}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row)}
                    aria-label={`Remove ${row.gpu}`}
                    className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-zinc-400 dark:text-zinc-600 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Spec comparison table ────────────────────────────────────── */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="w-32 py-2.5 pl-4 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-600" />
                {rows.map((row, i) => (
                  <th key={rowKey(row)} className="py-2.5 px-4 text-left">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SERIES_COLORS[i] }}
                      />
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]">
                        {row.gpu}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {SPEC_ROWS.map(({ label, getValue, accent }) => (
                <tr key={label}>
                  <td className="py-2.5 pl-4 pr-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-600">
                    {label}
                  </td>
                  {rows.map((row) => {
                    const val = getValue(row);
                    const isMin =
                      accent && minCompPrice !== null && row.price_num === minCompPrice;
                    return (
                      <td
                        key={rowKey(row)}
                        className={`py-2.5 px-4 font-mono text-sm font-semibold ${
                          isMin
                            ? "text-emerald-600 dark:text-emerald-400"
                            : accent
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {val !== null && val !== undefined && val !== "" ? String(val) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Price history ────────────────────────────────────────────── */}
        <div className="mt-7">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Price History</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Last 60 days ·{" "}
              {loading
                ? "fetching…"
                : `${mergedData.length} data point${mergedData.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4">
            {loading && <ChartSkeleton />}

            {!loading && !hasEnoughData && (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-500">No historical data found.</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-700">
                  History is available after the scraper has run for multiple days.
                </p>
              </div>
            )}

            {!loading && hasEnoughData && (
              <>
                <PriceChart data={mergedData} series={chartSeries} />
                {rows.length > 1 && (
                  <div className="mt-3 flex flex-wrap gap-4">
                    {chartSeries.map((s) => (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-zinc-500">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
