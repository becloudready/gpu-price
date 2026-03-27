"use client";

import type { GPURow } from "@/types/gpu";
import { fmtPrice } from "@/lib/utils";
import ProviderLogo from "./ProviderLogo";

// ─── Column definitions ────────────────────────────────────────────────────────

type SortKey = keyof GPURow;

interface Col {
  key: SortKey;
  label: string;
  right?: boolean;
}

const COLS: Col[] = [
  { key: "provider",  label: "Cloud"      },
  { key: "gpu",       label: "GPU Type"   },
  { key: "price_num", label: "Price / hr", right: true },
  { key: "gpu_count", label: "GPUs",       right: true },
  { key: "vram",      label: "VRAM (GB)",  right: true },
  { key: "region",    label: "Region"     },
  { key: "vcpu",      label: "vCPU",       right: true },
  { key: "ram",       label: "RAM (GB)",   right: true },
];

// ─── Pagination helpers ────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  const isActive = value !== "all";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 appearance-none rounded-lg border px-3 pr-7 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/40 ${
          isActive
            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
            : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
          backgroundSize: "14px 14px",
        }}
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  rows: GPURow[];
  providers: string[];
  gpuTypes: string[];
  gpuCounts: string[];
  selectedProvider: string;
  selectedGpuType: string;
  selectedNumGpus: string;
  search: string;
  onSearch: (s: string) => void;
  onProvider: (p: string) => void;
  onGpuType: (t: string) => void;
  onNumGpus: (n: string) => void;
  onReset: () => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  minPrice: number | null;
  selectedRows: GPURow[];
  onSelectRow: (row: GPURow) => void;
}

export default function DataTable({
  rows,
  providers,
  gpuTypes,
  gpuCounts,
  selectedProvider,
  selectedGpuType,
  selectedNumGpus,
  search,
  onSearch,
  onProvider,
  onGpuType,
  onNumGpus,
  onReset,
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  onPageChange,
  minPrice,
  selectedRows,
  onSelectRow,
}: Props) {
  const isFiltered =
    search.length > 0 ||
    selectedProvider !== "all" ||
    selectedGpuType !== "all" ||
    selectedNumGpus !== "all";

  const isRowSelected = (row: GPURow) =>
    selectedRows.some((r) => r.provider === row.provider && r.gpu === row.gpu);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 px-4 py-3 sm:px-5">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search…"
            className="h-9 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 pl-8 pr-3 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>

        <FilterSelect
          value={selectedProvider}
          onChange={onProvider}
          options={providers}
          placeholder="Cloud"
        />
        <FilterSelect
          value={selectedGpuType}
          onChange={onGpuType}
          options={gpuTypes}
          placeholder="GPU Type"
        />
        <FilterSelect
          value={selectedNumGpus}
          onChange={onNumGpus}
          options={gpuCounts}
          placeholder="Num GPUs"
        />

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-sm text-zinc-500 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className={`cursor-pointer select-none px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    col.right ? "text-right" : "text-left"
                  } ${
                    sortKey === col.key
                      ? "text-zinc-800 dark:text-zinc-200"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-1.5 inline h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      {sortDir === "asc" ? (
                        <><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4" opacity="0.3"/></>
                      ) : (
                        <><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="M7 4v16"/><path d="m3 8 4-4 4 4" opacity="0.3"/></>
                      )}
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-1.5 inline h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>
                    </svg>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Source
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {rows.map((row, i) => {
              const selected = isRowSelected(row);
              return (
                <tr
                  key={i}
                  onClick={() => onSelectRow(row)}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/25"
                  }`}
                >
                  {/* Cloud / Provider */}
                  <td className={`px-4 py-3 align-middle ${selected ? "border-l-2 border-indigo-500" : "border-l-2 border-transparent"}`}>
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo name={row.provider || "?"} size={28} />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {row.provider || "—"}
                      </span>
                    </div>
                  </td>

                  {/* GPU Type */}
                  <td className="max-w-[220px] px-4 py-3 align-middle">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {row.gpu || "—"}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right align-middle">
                    <span className={`font-mono text-sm ${
                      row.price_num !== null && row.price_num === minPrice
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}>
                      {fmtPrice(row)}
                    </span>
                    {row.price_num !== null && row.price_num === minPrice && (
                      <span className="ml-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        best
                      </span>
                    )}
                  </td>

                  {/* GPUs + VRAM */}
                  {(["gpu_count", "vram"] as const).map((k) => (
                    <td key={k} className="px-4 py-3 text-right align-middle font-mono text-sm text-zinc-500 dark:text-zinc-400">
                      {row[k] !== null ? row[k] : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                    </td>
                  ))}

                  {/* Region */}
                  <td className="px-4 py-3 align-middle text-sm text-zinc-600 dark:text-zinc-400">
                    {row.region ?? <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                  </td>

                  {/* vCPU + RAM */}
                  {(["vcpu", "ram"] as const).map((k) => (
                    <td key={k} className="px-4 py-3 text-right align-middle font-mono text-sm text-zinc-500 dark:text-zinc-400">
                      {row[k] !== null ? row[k] : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                    </td>
                  ))}

                  {/* Source */}
                  <td className="px-4 py-3 align-middle">
                    {row.source ? (
                      <a
                        href={row.source}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-indigo-500/70 dark:text-indigo-400/70 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
                      >
                        ↗ link
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-zinc-500">
                  No results match your filters.{" "}
                  <button
                    type="button"
                    onClick={onReset}
                    className="text-indigo-600 dark:text-indigo-400 transition-colors hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 sm:px-5">
          <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Prev
            </button>
            {pageNumbers.map((p, idx) =>
              p === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1.5 text-xs text-zinc-400 dark:text-zinc-600">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  className={`min-w-[28px] rounded-md px-2 py-1.5 text-xs transition-colors ${
                    p === page
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-500/25"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="rounded-md px-2.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
