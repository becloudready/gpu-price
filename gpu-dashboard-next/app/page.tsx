"use client";
import React, { useState, useEffect } from 'react';

// 1. Updated interface to match your JSON keys exactly
interface GPUData {
  provider: string;
  product: string;        // matches your "product" key
  gpu_count: number;
  vram_gb: number;
  vcpus: number;
  system_ram_gb: number;
  local_storage_tb: number | null;
  price_per_hour_usd: number; // matches your "price_per_hour_usd" key
  raw_price: string;
}

export default function GPUPriceMonitor() {
  const [prices, setPrices] = useState<GPUData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/prices')
      .then((res) => res.json())
      .then((data: GPUData[]) => {
        setPrices(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching prices:", err);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-blue-400">GPU Price Monitor</h1>
          <p className="text-gray-400">Tracking CloudDealHunt Metrics</p>
        </header>

        {loading ? (
          <div className="text-center py-10 font-mono">Loading prices...</div>
        ) : (
          <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700/50 text-gray-200">
                  <th className="p-4 border-b border-gray-600">GPU / Product</th>
                  <th className="p-4 border-b border-gray-600">Provider</th>
                  <th className="p-4 border-b border-gray-600">VRAM</th>
                  <th className="p-4 border-b border-gray-600">vCPUs</th>
                  <th className="p-4 border-b border-gray-600">Price ($/hr)</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-700/30 transition-colors border-b border-gray-700/50">
                    {/* 2. Updated data binding to match your JSON */}
                    <td className="p-4 font-medium">{item.product}</td>
                    <td className="p-4">
                       <span className="bg-blue-900/40 text-blue-300 px-2 py-1 rounded text-xs uppercase border border-blue-800">
                        {item.provider}
                       </span>
                    </td>
                    <td className="p-4 text-gray-400">{item.vram_gb} GB</td>
                    <td className="p-4 text-gray-400">{item.vcpus} Core</td>
                    <td className="p-4 text-green-400 font-mono font-bold">
                      {item.raw_price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}