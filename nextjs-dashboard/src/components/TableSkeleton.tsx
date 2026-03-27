const COL_WIDTHS = ["w-24", "w-48", "w-14", "w-6", "w-8", "w-8", "w-8"];

export default function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
      {/* Filter bar */}
      <div className="flex gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 px-4 py-3 sm:px-5">
        <div className="shimmer h-8 w-56 rounded-lg" />
        <div className="shimmer h-8 w-28 rounded-lg" />
        <div className="shimmer h-8 w-28 rounded-lg" />
        <div className="shimmer h-8 w-28 rounded-lg" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              {COL_WIDTHS.map((w, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <div className={`shimmer h-3 ${w} rounded`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="shimmer h-7 w-7 rounded-lg" />
                    <div className="shimmer h-4 w-20 rounded" />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="shimmer h-4 w-48 rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="shimmer ml-auto h-4 w-14 rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="shimmer ml-auto h-4 w-5 rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="shimmer ml-auto h-4 w-7 rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="shimmer ml-auto h-4 w-7 rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="shimmer ml-auto h-4 w-9 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
