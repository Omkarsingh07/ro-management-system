"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchCustomer, deleteCustomer, fetchCustomerServices } from "@/app/lib/api";
import type { Customer, Service } from "@/app/lib/types";
import { Pagination } from "@/app/components/Pagination";

const PAGE_SIZE = 10;

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-[#F3F4F6]">{value || "—"}</dd>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { customer_id } = useParams<{ customer_id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Service history
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesPage, setServicesPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomer(customer_id);
        setCustomer(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load customer.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customer_id]);

  useEffect(() => {
    async function loadServices() {
      setServicesLoading(true);
      setServicesError(null);
      try {
        const data = await fetchCustomerServices(customer_id);
        setServices(data);
      } catch (e: unknown) {
        setServicesError(e instanceof Error ? e.message : "Failed to load service history.");
      } finally {
        setServicesLoading(false);
      }
    }
    loadServices();
  }, [customer_id]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(customer_id);
      router.push("/customers");
      router.refresh();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading customer…</p>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 px-4 py-3 text-sm text-red-700 dark:text-rose-400 max-w-lg">
        {error}
        <div className="mt-3">
          <Link href="/customers" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <>
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/customers"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            ← Customers
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#F3F4F6] mt-1 tracking-tight">
            {customer.name}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">{customer.customer_id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/customers/${customer.customer_id}/edit`}
            className="rounded-md border border-gray-300 dark:border-[#2E2E34] bg-white dark:bg-[#17171A] px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#222226] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              setShowConfirm(true);
              setDeleteError(null);
            }}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ── Details card ── */}
      <div className="bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-[#26262B] p-6 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-5">Customer Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer ID" value={customer.customer_id} />
          <Field label="Name" value={customer.name} />
          <Field label="Mobile" value={customer.mobile} />
          <Field label="Alternate Mobile" value={customer.alternate_mobile} />
          <Field label="Area" value={customer.area} />
          <Field label="Technician" value={customer.technician} />
          <Field label="RO Brand" value={customer.ro_brand} />
          <Field label="RO Model" value={customer.ro_model} />
          <Field label="Installation Date" value={customer.installation_date} />
          <Field label="Created At" value={customer.created_at} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Address" value={customer.address} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Notes" value={customer.notes} />
          </div>
        </dl>
      </div>

      {/* ── Service History ── */}
      <div className="mt-8 w-full">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] tracking-tight">Service History</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">All service and maintenance records for this customer</p>
          </div>
          <Link
            href={`/services/new?customer_id=${customer.customer_id}`}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors"
          >
            + New Service
          </Link>
        </div>

        {servicesLoading && <p className="text-sm text-gray-500 dark:text-gray-400 py-6">Loading service history…</p>}
        {servicesError && (
          <p className="text-sm text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/50 rounded-xl px-4 py-3">{servicesError}</p>
        )}
        {!servicesLoading && !servicesError && services.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-[#26262B]">
            No service history available for this customer.
          </div>
        )}
        {!servicesLoading && !servicesError && services.length > 0 && (() => {
          const totalPages = Math.ceil(services.length / PAGE_SIZE) || 1;
          const paginatedServices = services.slice(
            (servicesPage - 1) * PAGE_SIZE,
            servicesPage * PAGE_SIZE
          );
          return (
            <div className="rounded-xl border border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm divide-y divide-gray-100 dark:divide-[#26262B]">
                  <thead className="bg-gray-50/75 dark:bg-[#17171A]">
                    <tr>
                      {["ID", "Date", "Service Type", "Technician", "Amount", "Status", "Completion", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]">
                    {paginatedServices.map((s) => {
                      const statusColors: Record<string, string> = {
                        DUE_TODAY: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                        OVERDUE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                        UPCOMING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                      };
                      const statusLabels: Record<string, string> = { DUE_TODAY: "Due Today", OVERDUE: "Overdue", UPCOMING: "Upcoming" };
                      return (
                        <tr key={s.service_id} className="hover:bg-gray-50/60 dark:hover:bg-[#1A1A1D]/60 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-gray-600 dark:text-gray-300">{s.service_id}</td>
                          <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">{s.service_date ?? "—"}</td>
                          <td className="px-4 py-3.5 text-gray-900 dark:text-[#F3F4F6] font-semibold">{s.service_type}</td>
                          <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-medium">{s.technician || "—"}</td>
                          <td className="px-4 py-3.5 text-gray-900 dark:text-[#F3F4F6] font-bold whitespace-nowrap">₹{s.total_amount.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3.5">
                            {s.status ? (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColors[s.status] ?? ""}`}>
                                {statusLabels[s.status] ?? s.status}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                              s.completion_status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                            }`}>
                              {s.completion_status === "COMPLETED" ? "Completed" : "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/services/${s.service_id}`} className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {services.length > PAGE_SIZE && (
                <Pagination
                  currentPage={servicesPage}
                  totalPages={totalPages}
                  totalItems={services.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setServicesPage}
                  itemName="services"
                />
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Delete confirmation ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F3F4F6] mb-1">
              Delete Customer?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Are you sure you want to delete{" "}
              <strong>{customer.name}</strong>?
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
                onClick={() => setShowConfirm(false)}
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
