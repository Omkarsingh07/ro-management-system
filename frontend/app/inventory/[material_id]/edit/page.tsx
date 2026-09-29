"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMaterial, updateMaterial } from "@/app/lib/api";
import type { Material, MaterialUpdateData } from "@/app/lib/types";

export default function EditMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.material_id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing material reference for read-only fields
  const [existingMaterial, setExistingMaterial] = useState<Material | null>(null);

  const [form, setForm] = useState<MaterialUpdateData>({
    material_name: "",
    category: "",
    unit: "",
    minimum_stock: "0",
    purchase_price: "0",
    selling_price: "0",
    supplier: "",
  });

  useEffect(() => {
    async function load() {
      if (!materialId) return;
      setLoading(true);
      setError(null);
      try {
        const mat = await fetchMaterial(materialId);
        setExistingMaterial(mat);
        setForm({
          material_name: mat.material_name,
          category: mat.category,
          unit: mat.unit,
          minimum_stock: String(mat.minimum_stock),
          purchase_price: String(mat.purchase_price),
          selling_price: String(mat.selling_price),
          supplier: mat.supplier,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load material.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [materialId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const minStock = parseFloat(String(form.minimum_stock)) || 0;
    const pPrice = parseFloat(String(form.purchase_price)) || 0;
    const sPrice = parseFloat(String(form.selling_price)) || 0;

    if (minStock < 0 || pPrice < 0 || sPrice < 0) {
      setError("Stock thresholds and prices cannot be negative.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateMaterial(materialId, {
        material_name: form.material_name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        minimum_stock: minStock,
        purchase_price: pPrice,
        selling_price: sPrice,
        supplier: form.supplier.trim(),
      });
      router.push(`/inventory/${encodeURIComponent(materialId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update material.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-sm text-gray-500">
        Loading material...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/inventory" className="hover:underline">Inventory</Link>
            <span>/</span>
            <Link href={`/inventory/${encodeURIComponent(materialId)}`} className="hover:underline">
              {materialId}
            </Link>
            <span>/</span>
            <span>Edit</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Edit Material</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Update specifications, pricing, and supplier information.
          </p>
        </div>
        <Link
          href={`/inventory/${encodeURIComponent(materialId)}`}
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 border border-gray-300 dark:border-[#2E2E34] rounded hover:bg-gray-50 dark:hover:bg-[#17171A]"
        >
          Cancel
        </Link>
      </div>

      {/* ── Notice regarding Stock Integrity ── */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-md text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
        <span className="text-base leading-none">ℹ️</span>
        <div>
          <strong>Stock Integrity Note:</strong> Current Stock is{" "}
          <span className="font-semibold underline">
            {existingMaterial?.current_stock} {existingMaterial?.unit}
          </span>
          . Stock counts cannot be directly edited here to prevent inventory discrepancies. Use{" "}
          <strong>Purchase Stock</strong> or <strong>Adjust Stock</strong> on the details page.
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-md text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-lg shadow-sm p-6 space-y-6 text-sm">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-[#26262B] pb-2">
            Material Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-gray-500 dark:text-gray-400 mb-1 text-xs uppercase tracking-wider">
                Material ID (Read-only)
              </label>
              <input
                type="text"
                disabled
                value={materialId}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-[#1A1A1E] text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-[#2E2E34] rounded font-mono cursor-not-allowed text-xs"
              />
            </div>

            <div className="sm:col-span-2">
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
                className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
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
                placeholder="e.g. Filter, Membrane, Pump"
                className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                placeholder="e.g. pcs, set, box, metre"
                className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Stock Thresholds */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-[#26262B] pb-2">
            Stock Thresholds
          </h2>

          <div>
            <label htmlFor="minimum_stock" className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Stock Alert Threshold
            </label>
            <input
              id="minimum_stock"
              type="number"
              step="any"
              min="0"
              name="minimum_stock"
              value={form.minimum_stock}
              onChange={handleChange}
              className="w-full max-w-xs px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Warns when inventory falls below this quantity.
            </p>
          </div>
        </div>

        {/* Pricing & Supplier */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-[#26262B] pb-2">
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
                className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
              className="w-full px-3 py-2 bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-900 dark:text-gray-100 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#26262B]">
          <Link
            href={`/inventory/${encodeURIComponent(materialId)}`}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded border border-gray-300 dark:border-[#2E2E34] hover:bg-gray-50 dark:hover:bg-[#17171A]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm disabled:opacity-50"
          >
            {submitting ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

