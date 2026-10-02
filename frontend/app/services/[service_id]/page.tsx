"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchService, deleteService, completeService, fetchMaterials } from "@/app/lib/api";
import type { Material, Service } from "@/app/lib/types";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-[#F3F4F6]">{value !== null && value !== "" ? value : "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Service["status"] }) {
  if (!status) return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
  const map: Record<string, string> = {
    DUE_TODAY: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    OVERDUE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    UPCOMING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  };
  const label: Record<string, string> = { DUE_TODAY: "Due Today", OVERDUE: "Overdue", UPCOMING: "Upcoming" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-2xs ${map[status] ?? ""}`}>
      {label[status] ?? status}
    </span>
  );
}

function CompletionBadge({ status }: { status: Service["completion_status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-2xs ${
      status === "COMPLETED"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20"
    }`}>
      {status === "COMPLETED" ? "Completed" : "Pending"}
    </span>
  );
}

interface SelectedMaterialItem {
  material_id: string;
  material_name: string;
  available_stock: number;
  unit: string;
  unit_price: number;
  quantity: number;
}

export default function ServiceDetailPage() {
  const { service_id } = useParams<{ service_id: string }>();
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Complete modal state
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterialItem[]>([]);
  const [chosenMatId, setChosenMatId] = useState("");

  // Delete modal state
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

   const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openCompleteModal = async () => {
    setShowComplete(true);
    setCompleteError(null);
    setSelectedMaterials([]);
    setChosenMatId("");
    try {
      const mats = await fetchMaterials();
      setAvailableMaterials(mats);
    } catch {
      // ignore
    }
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchService(service_id);
      setService(data);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("complete") === "true" && data.completion_status !== "COMPLETED") {
          openCompleteModal();
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [service_id]);

  const handleAddMaterial = () => {
    if (!chosenMatId) return;
    const mat = availableMaterials.find((m) => m.material_id === chosenMatId);
    if (!mat) return;

    if (selectedMaterials.some((sm) => sm.material_id === chosenMatId)) {
      setCompleteError(`Material "${mat.material_name}" is already in the list. Adjust its quantity directly.`);
      return;
    }

    if (mat.current_stock <= 0) {
      setCompleteError(`Material "${mat.material_name}" is out of stock!`);
      return;
    }

    setCompleteError(null);
    setSelectedMaterials((prev) => [
      ...prev,
      {
        material_id: mat.material_id,
        material_name: mat.material_name,
        available_stock: mat.current_stock,
        unit: mat.unit,
        unit_price: mat.purchase_price,
        quantity: 1,
      },
    ]);
    setChosenMatId("");
  };

  const handleQuantityChange = (material_id: string, qty: number) => {
    setCompleteError(null);
    setSelectedMaterials((prev) =>
      prev.map((item) => {
        if (item.material_id === material_id) {
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const handleRemoveMaterial = (material_id: string) => {
    setSelectedMaterials((prev) => prev.filter((item) => item.material_id !== material_id));
  };

  // Dynamic live material cost calculation
  const calculatedMaterialCost = selectedMaterials.reduce(
    (sum, m) => sum + m.quantity * m.unit_price,
    0
  );
  const labourCharge = service?.labour_charge || 0;
  const totalAmount = labourCharge + calculatedMaterialCost;

  async function handleComplete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!service) return;

    const fd = new FormData(e.currentTarget);
    const workDone = (fd.get("work_done") as string).trim();
    const nextDate = (fd.get("next_service_date") as string) || null;
    const notes = (fd.get("notes") as string).trim();

    if (!workDone) {
      setCompleteError("Work Done is required to complete the service.");
      return;
    }

    // Check stock for all selected materials
    for (const sm of selectedMaterials) {
      if (sm.quantity <= 0) {
        setCompleteError(`Quantity for "${sm.material_name}" must be greater than zero.`);
        return;
      }
      if (sm.quantity > sm.available_stock) {
        setCompleteError(
          `Insufficient stock for "${sm.material_name}". Available: ${sm.available_stock} ${sm.unit}, requested: ${sm.quantity} ${sm.unit}.`
        );
        return;
      }
    }

    setCompleting(true);
    setCompleteError(null);

    try {
      const updated = await completeService(service_id, {
        work_done: workDone,
        next_service_date: nextDate,
        materials: selectedMaterials.map((sm) => ({
          material_id: sm.material_id,
          quantity: sm.quantity,
        })),
        notes: notes || undefined,
      });

      setService(updated);
      setShowComplete(false);
      setSuccessMsg("Service marked as completed and inventory stock deducted.");
    } catch (err: unknown) {
      setCompleteError(err instanceof Error ? err.message : "Failed to complete service.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteService(service_id);
      router.push("/services");
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete service.");
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors";

  if (loading) {
    return <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">Loading service details…</div>;
  }

  if (error || !service) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 p-4 text-sm text-red-700 dark:text-rose-400">
        <p className="font-medium">Failed to load service</p>
        <p className="mt-1">{error ?? "Service not found."}</p>
        <Link href="/services" className="mt-3 inline-block text-blue-600 dark:text-blue-400 hover:underline">
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/services" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">← Services</Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#F3F4F6] mt-1 tracking-tight">{service.service_id}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={service.status} />
            <CompletionBadge status={service.completion_status} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {service.completion_status === "PENDING" && (
            <button
              onClick={openCompleteModal}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-xs cursor-pointer"
            >
              Complete Service
            </button>
          )}
          <Link
            href={`/services/${service_id}/edit`}
            className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={() => { setShowDelete(true); setDeleteError(null); }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-md bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800/50 px-4 py-3 text-sm text-green-700 dark:text-emerald-400">{successMsg}</div>
      )}

      {/* ── Service Details Card ── */}
      <div className="rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] p-6 shadow-xs mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-5">Service Information</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Customer ID</dt>
            <dd className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-0.5">
              <Link href={`/customers/${service.customer_id}`}>{service.customer_id} →</Link>
            </dd>
          </div>
          <Field label="Service Type" value={service.service_type} />
          <Field label="Service Date" value={service.service_date} />
          <Field label="Next Service Date" value={service.next_service_date} />
          <Field label="Technician" value={service.technician} />
          <Field label="Payment Status" value={service.payment_status} />
          <Field label="Labour Charge" value={`₹${service.labour_charge.toFixed(2)}`} />
          <Field label="Material Charge" value={`₹${service.material_charge.toFixed(2)}`} />
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Amount</dt>
            <dd className="text-xl font-bold text-gray-900 dark:text-[#F3F4F6] mt-0.5">₹{service.total_amount.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Status</dt>
            <dd><StatusBadge status={service.status} /></dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Completion Status</dt>
            <dd><CompletionBadge status={service.completion_status} /></dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Complaint" value={service.complaint} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Work Done" value={service.work_done} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Notes" value={service.notes} /></div>
        </dl>
      </div>

      {/* ── Materials Used in this Service Section ── */}
      <div className="rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] shadow-xs overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#26262B] flex flex-wrap justify-between items-center gap-3 bg-gray-50/75 dark:bg-[#17171A]">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] tracking-tight">Materials Used</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inventory spare parts consumed during this service</p>
          </div>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] px-3 py-1 rounded-lg">
            Material Charge: ₹{service.material_charge.toFixed(2)}
          </span>
        </div>

        {service.materials && service.materials.length > 0 ? (
          <>
            {/* Mobile Cards (< 640px) */}
            <div className="block sm:hidden divide-y divide-gray-100 dark:divide-[#26262B]">
              {service.materials.map((m) => (
                <div key={`mob-mat-${m.material_id}`} className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-[#F3F4F6] text-xs">
                      {m.material_name}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-[#F3F4F6] text-xs">
                      ₹{m.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <Link
                      href={`/inventory/${encodeURIComponent(m.material_id)}`}
                      className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {m.material_id}
                    </Link>
                    <span>
                      {m.quantity} × ₹{m.unit_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/50 dark:bg-[#17171A] text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#26262B] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Material ID</th>
                    <th className="px-4 py-3">Material Name</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Quantity</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Unit Price (₹)</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
                  {service.materials.map((m) => (
                    <tr key={m.material_id} className="hover:bg-gray-50/60 dark:hover:bg-[#1A1A1D]/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <Link href={`/inventory/${encodeURIComponent(m.material_id)}`} className="hover:underline">
                          {m.material_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-[#F3F4F6]">{m.material_name}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-[#F3F4F6]">{m.quantity}</td>
                      <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">₹{m.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-[#F3F4F6] whitespace-nowrap">₹{m.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {service.completion_status === "COMPLETED"
              ? "No inventory materials were recorded for this service."
              : "No materials consumed yet. Select materials used when clicking Complete Service."}
          </div>
        )}
      </div>

      {/* ── Complete Service Modal ── */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] mb-1">Complete Service</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Service {service.service_id} • Customer: {service.customer_id}
            </p>

            {completeError && (
              <p className="mb-4 text-sm text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded px-3 py-2">
                {completeError}
              </p>
            )}

            <form onSubmit={handleComplete} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="complete_work_done" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Work Done <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="complete_work_done"
                  name="work_done"
                  required
                  rows={2}
                  defaultValue={service.work_done}
                  placeholder="e.g. Replaced sediment filter and carbon block, checked TDS"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Materials Selection */}
              <div className="border border-gray-200 dark:border-[#26262B] rounded-lg p-3.5 bg-gray-50 dark:bg-[#17171A] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Materials Used (Stock Deduction)
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedMaterials.length} item{selectedMaterials.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Add Material Dropdown */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={chosenMatId}
                    onChange={(e) => setChosenMatId(e.target.value)}
                    className="flex-1 rounded border border-gray-300 dark:border-[#2E2E34] px-2.5 py-1.5 text-xs bg-white dark:bg-[#121214] text-gray-900 dark:text-[#F3F4F6] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a material from inventory...</option>
                    {availableMaterials.map((mat) => (
                      <option
                        key={mat.material_id}
                        value={mat.material_id}
                        disabled={mat.current_stock <= 0}
                      >
                        {mat.material_name} (Avail: {mat.current_stock} {mat.unit}) — ₹{mat.purchase_price}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    disabled={!chosenMatId}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 cursor-pointer text-center"
                  >
                    + Add
                  </button>
                </div>

                {/* Selected Materials List */}
                {selectedMaterials.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-[#26262B]">
                    {selectedMaterials.map((sm) => (
                      <div
                        key={sm.material_id}
                        className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{sm.material_name}</p>
                          <p className="text-gray-400 dark:text-gray-500 text-[11px]">
                            Available: {sm.available_stock} {sm.unit} • ₹{sm.unit_price}/unit
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-gray-100 dark:border-[#26262B]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                            <input
                              type="number"
                              min="1"
                              max={sm.available_stock}
                              step="any"
                              value={sm.quantity}
                              onChange={(e) =>
                                handleQuantityChange(sm.material_id, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-1 border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] rounded text-right font-medium"
                            />
                            <span className="text-gray-600 dark:text-gray-300">{sm.unit}</span>
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 min-w-16 text-right">
                            ₹{(sm.quantity * sm.unit_price).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(sm.material_id)}
                            className="text-red-500 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-300 ml-1 font-bold cursor-pointer p-1"
                            title="Remove material"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Calculation Preview */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded p-3 text-xs space-y-1">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Labour Charge:</span>
                  <span>₹{labourCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Material Charge (Calculated):</span>
                  <span>₹{calculatedMaterialCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-[#F3F4F6] border-t border-blue-200 dark:border-blue-900/40 pt-1 text-sm">
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="complete_next_date" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Next Service Date
                  </label>
                  <input
                    id="complete_next_date"
                    name="next_service_date"
                    type="date"
                    defaultValue={service.next_service_date ?? ""}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="complete_notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Additional Notes
                  </label>
                  <input
                    id="complete_notes"
                    name="notes"
                    type="text"
                    defaultValue={service.notes}
                    placeholder="Optional notes"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#26262B]">
                <button
                  type="button"
                  onClick={() => setShowComplete(false)}
                  disabled={completing}
                  className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completing}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {completing ? "Saving & Deducting Stock…" : "Complete Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] mb-1">Delete Service?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Delete service <strong>{service.service_id}</strong> ({service.service_type})?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            {deleteError && (
              <p className="mb-4 text-sm text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded px-3 py-2">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
