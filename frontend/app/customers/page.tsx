"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchCustomers, searchCustomers, deleteCustomer } from "@/app/lib/api";
import type { Customer } from "@/app/lib/types";
import { Pagination } from "@/app/components/Pagination";
import { DateFilter } from "@/app/components/DateFilter";

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateField, setDateField] = useState<"installation_date" | "created_at">("installation_date");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load / search ──────────────────────────────────────────────────────────

  async function load(q: string) {
    setLoading(true);
    setError(null);
    try {
      const data = q.trim()
        ? await searchCustomers(q.trim())
        : await fetchCustomers();
      setCustomers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 350);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(deleteTarget.customer_id);
      setSuccessMsg(`Customer "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await load(query);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const filteredCustomers = customers.filter((c) => {
    if (startDate || endDate) {
      const rawDate = dateField === "installation_date" ? c.installation_date : c.created_at;
      const cDate = rawDate ? rawDate.split("T")[0].split(" ")[0] : "";
      if (!cDate) return false;
      if (startDate && cDate < startDate) return false;
      if (endDate && cDate > endDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#F3F4F6] tracking-tight">Customers</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
              {customers.length} total
            </span>
          </div>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-sm hover:shadow cursor-pointer"
        >
          <span className="text-sm leading-none">+</span>
          <span>Add Customer</span>
        </Link>
      </div>

      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div className="mb-6 flex flex-col gap-3.5 bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] p-4 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <input
              id="customer-search"
              type="search"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search by name, mobile, area, brand, or model…"
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-[#2E2E34] bg-gray-50/50 dark:bg-[#17171A] text-gray-900 dark:text-[#F3F4F6] text-xs sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-[#121214] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            {query && (
              <button
                onClick={() => { setQuery(""); load(""); }}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredCustomers.length}</span> of {customers.length} records
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#1F1F24] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={dateField}
              onChange={(e) => {
                setDateField(e.target.value as "installation_date" | "created_at");
                setCurrentPage(1);
              }}
              className="text-xs font-medium border border-gray-200 dark:border-[#2E2E34] rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-[#17171A] text-gray-800 dark:text-[#F3F4F6] focus:outline-none cursor-pointer"
            >
              <option value="installation_date">Installation Date</option>
              <option value="created_at">Added Date</option>
            </select>
            <DateFilter
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                setCurrentPage(1);
              }}
              label="Range"
            />
          </div>
          {(startDate || endDate) && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200/60 dark:border-blue-900/40">
              Filtered by {dateField === "installation_date" ? "Installation Date" : "Added Date"}
            </span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-xs text-red-700 dark:text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => load(query)}
            className="ml-3 underline text-red-600 dark:text-rose-400 hover:text-red-800 dark:hover:text-rose-300 font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="py-16 text-center space-y-2">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading customer directory…</p>
        </div>
      )}

      {/* ── Empty states ── */}
      {!loading && !error && customers.length === 0 && (
        <div className="py-16 text-center bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl p-8 shadow-xs">
          {query ? (
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                No customers found matching &ldquo;{query}&rdquo;.
              </p>
              <p className="text-xs text-gray-400">Check for spelling or try searching by mobile or area.</p>
              <button
                onClick={() => { setQuery(""); load(""); }}
                className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 underline cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                No customers yet. Add your first customer to get started.
              </p>
              <div>
                <Link
                  href="/customers/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  + Add Customer
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && customers.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-gray-100 dark:divide-[#26262B]">
              <thead className="bg-gray-50/75 dark:bg-[#161619] border-b border-gray-200 dark:border-[#26262B]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Customer ID
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Mobile Number
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Area / Location
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Purifier Machine
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap">
                    Assigned Technician
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs whitespace-nowrap text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#222227] text-sm">
                {paginatedCustomers.map((c) => {
                  const initial = c.name ? c.name.charAt(0).toUpperCase() : "C";
                  return (
                    <tr key={c.customer_id} className="hover:bg-gray-50/60 dark:hover:bg-[#17171A]/60 transition-colors group">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/customers/${c.customer_id}`}
                          className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1A1A1E] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2E2E34] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {c.customer_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/50">
                            {initial}
                          </div>
                          <Link
                            href={`/customers/${c.customer_id}`}
                            className="font-semibold text-gray-900 dark:text-[#F3F4F6] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {c.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
                          {c.mobile || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {c.area ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400 text-xs">📍</span>
                            <span>{c.area}</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {c.ro_brand || c.ro_model ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-[#1C1C20] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2E2E34]">
                            <span className="font-semibold">{c.ro_brand}</span>
                            {c.ro_model && <span className="text-gray-500 dark:text-gray-400">• {c.ro_model}</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {c.technician ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{c.technician}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/customers/${c.customer_id}`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/60 transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            href={`/customers/${c.customer_id}/edit`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-[#1A1A1E] dark:hover:bg-[#222227] border border-gray-200 dark:border-[#2E2E34] transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(c);
                              setDeleteError(null);
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-rose-400 bg-red-50/70 hover:bg-red-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-red-200/70 dark:border-rose-900/60 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="customers"
          />
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] mb-1">
              Delete Customer?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mb-4 text-sm text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded px-3 py-2">
                {deleteError}
              </p>
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
