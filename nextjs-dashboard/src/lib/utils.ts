import type { GPURaw, GPURow } from "@/types/gpu";

function clean(s: unknown): string {
  return (s ?? "").toString().trim();
}

export function toNumber(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  const s = clean(x);
  if (!s) return null;
  const m = s.match(/[-+]?\d*\.?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeRow(r: GPURaw): GPURow {
  const provider = clean(r.provider);
  const gpu =
    clean(r.gpu_model) || clean(r.product) || clean(r.title) || clean(r.item);

  const priceRaw =
    r.price_per_hour_usd ??
    r.price_per_gpu_hour ??
    r.secure_price ??
    r.community_price ??
    r.price ??
    null;

  const price_num =
    typeof priceRaw === "number"
      ? Number.isFinite(priceRaw)
        ? priceRaw
        : null
      : toNumber(priceRaw);

  return {
    provider,
    gpu,
    price_raw: priceRaw,
    price_num,
    gpu_count: r.gpu_count ?? r.gpuCount ?? null,
    vram: r.vram_gb ?? r.gpuVram ?? null,
    vcpu: r.vcpus ?? r.vCpUs ?? null,
    ram: r.system_ram_gb ?? r.ram_gb ?? r.memory ?? null,
    storage: r.local_storage_tb ?? null,
    region: clean(r.region) || clean(r.location) || null,
    source: clean(r.deploy_url) || clean(r.link),
  };
}

export function fmtPrice(row: GPURow): string {
  if (row.price_num !== null) return `$${row.price_num.toFixed(2)}`;
  const s = clean(row.price_raw);
  return s || "—";
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
