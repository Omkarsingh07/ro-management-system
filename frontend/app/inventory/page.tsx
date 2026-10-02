"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchMaterials, searchMaterials } from "@/app/lib/api";
import type { Material } from "@/app/lib/types";
import { PurchaseStockModal, AdjustStockModal, StockStatusBadge } from "./StockModals";
import { Pagination } from "@/app/components/Pagination";

const PAGE_SIZE = 10;

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Selected material for modals
  const [selectedForPurchase, setSelectedForPurchase] = useState<Material | null>(null);
  const [selectedForAdjust, setSelectedForAdjust] = useState<Material | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMaterials = async (searchQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = searchQuery !== undefined ? searchQuery : query;
      let data: Material[];
      if (q.trim()) {
        data = await searchMaterials(q.trim());
      } else {
        data = await fetchMaterials();
      }
      setMaterials(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials("");
  }, []);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadMaterials(val);
    }, 300);
  };

  // KPIs derived from actual loaded materials
  const totalCount = materials.length;
  const outOfStockCount = materials.filter((m) => m.current_stock === 0).length;
  const lowStockCount = materials.filter((m) => m.current_stock > 0 && m.current_stock <= m.minimum_stock).length;
  const inStockCount = materials.filter((m) => m.current_stock > m.minimum_stock).length;

  // Client-side status filter
  const filteredMaterials = materials.filter((m) => {
    if (statusFilter === "OUT_OF_STOCK") return m.current_stock === 0;
    if (statusFilter === "LOW_STOCK") return m.current_stock > 0 && m.current_stock <= m.minimum_stock;
    if (statusFilter === "IN_STOCK") return m.current_stock > m.minimum_stock;
    return true;
  });

  const totalPages = Math.ceil(filteredMaterials.length / PAGE_SIZE) || 1;
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-[#26262B]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">Inventory</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60">
              {materials.length} items
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage spare parts, purifier materials, stock purchases, and adjustments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/inventory/transactions"
            className="px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#2A2A30] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1E1E24] shadow-xs transition-colors"
          >
            Transactions
          </Link>
          <Link
            href="/inventory/low-stock"
            className="px-3.5 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl hover:bg-amber-100/70 dark:hover:bg-amber-900/50 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Low Stock</span>
            {lowStockCount + outOfStockCount > 0 && (
              <span className="bg-amber-600 text-white rounded-full text-[10px] font-bold px-1.5 py-0.5">
                {lowStockCount + outOfStockCount}
              </span>
            )}
          </Link>
          <Link
            href="/inventory/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            + Add Material
          </Link>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Materials</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6] mt-1.5">{totalCount}</p>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block">Catalogued parts</span>
        </div>
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">In Stock</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1.5">{inStockCount}</p>
          <span className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5 block">Healthy levels</span>
        </div>
        <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Low Stock</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1.5">{lowStockCount}</p>
          <span className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5 block">Below threshold</span>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${
          outOfStockCount > 0
            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
            : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B]"
        }`}>
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Out of Stock</p>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1.5">{outOfStockCount}</p>
          <span className="text-xs text-rose-600/70 dark:text-rose-500/70 mt-0.5 block">Needs replenishment</span>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by material ID, name, category, or supplier..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50/50 dark:bg-[#17171A] border border-gray-200 dark:border-[#2E2E34] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {query && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK");
              setCurrentPage(1);
            }}
            className="text-xs font-medium border border-gray-200 dark:border-[#2E2E34] rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-[#17171A] text-gray-800 dark:text-[#F3F4F6] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Items</option>
            <option value="IN_STOCK">In Stock Only</option>
            <option value="LOW_STOCK">Low Stock Only</option>
            <option value="OUT_OF_STOCK">Out of Stock Only</option>
          </select>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-1">
            <span className="font-bold text-gray-900 dark:text-white">{filteredMaterials.length}</span> results
          </span>
        </div>
      </div>

      {/* ── Error Notification ── */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-400 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadMaterials()}
            className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Materials Table ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400 space-y-3">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading inventory...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <p className="text-gray-700 dark:text-gray-300 font-medium text-base">No materials found.</p>
            {query || statusFilter !== "ALL" ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">No items match your active search or filters.</p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Add your first material to start tracking shop inventory.</p>
            )}
            <div className="pt-2">
              <Link
                href="/inventory/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors"
              >
                + Add Material
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden p-3 space-y-3">
              {paginatedMaterials.map((m) => (
                <div
                  key={`mobile-${m.material_id}`}
                  className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-2xl p-4 shadow-xs space-y-3 transition-colors"
                >
                  {/* Top row: Name & Stock Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/inventory/${m.material_id}`}
                        className="font-bold text-gray-900 dark:text-[#F3F4F6] text-sm hover:text-blue-600 dark:hover:text-blue-400 block"
                      >
                        {m.material_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {m.material_id}
                        </span>
                        {m.category && (
                          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#1C1C20] px-2 py-0.5 rounded-md">
                            {m.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <StockStatusBadge
                      currentStock={m.current_stock}
                      minimumStock={m.minimum_stock}
                      isOutOfStock={m.is_out_of_stock}
                      isLowStock={m.is_low_stock}
                    />
                  </div>

                  {/* Stock & Pricing details */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/80 dark:bg-[#17171A] p-3 rounded-xl border border-gray-100 dark:border-[#222227] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 block">
                        Current Stock
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {m.current_stock} <span className="text-xs font-normal text-gray-500">{m.unit}</span>
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Min required: {m.minimum_stock} {m.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 block">
                        Selling Price
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        ₹{m.selling_price}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Cost: ₹{m.purchase_price}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100 dark:border-[#1E1E22]">
                    <button
                      type="button"
                      onClick={() => setSelectedForPurchase(m)}
                      className="flex-1 py-2 px-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl transition-colors cursor-pointer"
                    >
                      + Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForAdjust(m)}
                      className="flex-1 py-2 px-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 rounded-xl transition-colors cursor-pointer"
                    >
                      Adjust
                    </button>
                    <Link
                      href={`/inventory/${m.material_id}`}
                      className="py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-xl transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      href={`/inventory/${m.material_id}/edit`}
                      className="py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-[#1A1A1E] dark:hover:bg-[#222227] border border-gray-200 dark:border-[#2E2E34] rounded-xl transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/75 dark:bg-[#161619] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#26262B]">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Material ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">Material Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Current Stock</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Min Stock</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Purchase Price</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Selling Price</th>
                    <th className="px-4 py-3 whitespace-nowrap">Supplier</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60 text-sm">
                  {paginatedMaterials.map((m) => (
                    <tr key={m.material_id} className="hover:bg-gray-50/60 dark:hover:bg-[#17171A]/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/inventory/${m.material_id}`}
                          className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1E1E22] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2C2C32] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {m.material_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-gray-900 dark:text-[#F3F4F6]">
                        <Link
                          href={`/inventory/${m.material_id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {m.material_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                        {m.category || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-gray-900 dark:text-[#F3F4F6]">
                          {m.current_stock}
                        </span>{" "}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {m.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {m.minimum_stock} <span className="text-xs text-gray-400 font-normal">{m.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap">
                        ₹{m.purchase_price}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-[#F3F4F6] whitespace-nowrap">
                        ₹{m.selling_price}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {m.supplier || "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StockStatusBadge
                          currentStock={m.current_stock}
                          minimumStock={m.minimum_stock}
                          isOutOfStock={m.is_out_of_stock}
                          isLowStock={m.is_low_stock}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedForPurchase(m)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
                            title="Purchase / Add Stock"
                          >
                            + Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedForAdjust(m)}
                            className="px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 rounded-lg transition-colors cursor-pointer"
                            title="Manual Stock Adjustment"
                          >
                            Adjust
                          </button>
                          <Link
                            href={`/inventory/${m.material_id}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-lg transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            href={`/inventory/${m.material_id}/edit`}
                            className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-[#1A1A1E] dark:hover:bg-[#222227] border border-gray-200 dark:border-[#2E2E34] rounded-lg transition-colors"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table footer with pagination */}
        {!loading && filteredMaterials.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredMaterials.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="materials"
          />
        )}
      </div>

      {/* ── Purchase Stock Modal ── */}
      <PurchaseStockModal
        material={selectedForPurchase}
        isOpen={selectedForPurchase !== null}
        onClose={() => setSelectedForPurchase(null)}
        onSuccess={() => loadMaterials()}
      />

      {/* ── Adjust Stock Modal ── */}
      <AdjustStockModal
        material={selectedForAdjust}
        isOpen={selectedForAdjust !== null}
        onClose={() => setSelectedForAdjust(null)}
        onSuccess={() => loadMaterials()}
      />
    </div>
  );
}
