import type { DashboardStats } from "@/types/gpu";

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        accent
          ? "border-emerald-900/60 bg-emerald-950/20"
          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2.5 font-sans text-2xl font-bold tracking-tight ${
          accent ? "text-emerald-400" : "text-zinc-50"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 truncate text-xs text-zinc-600">{sub}</p>
      )}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 p-5">
      <div className="shimmer h-3 w-24 rounded" />
      <div className="shimmer mt-4 h-7 w-20 rounded" />
      <div className="shimmer mt-2.5 h-3 w-36 rounded" />
    </div>
  );
}

export default function StatsGrid({
  stats,
  loading,
}: {
  stats: DashboardStats;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const bestSub =
    stats.minGpu && stats.minProvider
      ? `${stats.minProvider} · ${
          stats.minGpu.length > 24
            ? stats.minGpu.slice(0, 24) + "…"
            : stats.minGpu
        }`
      : undefined;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Total Listings"
        value={stats.total.toLocaleString()}
        sub={`across ${stats.providerCount} provider${stats.providerCount !== 1 ? "s" : ""}`}
      />
      <StatCard
        label="Providers"
        value={String(stats.providerCount)}
        sub="neo cloud providers"
      />
      <StatCard
        label="Best Price"
        value={stats.minPrice !== null ? `$${stats.minPrice.toFixed(2)}/hr` : "—"}
        sub={bestSub}
        accent
      />
      <StatCard
        label="Average Price"
        value={
          stats.avgPrice !== null ? `$${stats.avgPrice.toFixed(2)}/hr` : "—"
        }
        sub="across all listings"
      />
    </div>
  );
}
