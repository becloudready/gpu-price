import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";

// =============================
// Debounce Hook
// =============================
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// =============================
// Pagination Hook
// =============================
const usePagination = (items, itemsPerPage) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  return { currentItems, currentPage, totalPages, setCurrentPage };
};

// =============================
// Sorting Hook
// =============================
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortable = [...items];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig?.key === key && sortConfig.direction === "ascending") direction = "descending";
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

// =============================
// Main App
// =============================
export default function App() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [providerFilter, setProviderFilter] = useState("all");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { items: sortedItems, requestSort, sortConfig } = useSortableData(prices);

  // Filtering + Search
  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const matchesSearch =
        (item.provider || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.product || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesProvider = providerFilter === "all" || item.provider === providerFilter;

      return matchesSearch && matchesProvider;
    });
  }, [sortedItems, debouncedSearchTerm, providerFilter]);

  // Pagination
  const { currentItems, currentPage, totalPages, setCurrentPage } = usePagination(filteredItems, itemsPerPage);

  // Summary Stats
  const summary = useMemo(() => {
    const valid = prices.filter((p) => p.price_per_hour_usd != null);

    if (!valid.length) return { avg: 0, min: 0, max: 0, total: prices.length };

    return {
      total: prices.length,
      avg: (valid.reduce((s, p) => s + p.price_per_hour_usd, 0) / valid.length).toFixed(2),
      min: Math.min(...valid.map((p) => p.price_per_hour_usd)).toFixed(2),
      max: Math.max(...valid.map((p) => p.price_per_hour_usd)).toFixed(2),
    };
  }, [prices]);

  // Fetch Data
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://127.0.0.1:5000/prices");
      setPrices(res.data);
      setError(null);
    } catch {
      setError("Failed to load prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchPrices, 300000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPrices]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Provider", "GPU", "Price"];
    const rows = filteredItems.map((i) => [i.provider, i.product, i.price_per_hour_usd]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "gpu_prices.csv";
    a.click();
  };

  const providers = useMemo(() => {
    const unique = [...new Set(prices.map((p) => p.provider).filter(Boolean))];
    return unique;
  }, [prices]);

  const getSortDir = (key) => (sortConfig?.key === key ? sortConfig.direction : null);

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#111" : "#fff", color: darkMode ? "#fff" : "#000", fontFamily: "Arial" }}>
      {/* NAV */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #ccc" }}>
        <h2>GPU Price Dashboard</h2>
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light" : "Dark"}
        </button>
      </div>

      {/* SUMMARY */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, padding: 16 }}>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <b>Total</b>
          <div>{summary.total}</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <b>Avg</b>
          <div>${summary.avg}</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <b>Min</b>
          <div>${summary.min}</div>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <b>Max</b>
          <div>${summary.max}</div>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
          <option value="all">All Providers</option>
          {providers.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
          {[5, 10, 25, 50].map((n) => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>

        <button onClick={fetchPrices}>Refresh</button>
        <button onClick={exportCSV}>Export CSV</button>

        <label>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto Refresh
        </label>
      </div>

      {/* TABLE */}
      <div style={{ padding: 16 }}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {!loading && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["provider", "product", "gpu_count", "vram_gb", "vcpus", "system_ram_gb", "price_per_hour_usd"].map((key) => (
                  <th key={key} onClick={() => requestSort(key)} style={{ border: "1px solid #ccc", padding: 8, cursor: "pointer" }}>
                    {key}
                    {getSortDir(key) === "ascending" ? " ↑" : getSortDir(key) === "descending" ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.provider}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.product}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.gpu_count}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.vram_gb}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.vcpus}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{item.system_ram_gb}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>${item.price_per_hour_usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, paddingBottom: 20 }}>
        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
        <span>Page {currentPage} / {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
