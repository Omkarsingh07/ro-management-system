"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchServices,
  deleteService,
} from "@/app/lib/api";
import type { Service } from "@/app/lib/types";
import { Pagination } from "@/app/components/Pagination";
import { DateFilter } from "@/app/components/DateFilter";

const PAGE_SIZE = 10;

function ServiceStatusBadge({
  status,
  completionStatus,
}: {
  status?: Service["status"];
  completionStatus?: Service["completion_status"];
}) {
  if (completionStatus === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Completed
      </span>
    );
  }
  if (status === "DUE_TODAY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Due Today
      </span>
    );
  }
  if (status === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 border border-red-200/80 dark:border-rose-900/60 whitespace-nowrap shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 whitespace-nowrap shadow-2xs">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Upcoming
    </span>
  );
}

function PaymentBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const s = status.toLowerCase();
  if (s === "paid") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50">
        Paid
      </span>
    );
  }
  if (s === "partial") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
      {status}
    </span>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const data = await fetchServices();
      setServices(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {}, 0);
  }

  // Client-side filter across the loaded list (query + date range)
  const q = query.trim().toLowerCase();
  const displayed = services.filter((s) => {
    if (q) {
      const match =
        s.service_id.toLowerCase().includes(q) ||
        s.customer_id.toLowerCase().includes(q) ||
        s.service_type.toLowerCase().includes(q) ||
        s.technician.toLowerCase().includes(q) ||
        (s.payment_status ?? "").toLowerCase().includes(q);
      if (!match) return false;
    }

    if (startDate || endDate) {
      const rawDate = s.service_date;
      const sDate = rawDate ? rawDate.split("T")[0].split(" ")[0] : "";
      if (!sDate) return false;
      if (startDate && sDate < startDate) return false;
      if (endDate && sDate > endDate) return false;
    }

    return true;
  });

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteService(deleteTarget.service_id);
      setSuccessMsg(`Service "${deleteTarget.service_id}" deleted.`);
      setDeleteTarget(null);
      await load();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6] tracking-tight">Services</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
              {services.length} records
            </span>
          </div>
        </div>
        <Link
          href="/services/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-sm hover:shadow cursor-pointer"
        >
          <span className="text-sm leading-none">+</span>
          <span>New Service</span>
        </Link>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Search + Date Filter Bar ── */}
      <div className="flex flex-col gap-3.5 mb-6 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] p-4 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <input
              type="search"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search by service ID, customer ID, service type, or technician…"
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-[#2E2E34] bg-gray-50/50 dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] text-xs sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-[#121214] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{displayed.length}</span> of {services.length} records
            </span>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#1F1F24] flex flex-wrap items-center justify-between gap-3">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setCurrentPage(1);
            }}
            label="Service Date"
          />
          {(startDate || endDate) && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-900/40">
              Date filter active
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-xs text-red-700 dark:text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => load()} className="ml-3 underline text-red-600 dark:text-rose-400 hover:text-red-800 dark:hover:text-rose-300 font-medium cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="py-16 text-center space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading service bookings…</p>
        </div>
      )}

      {!loading && !error && displayed.length === 0 && (
        <div className="py-16 text-center bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-2xl p-8 shadow-xs">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {q || startDate || endDate
              ? "No services matching your search or date criteria."
              : "No services found."}
          </p>
          {!q && !startDate && !endDate && (
            <Link
              href="/services/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              + New Service
            </Link>
          )}
        </div>
      )}

      {!loading && !error && displayed.length > 0 && (() => {
        const totalPages = Math.ceil(displayed.length / PAGE_SIZE) || 1;
        const paginatedServices = displayed.slice(
          (currentPage - 1) * PAGE_SIZE,
          currentPage * PAGE_SIZE
        );

        return (
          <div className="rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-100 dark:divide-[#26262B]">
                <thead className="bg-gray-50/75 dark:bg-[#161619] border-b border-gray-200 dark:border-[#26262B]">
                  <tr>
                    {["Service ID", "Customer", "Service Date", "Service Type", "Technician", "Total Amount", "Payment", "Status", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#222227] text-sm">
                  {paginatedServices.map((s) => (
                    <tr key={s.service_id} className="hover:bg-gray-50/60 dark:hover:bg-[#17171A]/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/services/${s.service_id}`}
                          className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1A1A1E] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2E2E34] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {s.service_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/customers/${s.customer_id}`}
                          className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {s.customer_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-700 dark:text-gray-300 font-medium">
                        {s.service_date ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-[#F3F4F6]">
                        {s.service_type}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                        {s.technician ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{s.technician}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-900 dark:text-[#F3F4F6] font-bold whitespace-nowrap">
                        ₹{s.total_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <PaymentBadge status={s.payment_status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ServiceStatusBadge status={s.status} completionStatus={s.completion_status} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/services/${s.service_id}`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/60 transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            href={`/services/${s.service_id}/edit`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-[#1A1A1E] dark:hover:bg-[#222227] border border-gray-200 dark:border-[#2E2E34] transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget(s); setDeleteError(null); }}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-rose-400 bg-red-50/70 hover:bg-red-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-red-200/70 dark:border-rose-900/60 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={displayed.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemName="services"
            />
          </div>
        );
      })()}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] mb-1">Delete Service?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Delete service <strong>{deleteTarget.service_id}</strong> ({deleteTarget.service_type})?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">This action cannot be undone.</p>
            {deleteError && (
              <p className="mb-4 text-sm text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded px-3 py-2">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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
