"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchService, updateService } from "@/app/lib/api";
import type { Service } from "@/app/lib/types";

const SERVICE_TYPES = [
  "Regular Service",
  "Filter Replacement",
  "Repair",
  "Installation",
  "AMC Service",
  "Other",
];

const PAYMENT_STATUSES = ["Pending", "Paid", "Partial"];

export default function EditServicePage() {
  const { service_id } = useParams<{ service_id: string }>();
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchService(service_id);
        setService(data);
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : "Failed to load service.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [service_id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      service_date: (fd.get("service_date") as string).trim(),
      service_type: (fd.get("service_type") as string).trim(),
      technician: (fd.get("technician") as string).trim(),
      complaint: (fd.get("complaint") as string).trim(),
      work_done: (fd.get("work_done") as string).trim(),
      next_service_date: (fd.get("next_service_date") as string).trim(),
      labour_charge: parseFloat((fd.get("labour_charge") as string) || "0") || 0,
      material_charge: parseFloat((fd.get("material_charge") as string) || "0") || 0,
      payment_status: (fd.get("payment_status") as string).trim() || "Pending",
      notes: (fd.get("notes") as string).trim(),
    };
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateService(service_id, data);
      router.push(`/services/${service_id}`);
      router.refresh();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to update service.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors";

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading service…</p>;

  if (loadError || !service) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-sm text-red-700 dark:text-rose-400 max-w-lg">
        {loadError ?? "Service not found."}
        <div className="mt-3">
          <Link href="/services" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">← Services</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link href={`/services/${service_id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          ← {service_id}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-[#F3F4F6] mt-1 tracking-tight">Edit Service</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
          {service_id} · Customer: {service.customer_id}
        </p>
      </div>

      <div className="bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-[#26262B] p-6 max-w-3xl shadow-xs">
        {submitError && (
          <div className="mb-5 rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-sm text-red-700 dark:text-rose-400">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Service Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="service_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                id="service_date"
                name="service_date"
                type="date"
                required
                defaultValue={service.service_date ?? ""}
                className={inputCls}
              />
            </div>

            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <label htmlFor="service_type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Type <span className="text-red-500">*</span>
              </label>
              <select id="service_type" name="service_type" required defaultValue={service.service_type} className={inputCls}>
                {SERVICE_TYPES.includes(service.service_type) ? null : (
                  <option value={service.service_type}>{service.service_type}</option>
                )}
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Technician */}
            <div className="flex flex-col gap-1">
              <label htmlFor="technician" className="text-sm font-medium text-gray-700 dark:text-gray-300">Technician</label>
              <input id="technician" name="technician" type="text" defaultValue={service.technician} className={inputCls} />
            </div>

            {/* Next Service Date */}
            <div className="flex flex-col gap-1">
              <label htmlFor="next_service_date" className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Service Date</label>
              <input
                id="next_service_date"
                name="next_service_date"
                type="date"
                defaultValue={service.next_service_date ?? ""}
                className={inputCls}
              />
            </div>

            {/* Labour Charge */}
            <div className="flex flex-col gap-1">
              <label htmlFor="labour_charge" className="text-sm font-medium text-gray-700 dark:text-gray-300">Labour Charge (₹)</label>
              <input
                id="labour_charge"
                name="labour_charge"
                type="number"
                min="0"
                step="0.01"
                defaultValue={service.labour_charge}
                className={inputCls}
              />
            </div>

            {/* Material Charge */}
            <div className="flex flex-col gap-1">
              <label htmlFor="material_charge" className="text-sm font-medium text-gray-700 dark:text-gray-300">Material Charge (₹)</label>
              <input
                id="material_charge"
                name="material_charge"
                type="number"
                min="0"
                step="0.01"
                defaultValue={service.material_charge}
                className={inputCls}
              />
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-1">
              <label htmlFor="payment_status" className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Status</label>
              <select id="payment_status" name="payment_status" defaultValue={service.payment_status} className={inputCls}>
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Complaint */}
          <div className="flex flex-col gap-1">
            <label htmlFor="complaint" className="text-sm font-medium text-gray-700 dark:text-gray-300">Complaint</label>
            <input id="complaint" name="complaint" type="text" defaultValue={service.complaint} className={inputCls} />
          </div>

          {/* Work Done */}
          <div className="flex flex-col gap-1">
            <label htmlFor="work_done" className="text-sm font-medium text-gray-700 dark:text-gray-300">Work Done</label>
            <textarea
              id="work_done"
              name="work_done"
              rows={3}
              defaultValue={service.work_done}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea id="notes" name="notes" rows={2} defaultValue={service.notes} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/services/${service_id}`)}
              disabled={submitting}
              className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
