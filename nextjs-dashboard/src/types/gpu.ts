// Raw shape from all.json — field names vary slightly across scrapers
export interface GPURaw {
  provider: string;
  product?: string;
  gpu_model?: string;
  title?: string;
  item?: string;
  price_per_hour_usd?: number | null;
  price_per_gpu_hour?: number | string | null;
  secure_price?: number | string | null;
  community_price?: number | string | null;
  price?: number | string | null;
  raw_price?: string;
  gpu_count?: number | null;
  gpuCount?: number | null;
  vram_gb?: number | null;
  gpuVram?: number | null;
  vcpus?: number | null;
  vCpUs?: number | null;
  system_ram_gb?: number | null;
  ram_gb?: number | null;
  memory?: number | null;
  local_storage_tb?: number | null;
  region?: string | null;
  location?: string | null;
  deploy_url?: string;
  link?: string;
}

// Normalised shape used throughout the UI
export interface GPURow {
  provider: string;
  gpu: string;
  price_raw: number | string | null;
  price_num: number | null;
  gpu_count: number | null;
  vram: number | null;
  vcpu: number | null;
  ram: number | null;
  storage: number | null;
  region: string | null;
  source: string;
}

export interface Meta {
  generated_at_utc?: string;
  generated_at?: string;
  total_rows?: number;
  providers?: string[];
}

export interface DashboardStats {
  total: number;
  providerCount: number;
  minPrice: number | null;
  minGpu: string | null;
  minProvider: string | null;
  avgPrice: number | null;
  updatedAt: string | null | undefined;
}
