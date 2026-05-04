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
    dot: "bg-zinc-400",
    text: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    ring: "ring-zinc-300 dark:ring-zinc-700",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {name}
    </span>
  );
}

function getTrend(points: HistoryPoint[]) {
  if (points.length < 2) return null;
  const first = points[0].price;
  const last = points[points.length - 1].price;
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}

// ─── Historical data ───────────────────────────────────────────────────────────

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

        return {
          date,
          price: match.price_num,
          label: formatLabel(date),
        } as HistoryPoint;
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

function getMinMax(points: HistoryPoint[]) {
  const prices = points.map(p => p.price).filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function rowKey(row: GPURow) {
  return `${row.provider}::${row.gpu}`;
}

function mergeSeriesData(
  allPoints: Map<string, HistoryPoint[]>,
  rows: GPURow[]
) {
 const dateMap = new Map<
  string,
  Record<string, string | number | null>
>();

  rows.forEach((row, i) => {
    const points = allPoints.get(rowKey(row)) ?? [];

   points.forEach(({ date, price, label }) => {
  if (!dateMap.has(date)) {
    dateMap.set(date, { date, label });
  }

  const entry = dateMap.get(date);
  if (entry) {
    entry[`price_${i}`] = price;
  }
});
  });

  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
  }, [keysString]);

  const loading = loadingCount > 0;
  const mergedData = useMemo(() => mergeSeriesData(allPoints, rows), [allPoints, rows]);
  const biggestDrop = useMemo<{
  row: GPURow;
  drop: number;
} | null>(() => {
  let bestRow: GPURow | null = null;
  let bestDrop = 0;

  rows.forEach((row) => {
    const history = allPoints.get(rowKey(row)) || [];
    const trend = getTrend(history);

    if (trend !== null && trend < bestDrop) {
      bestDrop = trend;
      bestRow = row;
    }
  });

  if (!bestRow) return null;

  return {
    row: bestRow,
    drop: bestDrop,
  };
}, [rows, allPoints]);

  const chartSeries: ChartSeries[] = rows.map((row, i) => ({
    key: rowKey(row),
    label: `${row.provider} ${row.gpu}`,
    color: SERIES_COLORS[i],
    currentPrice: row.price_num,
  }));

  const hasEnoughData = rows.some(
    (row) => (allPoints.get(rowKey(row))?.length ?? 0) >= 2
  );

  return (
    <div className="p-4">
      {!loading && hasEnoughData && (
        <PriceChart data={mergedData} series={chartSeries} />
      )}
      {biggestDrop?.row && (
  <div className="mb-4 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20">
    <p className="text-xs text-rose-600 font-semibold">📉 Biggest Drop</p>
    
    <p className="text-sm font-bold">
      {biggestDrop.row.gpu} via {biggestDrop.row.provider}
    </p>

    <p className="text-rose-600 font-mono">
      ↓ {Math.abs(biggestDrop.drop).toFixed(2)}%
    </p>
  </div>
)}
      {/* ✅ FIXED SECTION */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {rows.map((row, i) => {
          const history = allPoints.get(rowKey(row)) || [];
          const mm = getMinMax(history);

          if (!mm) return null;

          const range = mm.max - mm.min;

          return (
            <div key={i} className="p-4 border rounded-xl">
              <p>{row.provider}</p>
              <h4>{row.gpu}</h4>

              <div className="flex justify-between">
                <span>Min: ${mm.min.toFixed(2)}</span>
                <span>Max: ${mm.max.toFixed(2)}</span>
              </div>

              <div>Range: ${range.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}