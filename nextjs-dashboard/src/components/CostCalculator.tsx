"use client";

import { useMemo, useState } from "react";
import type { GPURow } from "@/types/gpu";
import { 
  Calculator, 
  Cpu, 
  Clock, 
  Layers, 
  Search, 
  Info,
  ChevronDown,
  CircleDollarSign,
  TrendingUp
} from "lucide-react";

const TIME_CONVERSIONS = {
  hour: 1,
  day: 24,
  month: 730.48,
};

const formatCurrency = (amount: number, precision: number = 2) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision > 2 ? 4 : 2,
  }).format(amount);
};

export default function CostCalculator({ data }: { data: GPURow[] }) {
  const [config, setConfig] = useState({
    selectedId: "",
    quantity: 1,
    duration: 1,
    unit: "hour" as keyof typeof TIME_CONVERSIONS,
    includeTax: false,
  });

  const [searchGPU, setSearchGPU] = useState("");

  const options = useMemo(() => {
    return data
      .filter((r) => r.price_num !== null)
      .map((r, i) => ({
        ...r,
        id: `${r.provider}-${r.gpu}-${i}`,
        price: Number(r.price_num),
      }));
  }, [data]);

  const selected = useMemo(
    () => options.find((o) => o.id === config.selectedId),
    [config.selectedId, options]
  );

  const filteredOptions = useMemo(() => {
    return options.filter((o) => {
      const text = `${o.provider} ${o.gpu}`.toLowerCase();
      return text.includes(searchGPU.toLowerCase());
    });
  }, [options, searchGPU]);

  const calc = useMemo(() => {
    if (!selected) return null;
    const baseHourly = selected.price * config.quantity;
    const totalHours = config.duration * TIME_CONVERSIONS[config.unit];
    const subtotal = baseHourly * totalHours;
    const tax = config.includeTax ? subtotal * 0.1 : 0;
    const grandTotal = subtotal + tax;

    return {
      hourlyRate: baseHourly,
      subtotal,
      tax,
      grandTotal,
      effectiveRate: grandTotal / (config.duration || 1),
    };
  }, [selected, config]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-2xl shadow-zinc-200/50 dark:shadow-none">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Calculator size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">GPU Cost Estimator</h2>
                <p className="text-indigo-100 text-xs font-medium opacity-80 uppercase tracking-widest">CloudDealHunt Engine</p>
              </div>
            </div>
            {calc && (
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase font-bold text-indigo-200">Current Rate</p>
                <p className="text-lg font-mono font-bold">{formatCurrency(calc.hourlyRate, 3)}/hr</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Main Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Selection */}
            <div className="space-y-5">
              <div className="relative group">
                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                  <Search size={14} className="text-indigo-500" /> Filter GPU Models
                </label>
                <input
                  type="text"
                  placeholder="H100, RTX 4090, A100..."
                  value={searchGPU}
                  onChange={(e) => setSearchGPU(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="relative">
                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                  <Cpu size={14} className="text-indigo-500" /> Instance Configuration
                </label>
                <div className="relative">
                  <select
                    value={config.selectedId}
                    onChange={(e) => setConfig((p) => ({ ...p, selectedId: e.target.value }))}
                    className="w-full appearance-none pl-4 pr-10 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer font-medium text-sm"
                  >
                    <option value="">Select an available GPU...</option>
                    {filteredOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.provider} · {o.gpu} (${o.price}/hr)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 text-zinc-400 pointer-events-none" size={18} />
                </div>
              </div>
            </div>

            {/* Right Column: Quantity & Time */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 ml-1">
                    <Layers size={14} className="text-indigo-500" /> Nodes
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={config.quantity}
                    onChange={(e) => setConfig((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 ml-1">
                    <Clock size={14} className="text-indigo-500" /> Duration
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={config.duration}
                    onChange={(e) => setConfig((p) => ({ ...p, duration: Math.max(1, Number(e.target.value)) }))}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Time Unit</label>
                <div className="flex p-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  {(["hour", "day", "month"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setConfig((prev) => ({ ...prev, unit: u }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                        config.unit === u
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tax Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Estimated Tax</p>
                <p className="text-xs text-zinc-500">Apply standard 10% VAT/Fees</p>
              </div>
            </div>
            <button 
              onClick={() => setConfig(p => ({ ...p, includeTax: !p.includeTax }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.includeTax ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.includeTax ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Result Section */}
          {calc ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 p-6 rounded-3xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl">
                <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">Total Estimated Investment</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-black tracking-tighter italic">
                    {formatCurrency(calc.grandTotal)}
                  </h3>
                  <span className="text-sm font-bold opacity-60">USD</span>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs font-medium border-t border-white/10 dark:border-zinc-200 pt-4">
                   <div className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600">
                      <TrendingUp size={14} />
                      <span>{config.quantity}x Nodes Active</span>
                   </div>
                   <div className="h-1 w-1 bg-zinc-500 rounded-full" />
                   <span className="opacity-60">{config.duration} {config.unit}(s) billing cycle</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                    <CircleDollarSign size={10} /> Subtotal
                  </p>
                  <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{formatCurrency(calc.subtotal)}</p>
                </div>
                <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Effective Rate</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(calc.effectiveRate)}<span className="text-xs text-zinc-400 font-normal ml-1">/{config.unit}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
              <div className="inline-flex p-4 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4">
                <Cpu size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No Instance Selected</h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2">Pick a GPU from the list to calculate real-time infrastructure costs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}