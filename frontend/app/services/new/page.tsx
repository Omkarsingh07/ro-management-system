"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchCustomers, createService } from "@/app/lib/api";
import type { Customer, ServiceFormData } from "@/app/lib/types";

const SERVICE_TYPES = [
  "Regular Service",
  "Filter Replacement",
  "Repair",
  "Installation",
  "AMC Service",
  "Other",
];

const PAYMENT_STATUSES = ["Pending", "Paid", "Partial"];

function NewServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams?.get("customer_id") || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Form states
  const [serviceDate, setServiceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [serviceType, setServiceType] = useState("Regular Service");
  const [technician, setTechnician] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [labourCharge, setLabourCharge] = useState<string>("0");
  const [materialCharge, setMaterialCharge] = useState<string>("0");
  const [paymentStatus, setPaymentStatus] = useState("Pending");
  const [complaint, setComplaint] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCustomers();
        setCustomers(data);
        if (preselectedCustomerId) {
          const match = data.find((c) => c.customer_id === preselectedCustomerId);
          if (match) setSelectedCustomer(match);
        }
      } catch (e: unknown) {
        setCustomersError(e instanceof Error ? e.message : "Failed to load customers.");
      } finally {
        setCustomersLoading(false);
      }
    }
    load();
  }, [preselectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.customer_id.toLowerCase().includes(q) ||
        (c.area && c.area.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const totalAmount = useMemo(() => {
    const l = parseFloat(labourCharge) || 0;
    const m = parseFloat(materialCharge) || 0;
    return (l + m).toFixed(2);
  }, [labourCharge, materialCharge]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedCustomer) {
      setError("Please select a customer for this service.");
      return;
    }
    if (!serviceDate) {
      setError("Please specify a service date.");
      return;
    }
    if (!serviceType) {
      setError("Please select a service type.");
      return;
    }

    const data: ServiceFormData = {
      customer_id: selectedCustomer.customer_id,
      service_date: serviceDate,
      service_type: serviceType,
      technician: technician.trim(),
      complaint: complaint.trim(),
      work_done: workDone.trim(),
      next_service_date: nextServiceDate,
      labour_charge: parseFloat(labourCharge) || 0,
      material_charge: parseFloat(materialCharge) || 0,
      payment_status: paymentStatus,
      notes: notes.trim(),
    };

    setSubmitting(true);
    setError(null);
    try {
      const created = await createService(data);
      router.push(`/services/${created.service_id}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create service.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 dark:border-[#26262B] bg-gray-50/50 dark:bg-[#161619] text-gray-900 dark:text-[#F3F4F6] px-3.5 py-2.5 text-sm transition-all focus:border-blue-500 focus:bg-white dark:focus:bg-[#121214] focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-400 dark:placeholder-gray-500";

  const labelCls =
    "text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300";

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* ── Breadcrumb & Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          <Link
            href="/services"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Services
          </Link>
          <span>/</span>
          <span className="text-gray-800 dark:text-gray-200 font-semibold">New Service</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">
          New Service
        </h1>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50/90 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 p-4 text-sm text-red-700 dark:text-rose-300 flex items-start gap-3 shadow-xs">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="flex-1 text-sm font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ── CARD 1: Customer Selection ── */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs transition-shadow">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
              Customer <span className="text-red-500">*</span>
            </h2>
            <Link
              href="/customers/new"
              target="_blank"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              + Add Customer
            </Link>
          </div>

          {customersLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-500 dark:text-gray-400 gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Loading customers…
            </div>
          ) : customersError ? (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-rose-950/20 text-red-600 dark:text-rose-400 text-sm">
              {customersError}
            </div>
          ) : selectedCustomer ? (
            /* ── Selected Customer Card ── */
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {selectedCustomer.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-[#F3F4F6] text-sm">
                        {selectedCustomer.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {selectedCustomer.customer_id}
                      </span>
                      {selectedCustomer.ro_brand && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({selectedCustomer.ro_brand}{selectedCustomer.ro_model ? ` ${selectedCustomer.ro_model}` : ""})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                      <span>{selectedCustomer.mobile}</span>
                      {selectedCustomer.area && <span>&bull; {selectedCustomer.area}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                    setIsCustomerDropdownOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#17171A] border border-gray-300 dark:border-[#2E2E34] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors cursor-pointer self-start sm:self-center"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            /* ── Search Input & Dropdown ── */
            <div className="relative">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  placeholder="Search customer…"
                  className={`${inputCls} pl-10 pr-10`}
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch("");
                      setIsCustomerDropdownOpen(true);
                    }}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Suggestions List */}
              {isCustomerDropdownOpen && (
                <div className="mt-2 rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#17171A] shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-[#222227] z-20">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      <p>No customer found</p>
                      <Link
                        href="/customers/new"
                        className="inline-block mt-1.5 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Customer
                      </Link>
                    </div>
                  ) : (
                    filteredCustomers.slice(0, 8).map((c) => (
                      <button
                        key={c.customer_id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setIsCustomerDropdownOpen(false);
                          setCustomerSearch("");
                          if (c.technician && !technician) {
                            setTechnician(c.technician);
                          }
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#202025] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#26262B] text-gray-700 dark:text-gray-300 font-semibold text-xs flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-[#F3F4F6]">
                                {c.name}
                              </span>
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                {c.customer_id}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {c.mobile}{c.area ? ` &bull; ${c.area}` : ""}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Select
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CARD 2: Service Details ── */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
          <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
              Service Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Service Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="service_date" className={labelCls}>
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                id="service_date"
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Service Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="service_type" className={labelCls}>
                Service Type <span className="text-red-500">*</span>
              </label>
              <select
                id="service_type"
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className={inputCls}
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Technician */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="technician" className={labelCls}>
                Technician
              </label>
              <input
                id="technician"
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Technician name"
                className={inputCls}
              />
            </div>

            {/* Next Service Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="next_service_date" className={labelCls}>
                Next Service Date
              </label>
              <input
                id="next_service_date"
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ── CARD 3: Billing ── */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
              Billing
            </h2>
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 rounded-full text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Total:</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-300">₹{totalAmount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Labour Charge */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="labour_charge" className={labelCls}>
                Labour Charge (₹)
              </label>
              <input
                id="labour_charge"
                type="number"
                min="0"
                step="0.01"
                value={labourCharge}
                onChange={(e) => setLabourCharge(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Material Charge */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="material_charge" className={labelCls}>
                Material Charge (₹)
              </label>
              <input
                id="material_charge"
                type="number"
                min="0"
                step="0.01"
                value={materialCharge}
                onChange={(e) => setMaterialCharge(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="payment_status" className={labelCls}>
                Payment Status
              </label>
              <select
                id="payment_status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={inputCls}
              >
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── CARD 4: Work & Notes ── */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B] p-4 sm:p-6 shadow-xs">
          <div className="pb-4 mb-5 border-b border-gray-100 dark:border-[#1E1E22]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#F3F4F6]">
              Work & Notes
            </h2>
          </div>

          <div className="space-y-4">
            {/* Complaint */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="complaint" className={labelCls}>
                Complaint
              </label>
              <input
                id="complaint"
                type="text"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Issue reported by customer"
                className={inputCls}
              />
            </div>

            {/* Work Done */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="work_done" className={labelCls}>
                Work Done
              </label>
              <textarea
                id="work_done"
                rows={2}
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                placeholder="Work performed, parts replaced, TDS levels"
                className={`${inputCls} resize-y min-h-[60px]`}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className={labelCls}>
                Notes
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                className={`${inputCls} resize-y min-h-[50px]`}
              />
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/services")}
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
            {submitting ? "Saving…" : "Save Service"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewServicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-gray-500">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
          Loading form…
        </div>
      }
    >
      <NewServiceContent />
    </Suspense>
  );
}

