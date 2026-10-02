"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchMaterials, fetchStockTransactions } from "@/app/lib/api";
import type { Material, StockTransaction } from "@/app/lib/types";
import { Pagination } from "@/app/components/Pagination";
import { DateFilter } from "@/app/components/DateFilter";

const PAGE_SIZE = 10;

function TransactionsContent() {
  const searchParams = useSearchParams();
  const initialMaterialId = searchParams.get("material_id") || "";
  const initialType = searchParams.get("transaction_type") || "";

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(initialMaterialId);
  const [selectedType, setSelectedType] = useState(initialType);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load materials list for filter dropdown
  useEffect(() => {
    fetchMaterials()
      .then(setMaterials)
      .catch(() => {});
  }, []);

  const loadTransactions = async (matId?: string, type?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockTransactions(
        matId !== undefined ? matId : selectedMaterialId,
        type !== undefined ? type : selectedType
      );
      setTransactions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load stock transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(selectedMaterialId, selectedType);
  }, [selectedMaterialId, selectedType]);

  const materialMap = new Map(materials.map((m) => [m.material_id, m]));

  const filteredTransactions = transactions.filter((tx) => {
    if (startDate || endDate) {
      const tDate = tx.date ? tx.date.split("T")[0].split(" ")[0] : "";
      if (!tDate) return false;
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
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
            <span>Stock Transactions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">Stock Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Complete audit trail of all purchases, opening stocks, and manual inventory adjustments.
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#26262B] rounded-md px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-[#1A1A1D] shadow-xs transition-colors"
        >
          ← Back to Inventory
        </Link>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-4 shadow-xs flex flex-wrap gap-3.5 items-center">
        <div>
          <label htmlFor="filter_material" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Filter by Material
          </label>
          <select
            id="filter_material"
            value={selectedMaterialId}
            onChange={(e) => {
              setSelectedMaterialId(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-200 dark:border-[#2E2E34] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] focus:outline-none min-w-[200px]"
          >
            <option value="">All Materials</option>
            {materials.map((m) => (
              <option key={m.material_id} value={m.material_id}>
                {m.material_id} — {m.material_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter_type" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Transaction Type
          </label>
          <select
            id="filter_type"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-200 dark:border-[#2E2E34] rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] focus:outline-none min-w-[160px]"
          >
            <option value="">All Types</option>
            <option value="PURCHASE">PURCHASE</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
            <option value="OPENING_STOCK">OPENING_STOCK</option>
            <option value="SERVICE_USAGE">SERVICE_USAGE</option>
          </select>
        </div>

        <div className="pt-2 sm:pt-0">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
              setCurrentPage(1);
            }}
            label="Transaction Date"
          />
        </div>

        {(selectedMaterialId || selectedType || startDate || endDate) && (
          <div className="self-end pb-1">
            <button
              onClick={() => {
                setSelectedMaterialId("");
                setSelectedType("");
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded-xl text-sm text-red-700 dark:text-rose-400 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadTransactions()}
            className="underline font-medium hover:text-red-800 dark:hover:text-rose-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Transactions Table ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p>Loading transactions ledger...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-gray-700 dark:text-gray-300 font-bold text-base">No inventory transactions found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedMaterialId || selectedType
                ? "Try clearing your filters to see other transactions."
                : "Transactions are logged automatically when materials are created, purchased, or adjusted."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden p-3 space-y-3">
              {paginatedTransactions.map((tx) => {
                const mat = materialMap.get(tx.material_id);
                const isPositive = tx.quantity > 0;
                return (
                  <div
                    key={`mobile-tx-${tx.transaction_id}`}
                    className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-2xl p-4 shadow-xs space-y-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1E1E22] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2C2C32]">
                        #{tx.transaction_id}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        📅 {tx.date}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-100 dark:border-[#1E1E22]">
                      <div>
                        <Link
                          href={`/inventory/${encodeURIComponent(tx.material_id)}`}
                          className="font-bold text-gray-900 dark:text-[#F3F4F6] text-sm hover:underline block"
                        >
                          {mat ? mat.material_name : tx.material_id}
                        </Link>
                        <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                          {tx.material_id}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold text-base block ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}{" "}
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{mat?.unit || ""}</span>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${
                            tx.transaction_type === "PURCHASE" || tx.transaction_type === "OPENING_STOCK"
                              ? "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-900/50"
                              : tx.transaction_type === "SERVICE_USAGE"
                              ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50"
                              : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </div>
                    </div>

                    {(tx.reference_id || tx.notes) && (
                      <div className="bg-gray-50/80 dark:bg-[#17171A] p-2 rounded-lg text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-[#222227] space-y-0.5">
                        {tx.reference_id && (
                          <div>
                            <span className="text-gray-400 text-[10px] uppercase font-semibold mr-1">Ref:</span>
                            {tx.transaction_type === "SERVICE_USAGE" ? (
                              <Link
                                href={`/services/${encodeURIComponent(tx.reference_id)}`}
                                className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                              >
                                {tx.reference_id}
                              </Link>
                            ) : (
                              <span className="font-mono font-medium">{tx.reference_id}</span>
                            )}
                          </div>
                        )}
                        {tx.notes && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {tx.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/75 dark:bg-[#161619] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#26262B]">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Tx ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 whitespace-nowrap">Material</th>
                    <th className="px-4 py-3 whitespace-nowrap">Transaction Type</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Quantity</th>
                    <th className="px-4 py-3 whitespace-nowrap">Reference ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">Notes / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60 text-sm">
                  {paginatedTransactions.map((tx) => {
                    const mat = materialMap.get(tx.material_id);
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-gray-50/60 dark:hover:bg-[#17171A]/60 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1E1E22] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2C2C32]">
                            {tx.transaction_id}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">{tx.date}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/inventory/${encodeURIComponent(tx.material_id)}`}
                            className="font-semibold text-gray-900 dark:text-[#F3F4F6] hover:text-blue-600 dark:hover:text-blue-400 hover:underline block"
                          >
                            {mat ? mat.material_name : tx.material_id}
                          </Link>
                          <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{tx.material_id}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              tx.transaction_type === "PURCHASE" || tx.transaction_type === "OPENING_STOCK"
                                ? "bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-400 border-green-200 dark:border-emerald-900/50"
                                : tx.transaction_type === "SERVICE_USAGE"
                                ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50"
                                : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                            }`}
                          >
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}{" "}
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{mat?.unit || ""}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                          {tx.reference_id ? (
                            tx.transaction_type === "SERVICE_USAGE" ? (
                              <Link
                                href={`/services/${encodeURIComponent(tx.reference_id)}`}
                                className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                              >
                                {tx.reference_id}
                              </Link>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{tx.reference_id}</span>
                            )
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                          {tx.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredTransactions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="transactions"
          />
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
