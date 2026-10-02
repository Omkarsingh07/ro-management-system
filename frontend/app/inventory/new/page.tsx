"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createMaterial } from "@/app/lib/api";
import type { MaterialFormData } from "@/app/lib/types";

export default function NewMaterialPage() {
  const router = useRouter();

  const [form, setForm] = useState<MaterialFormData>({
    material_name: "",
    category: "",
    unit: "pcs",
    current_stock: "0",
    minimum_stock: "0",
    purchase_price: "0",
    selling_price: "0",
    supplier: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.material_name.trim()) {
      setError("Material Name is required.");
      return;
    }
    if (!form.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    const openStock = parseFloat(String(form.current_stock)) || 0;
    const minStock = parseFloat(String(form.minimum_stock)) || 0;
    const pPrice = parseFloat(String(form.purchase_price)) || 0;
    const sPrice = parseFloat(String(form.selling_price)) || 0;

    if (openStock < 0 || minStock < 0 || pPrice < 0 || sPrice < 0) {
      setError("Quantities and prices cannot be negative.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createMaterial({
        material_name: form.material_name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        current_stock: openStock,
        minimum_stock: minStock,
        purchase_price: pPrice,
        selling_price: sPrice,
        supplier: form.supplier.trim(),
      });
      router.push(`/inventory/${encodeURIComponent(created.material_id)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create material.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/inventory" className="hover:underline">Inventory</Link>
            <span>/</span>
            <span>New Material</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">Add New Material</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Register a new spare part or water purifier component into shop inventory.
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] rounded hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors"
        >
          Cancel
        </Link>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded-xl text-sm text-red-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xs p-4 sm:p-6 space-y-6 text-sm">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#F3F4F6] border-b border-gray-100 dark:border-[#26262B] pb-2">
            Material Information
          </h2>

          <div>
            <label htmlFor="material_name" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Material Name *
            </label>
            <input
              id="material_name"
              type="text"
              name="material_name"
              required
              value={form.material_name}
              onChange={handleChange}
              placeholder="e.g. Sediment Filter 10 inch, RO Membrane 75 GPD"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <input
                id="category"
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Filter, Membrane, Pump, Valve"
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="unit" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit of Measure *
              </label>
              <input
                id="unit"
                type="text"
                name="unit"
                required
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g. pcs, set, box, litre, meter"
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Stock & Quantities */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#F3F4F6] border-b border-gray-100 dark:border-[#26262B] pb-2">
            Stock Levels
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="current_stock" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opening Stock
              </label>
              <input
                id="current_stock"
                type="number"
                step="any"
                min="0"
                name="current_stock"
                value={form.current_stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If &gt; 0, an initial opening stock transaction will be recorded automatically.
              </p>
            </div>

            <div>
              <label htmlFor="minimum_stock" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Stock Alert
              </label>
              <input
                id="minimum_stock"
                type="number"
                step="any"
                min="0"
                name="minimum_stock"
                value={form.minimum_stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Triggers Low Stock warning when stock falls to or below this level.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing & Supplier */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-[#F3F4F6] border-b border-gray-100 dark:border-[#26262B] pb-2">
            Pricing & Supplier
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase_price" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Price (₹)
              </label>
              <input
                id="purchase_price"
                type="number"
                step="any"
                min="0"
                name="purchase_price"
                value={form.purchase_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="selling_price" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selling Price (₹)
              </label>
              <input
                id="selling_price"
                type="number"
                step="any"
                min="0"
                name="selling_price"
                value={form.selling_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="supplier" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supplier Name
            </label>
            <input
              id="supplier"
              type="text"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              placeholder="e.g. ABC Spares Distributor, Kent Genuine Parts"
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] placeholder-gray-400 dark:placeholder-gray-500 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#26262B]">
          <Link
            href="/inventory"
            className="px-4 py-2.5 text-sm text-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium text-center text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? "Saving..." : "Create Material"}
          </button>
        </div>
      </form>
    </div>
  );
}
