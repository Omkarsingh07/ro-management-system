"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchMaterial, fetchStockTransactions } from "@/app/lib/api";
import type { Material, StockTransaction } from "@/app/lib/types";
import { PurchaseStockModal, AdjustStockModal, StockStatusBadge } from "../StockModals";

export default function MaterialDetailPage() {
  const params = useParams();
  const materialId = params.material_id as string;

  const [material, setMaterial] = useState<Material | null>(null);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const loadData = async () => {
    if (!materialId) return;
    setLoading(true);
    setError(null);
    try {
      const [matData, txData] = await Promise.all([
        fetchMaterial(materialId),
        fetchStockTransactions(materialId),
      ]);
      setMaterial(matData);
      setTransactions(txData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load material details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [materialId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading material details...
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded-xl text-sm text-red-700 dark:text-rose-400">
          {error || "Material not found."}
        </div>
        <Link
          href="/inventory"
          className="inline-block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#26262B] rounded-md hover:bg-gray-50 dark:hover:bg-[#1A1A1D]"
        >
          ← Back to Inventory
        </Link>
      </div>
    );
  }

  const profitMargin = material.selling_price - material.purchase_price;

  return (
    <div className="w-full space-y-6">
      {/* ── Breadcrumb & Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/inventory" className="hover:underline">Inventory</Link>
            <span>/</span>
            <span>{material.material_id}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">{material.material_name}</h1>
            <StockStatusBadge
              currentStock={material.current_stock}
              minimumStock={material.minimum_stock}
              isOutOfStock={material.is_out_of_stock}
              isLowStock={material.is_low_stock}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">ID: {material.material_id}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPurchaseModal(true)}
            className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            + Purchase Stock
          </button>
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1A1A1D] shadow-xs transition-colors cursor-pointer"
          >
            Adjust Stock
          </button>
          <Link
            href={`/inventory/${encodeURIComponent(material.material_id)}/edit`}
            className="px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1A1A1D] shadow-xs transition-colors"
          >
            Edit
          </Link>
          <Link
            href="/inventory"
            className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Back
          </Link>
        </div>
      </div>

      {/* ── Main Information Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Stock Level Card */}
        <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Stock Overview</h2>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6]">
              {material.current_stock}{" "}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{material.unit}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Available in shop stock</p>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-[#26262B] flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Minimum Threshold:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{material.minimum_stock} {material.unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Unit of Measure:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{material.unit}</span>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pricing & Margin</h2>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6]">₹{material.selling_price}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Customer selling price</p>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-[#26262B] flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Latest Purchase Price:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">₹{material.purchase_price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Estimated Margin:</span>
            <span className={profitMargin >= 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-600 dark:text-rose-400"}>
              ₹{profitMargin} {material.purchase_price > 0 ? `(${((profitMargin / material.purchase_price) * 100).toFixed(0)}%)` : ""}
            </span>
          </div>
        </div>

        {/* Categorisation & Supplier */}
        <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Classification</h2>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6]">{material.category || "Uncategorized"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Material category</p>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-[#26262B] space-y-1 text-sm">
            <p className="text-gray-500 dark:text-gray-400">Preferred Supplier:</p>
            <p className="font-medium text-gray-900 dark:text-[#F3F4F6]">{material.supplier || "Not specified"}</p>
          </div>
        </div>
      </div>

      {/* ── Transaction History for this Material ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#26262B] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] tracking-tight">Stock Transactions History</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Audit trail of purchases and manual adjustments for this material</p>
          </div>
          <Link
            href={`/inventory/transactions?material_id=${encodeURIComponent(material.material_id)}`}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
          >
            View in All Transactions →
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No stock transactions recorded for this material yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50/75 dark:bg-[#17171A] text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#26262B] tracking-wider">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Tx ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Quantity</th>
                  <th className="px-4 py-3 whitespace-nowrap">Reference #</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
                {transactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-gray-50/60 dark:hover:bg-[#1A1A1D]/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-900 dark:text-[#F3F4F6] whitespace-nowrap">{tx.transaction_id}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap font-medium">{tx.date}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-2xs ${
                        tx.transaction_type === "PURCHASE" || tx.transaction_type === "OPENING_STOCK"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-semibold whitespace-nowrap text-xs ${
                      tx.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {material.unit}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{tx.reference_id || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700 dark:text-gray-300">{tx.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Purchase Modal ── */}
      <PurchaseStockModal
        material={material}
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => loadData()}
      />

      {/* ── Adjust Modal ── */}
      <AdjustStockModal
        material={material}
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
