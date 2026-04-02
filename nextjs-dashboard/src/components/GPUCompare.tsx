"use client";

import { useMemo, useState } from "react";
import type { GPURow } from "@/types/gpu";
import { 
  Swords, 
  Trophy, 
  Zap, 
  BarChart3, 
  AlertCircle,
  Cpu,
  ChevronDown
} from "lucide-react";

export default function GPUCompare({ data }: { data: GPURow[] }) {
  const [gpu1, setGpu1] = useState("");
  const [gpu2, setGpu2] = useState("");

  const options = useMemo(() => {
    return data
      .filter((r) => r.price_num !== null)
      .map((r, i) => ({
        ...r,
        id: `${r.provider}-${r.gpu}-${i}`,
        price: Number(r.price_num),
      }));
  }, [data]);

  const selected1 = options.find((o) => o.id === gpu1);
  const selected2 = options.find((o) => o.id === gpu2);

  const result = useMemo(() => {
    if (!selected1 || !selected2) return null;

    const value1 = (selected1.vram || 0) / (selected1.price || 1);
    const value2 = (selected2.vram || 0) / (selected2.price || 1);
    const priceDiff = Math.abs(selected1.price - selected2.price);

    let winner = "";
    if (value1 > value2) winner = "GPU 1";
    else if (value2 > value1) winner = "GPU 2";
    else winner = "Tie";

    return { value1, value2, winner, priceDiff };
  }, [selected1, selected2]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Swords size={120} />
        </div>
        
        <div className="relative z-10 flex items-center gap-4 mb-8">
          <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
            <Swords size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 italic uppercase">
              GPU Battleground
            </h2>
            <p className="text-sm text-zinc-500 font-medium tracking-wide">COMPARE SPECS & VALUE EFFICIENCY</p>
          </div>
        </div>

        {/* Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* "VS" Badge in middle for Desktop */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black text-xs italic border-4 border-white dark:border-zinc-950 shadow-xl">
            VS
          </div>

          {[1, 2].map((num) => (
            <div key={num} className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                <Cpu size={12} /> Candidate {num}
              </label>
              <div className="relative">
                <select
                  value={num === 1 ? gpu1 : gpu2}
                  onChange={(e) => num === 1 ? setGpu1(e.target.value) : setGpu2(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-sm cursor-pointer shadow-inner"
                >
                  <option value="">Select GPU {num}...</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.gpu} ({o.provider})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-zinc-400 pointer-events-none" size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Results */}
      {selected1 && selected2 && result ? (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* GPU 1 Card */}
            <ComparisonCard 
              gpu={selected1} 
              isWinner={result.winner === "GPU 1"} 
              score={result.value1}
              label="CHALLENGER A"
            />

            {/* GPU 2 Card */}
            <ComparisonCard 
              gpu={selected2} 
              isWinner={result.winner === "GPU 2"} 
              score={result.value2}
              label="CHALLENGER B"
            />
          </div>

          {/* Value Summary Banner */}
          <div className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-white dark:to-zinc-100 text-white dark:text-zinc-900 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 rounded-full animate-bounce">
                  <Trophy size={28} className="text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-black italic uppercase leading-none">
                    {result.winner === "Tie" ? "Statistical Deadlock" : `${result.winner} is Dominating`}
                  </h4>
                  <p className="text-xs opacity-70 font-bold mt-1 tracking-wider uppercase">
                    Calculated by VRAM-to-Price efficiency ratio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 divide-x divide-zinc-700 dark:divide-zinc-200">
                <div className="px-4 text-center">
                  <p className="text-[10px] font-black uppercase opacity-60 mb-1">Price Gap</p>
                  <p className="text-xl font-mono font-bold text-red-400 dark:text-red-600">
                    ${result.priceDiff.toFixed(3)}<span className="text-xs">/hr</span>
                  </p>
                </div>
                <div className="pl-6 text-center">
                   <p className="text-[10px] font-black uppercase opacity-60 mb-1">Recommendation</p>
                   <div className="flex items-center gap-2 font-black italic text-sm">
                      <Zap size={14} className="text-amber-500" fill="currentColor" />
                      {result.winner === "Tie" ? "PICK EITHER" : `GO WITH ${result.winner === "GPU 1" ? "GPU 1" : "GPU 2"}`}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
          <div className="inline-flex p-4 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 mb-4">
            <BarChart3 size={40} />
          </div>
          <h3 className="text-xl font-black italic uppercase text-zinc-800 dark:text-zinc-200">Awaiting Selection</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2 font-medium">Select two different GPU configurations to trigger the value analysis engine.</p>
        </div>
      )}
    </div>
  );
}

// Sub-component for individual GPU cards
type GPUOption = GPURow & { price: number };

function ComparisonCard({
  gpu,
  isWinner,
  score,
  label,
}: {
  gpu: GPUOption;
  isWinner: boolean;
  score: number;
  label: string;
}) {
  return (
    <div className={`relative p-8 rounded-3xl border-2 transition-all duration-500 ${
      isWinner 
      ? "bg-amber-50 dark:bg-amber-900/10 border-amber-500 shadow-2xl shadow-amber-500/20 scale-[1.02] z-10" 
      : "bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 opacity-80"
    }`}>
      {isWinner && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg flex items-center gap-1">
          <Trophy size={10} /> BEST VALUE
        </div>
      )}

      <div className="mb-6">
        <p className="text-[10px] font-black text-zinc-400 mb-1 tracking-[0.2em]">{label}</p>
        <h3 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 truncate">
          {gpu.gpu}
        </h3>
        <p className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{gpu.provider}</p>
      </div>

      <div className="space-y-4">
        <StatRow label="Cost / Hour" value={`$${gpu.price.toFixed(3)}`} highlight={isWinner} />
        <StatRow label="VRAM Memory" value={`${gpu.vram} GB`} />
        <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
           <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase">Efficiency Score</p>
                <p className={`text-3xl font-black font-mono ${isWinner ? 'text-amber-600' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {score.toFixed(2)}
                </p>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 pb-1">GB PER $</span>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-50 dark:border-zinc-900">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-black font-mono ${highlight ? 'text-green-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </span>
    </div>
  );
}