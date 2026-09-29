"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLowStock } from "@/app/lib/api";
import type { Material } from "@/app/lib/types";
import { PurchaseStockModal, StockStatusBadge } from "../StockModals";
import { Pagination } from "@/app/components/Pagination";

const PAGE_SIZE = 10;

export default function LowStockPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected material for purchase modal
  const [selectedForPurchase, setSelectedForPurchase] = useState<Material | null>(null);

  const loadLowStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLowStock();
      setMaterials(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load low-stock items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLowStock();
  }, []);

  const totalPages = Math.ceil(materials.length / PAGE_SIZE) || 1;
  const paginatedMaterials = materials.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/inventory" className="hover:underline">Inventory</Link>
            <span>/</span>
            <span>Low Stock Alert</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">Low Stock Alert</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Materials that have reached or fallen below their minimum threshold and require replenishment.
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#26262B] rounded-md px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-[#1A1A1D] shadow-xs transition-colors"
        >
          ← Back to Inventory
        </Link>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded-xl text-sm text-red-700 dark:text-rose-400 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadLowStock()}
            className="underline font-medium hover:text-red-800 dark:hover:text-rose-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Low Stock Table ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">Checking stock levels...</div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-emerald-950/30 text-green-600 dark:text-emerald-400 text-xl mb-2">
              ✓
            </div>
            <p className="text-gray-900 dark:text-[#F3F4F6] font-bold text-base">No low-stock materials.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All inventory items are currently above their configured minimum thresholds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-amber-50/60 dark:bg-[#17171A] text-xs uppercase font-semibold text-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-[#26262B]">
                <tr>
                  <th className="px-4 py-3">Material ID</th>
                  <th className="px-4 py-3">Material Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Min Threshold</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
                {paginatedMaterials.map((m) => (
                  <tr key={m.material_id} className="hover:bg-gray-50/70 dark:hover:bg-[#1A1A1D] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-[#F3F4F6]">
                      <Link href={`/inventory/${encodeURIComponent(m.material_id)}`} className="hover:underline text-blue-600 dark:text-blue-400">
                        {m.material_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-[#F3F4F6]">
                      <Link href={`/inventory/${encodeURIComponent(m.material_id)}`} className="hover:underline">
                        {m.material_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{m.category || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-rose-400">
                      {m.current_stock}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">
                      {m.minimum_stock}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{m.unit}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{m.supplier || "—"}</td>
                    <td className="px-4 py-3">
                      <StockStatusBadge
                        currentStock={m.current_stock}
                        minimumStock={m.minimum_stock}
                        isOutOfStock={m.is_out_of_stock}
                        isLowStock={m.is_low_stock}
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedForPurchase(m)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-xs cursor-pointer"
                      >
                        + Purchase Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && materials.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={materials.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="low-stock materials"
          />
        )}
      </div>

      {/* ── Purchase Stock Modal ── */}
      <PurchaseStockModal
        material={selectedForPurchase}
        isOpen={selectedForPurchase !== null}
        onClose={() => setSelectedForPurchase(null)}
        onSuccess={() => loadLowStock()}
      />
    </div>
  );
}
