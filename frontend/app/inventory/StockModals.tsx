"use client";

import { useEffect, useState } from "react";
import { purchaseStock, adjustStock } from "@/app/lib/api";
import type { Material, StockTransaction } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

export function StockStatusBadge({
  currentStock,
  minimumStock,
  isOutOfStock,
  isLowStock,
}: {
  currentStock: number;
  minimumStock: number;
  isOutOfStock?: boolean;
  isLowStock?: boolean;
}) {
  const outOfStock = isOutOfStock ?? currentStock === 0;
  const lowStock = isLowStock ?? (currentStock > 0 && currentStock <= minimumStock);

  if (outOfStock) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
        Out of Stock
      </span>
    );
  }

  if (lowStock) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      In Stock
    </span>
  );
}

// ---------------------------------------------------------------------------
// Purchase Stock Modal
// ---------------------------------------------------------------------------

interface PurchaseModalProps {
  material: Pick<Material, "material_id" | "material_name" | "current_stock" | "unit" | "purchase_price"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tx: StockTransaction) => void;
}

export function PurchaseStockModal({ material, isOpen, onClose, onSuccess }: PurchaseModalProps) {
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [date, setDate] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (material) {
      setQuantity("");
      setPurchasePrice(material.purchase_price !== undefined ? String(material.purchase_price) : "");
      setDate(new Date().toISOString().split("T")[0]);
      setReferenceId("");
      setNotes("");
      setError(null);
    }
  }, [material, isOpen]);

  if (!isOpen || !material) return null;

  const numQty = parseFloat(quantity) || 0;
  const newStockPreview = material.current_stock + numQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0) {
      setError("Purchase quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await purchaseStock({
        material_id: material.material_id,
        quantity: numQty,
        purchase_price: purchasePrice !== "" ? parseFloat(purchasePrice) : null,
        date: date || null,
        reference_id: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record stock purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 text-gray-900 dark:text-[#F3F4F6] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#F3F4F6]">Purchase Stock</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{material.material_name} ({material.material_id})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-[#17171A] border border-gray-200 dark:border-[#26262B] rounded-lg p-3 mb-4 text-xs flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Current Stock: <strong className="text-gray-900 dark:text-[#F3F4F6]">{material.current_stock} {material.unit}</strong></span>
          <span className="text-gray-600 dark:text-gray-300">New Stock: <strong className="text-green-700 dark:text-emerald-400">{newStockPreview} {material.unit}</strong></span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded text-sm text-red-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity to Add * ({material.unit})
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 20"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Purchase Price (₹ per {material.unit})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Latest purchase unit price"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Reference / PO #</label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. PO-2026-001"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplier delivery invoice #1024"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#26262B]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? "Adding Stock..." : "Add Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adjust Stock Modal
// ---------------------------------------------------------------------------

interface AdjustModalProps {
  material: Pick<Material, "material_id" | "material_name" | "current_stock" | "unit"> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tx: StockTransaction) => void;
}

export function AdjustStockModal({ material, isOpen, onClose, onSuccess }: AdjustModalProps) {
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (material) {
      setQuantity("");
      setDate(new Date().toISOString().split("T")[0]);
      setReferenceId("");
      setNotes("");
      setError(null);
    }
  }, [material, isOpen]);

  if (!isOpen || !material) return null;

  const numQty = parseFloat(quantity) || 0;
  const newStockPreview = material.current_stock + numQty;
  const isInvalidNegative = newStockPreview < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty === 0) {
      setError("Adjustment quantity cannot be zero.");
      return;
    }
    if (isInvalidNegative) {
      setError(`Cannot reduce stock by ${Math.abs(numQty)}. Current stock is only ${material.current_stock}.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await adjustStock({
        material_id: material.material_id,
        quantity: numQty,
        date: date || null,
        reference_id: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record stock adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-2xl shadow-xl max-w-md w-full p-5 sm:p-6 text-gray-900 dark:text-[#F3F4F6] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#F3F4F6]">Adjust Stock</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{material.material_name} ({material.material_id})</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-[#17171A] border border-gray-200 dark:border-[#26262B] rounded-lg p-3 mb-4 text-xs flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Current Stock: <strong className="text-gray-900 dark:text-[#F3F4F6]">{material.current_stock} {material.unit}</strong></span>
          <span className="text-gray-600 dark:text-gray-300">
            New Stock:{" "}
            <strong className={isInvalidNegative ? "text-red-600 dark:text-rose-400 font-bold" : "text-blue-700 dark:text-blue-400"}>
              {newStockPreview} {material.unit}
            </strong>
          </span>
        </div>

        {isInvalidNegative && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded text-xs text-red-700 dark:text-rose-400">
            Resulting stock cannot become negative (minimum adjustment allowed is -{material.current_stock}).
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded text-sm text-red-700 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adjustment Quantity * ({material.unit})
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Positive to add (e.g. 5), negative to subtract (e.g. -2 for breakage/loss).
            </p>
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. -2 or 5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Notes *</label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Physical stock count discrepancy / Damaged unit"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Reference ID</label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. AUDIT-2026-09"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#26262B]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isInvalidNegative}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? "Applying..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
