"use client";

import { useTheme } from "./ThemeProvider";

export default function Header({
  updatedAt,
  rowCount,
}: {
  updatedAt: string | null | undefined;
  rowCount: number;
}) {
  const { dark, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/25">
            <svg
              className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            GPU Cloud Prices
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {rowCount > 0 && (
              <>
                <span className="tabular-nums">{rowCount} listings</span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
              </>
            )}
            {updatedAt ? (
              <span>Updated {updatedAt.slice(0, 10)}</span>
            ) : (
              <span className="animate-pulse">Loading…</span>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {dark ? (
              /* Sun icon */
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
