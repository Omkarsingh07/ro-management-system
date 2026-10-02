"use client";

import type { CustomerFormData } from "@/app/lib/types";

interface Props {
  initial?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
}

const EMPTY: CustomerFormData = {
  name: "",
  mobile: "",
  alternate_mobile: "",
  address: "",
  area: "",
  ro_brand: "",
  ro_model: "",
  installation_date: "",
  technician: "",
  notes: "",
};

export default function CustomerForm({
  initial,
  onSubmit,
  submitLabel,
  submitting,
  error,
  onCancel,
}: Props) {
  const defaults = { ...EMPTY, ...initial };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: CustomerFormData = {
      name: (fd.get("name") as string).trim(),
      mobile: (fd.get("mobile") as string).trim(),
      alternate_mobile: (fd.get("alternate_mobile") as string).trim(),
      address: (fd.get("address") as string).trim(),
      area: (fd.get("area") as string).trim(),
      ro_brand: (fd.get("ro_brand") as string).trim(),
      ro_model: (fd.get("ro_model") as string).trim(),
      installation_date: (fd.get("installation_date") as string).trim(),
      technician: (fd.get("technician") as string).trim(),
      notes: (fd.get("notes") as string).trim(),
    };
    await onSubmit(data);
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 dark:border-[#26262B] bg-gray-50/50 dark:bg-[#161619] text-gray-900 dark:text-[#F3F4F6] px-3.5 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400 dark:placeholder-gray-500";

  const labelCls =
    "text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* API error */}
      {error && (
        <div className="rounded-xl bg-red-50/90 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 p-4 text-sm text-red-700 dark:text-rose-300 flex items-start gap-3 shadow-xs">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="flex-1 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* ── SECTION 1: Contact ── */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
        <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
            Contact
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Name */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="name" className={labelCls}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={defaults.name}
              placeholder="Customer name"
              className={inputCls}
            />
          </div>

          {/* Mobile */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mobile" className={labelCls}>
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              required
              defaultValue={defaults.mobile}
              placeholder="10-digit mobile"
              className={inputCls}
            />
          </div>

          {/* Alternate Mobile */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="alternate_mobile" className={labelCls}>
              Alternate Mobile
            </label>
            <input
              id="alternate_mobile"
              name="alternate_mobile"
              type="tel"
              defaultValue={defaults.alternate_mobile}
              placeholder="Alternate mobile"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Address ── */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
        <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
            Address
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Area */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="area" className={labelCls}>
              Area
            </label>
            <input
              id="area"
              name="area"
              type="text"
              defaultValue={defaults.area}
              placeholder="Locality or area"
              className={inputCls}
            />
          </div>

          {/* Full Address */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label htmlFor="address" className={labelCls}>
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={defaults.address}
              placeholder="Street address, building, flat no."
              className={`${inputCls} resize-y min-h-[60px]`}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: RO Equipment ── */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
        <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
            RO Equipment
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* RO Brand */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ro_brand" className={labelCls}>
              Brand
            </label>
            <input
              id="ro_brand"
              name="ro_brand"
              type="text"
              defaultValue={defaults.ro_brand}
              placeholder="Brand name"
              className={inputCls}
            />
          </div>

          {/* RO Model */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ro_model" className={labelCls}>
              Model
            </label>
            <input
              id="ro_model"
              name="ro_model"
              type="text"
              defaultValue={defaults.ro_model}
              placeholder="Model name or number"
              className={inputCls}
            />
          </div>

          {/* Installation Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="installation_date" className={labelCls}>
              Installation Date
            </label>
            <input
              id="installation_date"
              name="installation_date"
              type="date"
              defaultValue={defaults.installation_date}
              className={inputCls}
            />
          </div>

          {/* Assigned Technician */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="technician" className={labelCls}>
              Technician
            </label>
            <input
              id="technician"
              name="technician"
              type="text"
              defaultValue={defaults.technician}
              placeholder="Technician name"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Notes ── */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
        <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
            Notes
          </h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className={labelCls}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={defaults.notes}
            placeholder="Additional notes"
            className={`${inputCls} resize-y min-h-[50px]`}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] disabled:opacity-50 transition-colors cursor-pointer shadow-2xs text-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-center"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

