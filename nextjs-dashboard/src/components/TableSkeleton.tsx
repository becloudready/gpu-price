"use client";

export default function TableSkeleton() {
  // Column widths mapping to match the actual Table columns
  const COL_WIDTHS = ["w-32", "w-40", "w-24", "w-20", "w-16"];

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      
      {/* 🔍 Filter Bar Skeleton */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-xl" />
        </div>
        <div className="h-6 w-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-full" />
      </div>

      {/* 📊 Main Table Skeleton */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                {/* GPU Model Col */}
                <th className="p-4"><div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" /></th>
                {/* Provider Col */}
                <th className="p-4"><div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" /></th>
                {/* Status Col */}
                <th className="p-4 text-center"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded mx-auto" /></th>
                {/* Price Col */}
                <th className="p-4"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" /></th>
                {/* Action Col */}
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="bg-transparent">
                  {/* GPU Icon + Name */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
                      <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded" />
                    </div>
                  </td>
                  
                  {/* Provider Info */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-full" />
                      <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded" />
                    </div>
                  </td>

                  {/* Status Badge Placeholder */}
                  <td className="p-4">
                    <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded-full mx-auto" />
                  </td>

                  {/* Price Placeholder */}
                  <td className="p-4">
                    <div className="h-4 w-16 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded" />
                  </td>

                  {/* Action Button Placeholder */}
                  <td className="p-4 text-right">
                    <div className="ml-auto h-9 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-xl" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}