"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { fetchReminders, fetchRemindersSummary } from "@/app/lib/api";
import type { Reminder, ReminderSummary, ReminderStatus } from "@/app/lib/types";
import { Pagination } from "@/app/components/Pagination";

const PAGE_SIZE = 10;

type Tab = "all" | "today" | "tomorrow" | "upcoming" | "overdue";

function StatusBadge({ status, daysOverdue }: { status: ReminderStatus; daysOverdue?: number | null }) {
  if (status === "DUE_TODAY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
        Due Today
      </span>
    );
  }
  if (status === "TOMORROW") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
        Tomorrow
      </span>
    );
  }
  if (status === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
        Overdue{daysOverdue ? ` (${daysOverdue}d)` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      Upcoming
    </span>
  );
}

function SourceBadge({ type }: { type: Reminder["reminder_type"] }) {
  if (type === "SCHEDULED_SERVICE") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/50 whitespace-nowrap">
        Scheduled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/50 whitespace-nowrap">
      Next Service Due
    </span>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [summary, setSummary] = useState<ReminderSummary>({
    today_count: 0,
    tomorrow_count: 0,
    upcoming_count: 0,
    overdue_count: 0,
    total_active: 0,
  });
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [rems, sum] = await Promise.all([
        fetchReminders(undefined, undefined, 7),
        fetchRemindersSummary(7),
      ]);
      setReminders(rems);
      setSummary(sum);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load reminders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter reminders based on tab
  const filteredReminders = useMemo(() => {
    if (activeTab === "all") return reminders;
    if (activeTab === "today") return reminders.filter((r) => r.status === "DUE_TODAY");
    if (activeTab === "tomorrow") return reminders.filter((r) => r.status === "TOMORROW");
    if (activeTab === "upcoming") return reminders.filter((r) => r.status === "UPCOMING");
    if (activeTab === "overdue") return reminders.filter((r) => r.status === "OVERDUE");
    return reminders;
  }, [reminders, activeTab]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-[#26262B]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Service Reminders
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60">
              {reminders.length} active
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track today&apos;s, upcoming, and overdue RO service requirements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#2A2A30] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1E1E24] shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadData()}
            className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Due Today */}
        <button
          onClick={() => { setActiveTab("today"); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left shadow-xs transition-all group cursor-pointer ${
            activeTab === "today"
              ? "ring-2 ring-amber-500/50 border-amber-400 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-600"
              : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B] hover:border-amber-400/80 dark:hover:border-amber-500/80"
          }`}
        >
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Due Today</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {summary.today_count}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Scheduled for today</div>
        </button>

        {/* Tomorrow */}
        <button
          onClick={() => { setActiveTab("tomorrow"); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left shadow-xs transition-all group cursor-pointer ${
            activeTab === "tomorrow"
              ? "ring-2 ring-indigo-500/50 border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 dark:border-indigo-600"
              : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B] hover:border-indigo-400/80 dark:hover:border-indigo-500/80"
          }`}
        >
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Tomorrow</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {summary.tomorrow_count}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Scheduled tomorrow</div>
        </button>

        {/* Upcoming */}
        <button
          onClick={() => { setActiveTab("upcoming"); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left shadow-xs transition-all group cursor-pointer ${
            activeTab === "upcoming"
              ? "ring-2 ring-blue-500/50 border-blue-400 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-600"
              : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B] hover:border-blue-400/80 dark:hover:border-blue-500/80"
          }`}
        >
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Upcoming (7D)</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {summary.upcoming_count}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Next 7 days</div>
        </button>

        {/* Overdue */}
        <button
          onClick={() => { setActiveTab("overdue"); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left shadow-xs transition-all group cursor-pointer ${
            summary.overdue_count > 0
              ? activeTab === "overdue"
                ? "ring-2 ring-rose-500/50 border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 dark:border-rose-600"
                : "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-500"
              : activeTab === "overdue"
              ? "ring-2 ring-gray-400 border-gray-300 dark:border-[#2E2E34] bg-gray-50 dark:bg-[#17171A]"
              : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B] hover:border-gray-300 dark:hover:border-[#2E2E34]"
          }`}
        >
          <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Overdue</div>
          <div className="mt-1.5 text-2xl font-bold text-rose-700 dark:text-rose-400">
            {summary.overdue_count}
          </div>
          <div className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-400/80">Pending past due</div>
        </button>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-[#151518] p-1 rounded-xl border border-gray-200 dark:border-[#26262B] overflow-x-auto">
        <button
          onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "all"
              ? "bg-white dark:bg-[#202024] text-gray-900 dark:text-white shadow-2xs font-semibold"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          All ({reminders.length})
        </button>
        <button
          onClick={() => { setActiveTab("today"); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "today"
              ? "bg-amber-500 text-white shadow-2xs font-semibold"
              : "text-gray-600 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-400"
          }`}
        >
          Due Today ({summary.today_count})
        </button>
        <button
          onClick={() => { setActiveTab("tomorrow"); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "tomorrow"
              ? "bg-indigo-600 text-white shadow-2xs font-semibold"
              : "text-gray-600 dark:text-gray-400 hover:text-indigo-700 dark:hover:text-indigo-400"
          }`}
        >
          Tomorrow ({summary.tomorrow_count})
        </button>
        <button
          onClick={() => { setActiveTab("upcoming"); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "upcoming"
              ? "bg-blue-600 text-white shadow-2xs font-semibold"
              : "text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400"
          }`}
        >
          Upcoming ({summary.upcoming_count})
        </button>
        <button
          onClick={() => { setActiveTab("overdue"); setCurrentPage(1); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "overdue"
              ? "bg-rose-600 text-white shadow-2xs font-semibold"
              : "text-gray-600 dark:text-gray-400 hover:text-rose-700 dark:hover:text-rose-400"
          }`}
        >
          Overdue ({summary.overdue_count})
        </button>
      </div>

      {/* ── Reminders List ── */}
      {loading ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400 space-y-3">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading reminders...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <p className="text-gray-700 dark:text-gray-300 font-bold text-base">
            {activeTab === "today"
              ? "No services are due today."
              : activeTab === "tomorrow"
              ? "No services scheduled for tomorrow."
              : activeTab === "upcoming"
              ? "No upcoming services in the next 7 days."
              : activeTab === "overdue"
              ? "No overdue services. All maintenance is up to date."
              : "No active service reminders found."}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Reminders are calculated dynamically from scheduled services and completed service next-service dates.
          </p>
          <div className="pt-2">
            <Link
              href="/services/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors"
            >
              + Create Service
            </Link>
          </div>
        </div>
      ) : (() => {
        const totalPages = Math.ceil(filteredReminders.length / PAGE_SIZE) || 1;
        const paginatedReminders = filteredReminders.slice(
          (currentPage - 1) * PAGE_SIZE,
          currentPage * PAGE_SIZE
        );

        return (
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#26262B] rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50/75 dark:bg-[#161619] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#26262B]">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Service Date</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Source</th>
                    <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 whitespace-nowrap">Service Type</th>
                    <th className="px-4 py-3 whitespace-nowrap">Technician</th>
                    <th className="px-4 py-3 whitespace-nowrap">Address / Area</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60 text-sm">
                  {paginatedReminders.map((r) => {
                    const isScheduled = r.reminder_type === "SCHEDULED_SERVICE";
                    return (
                      <tr key={r.reminder_id} className="hover:bg-gray-50/60 dark:hover:bg-[#17171A]/60 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 block">
                            {r.date}
                          </span>
                          {r.days_overdue ? (
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              {r.days_overdue} {r.days_overdue === 1 ? "day" : "days"} late
                            </span>
                          ) : r.status === "DUE_TODAY" ? (
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Today</span>
                          ) : r.status === "TOMORROW" ? (
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Tomorrow</span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">in {r.days_diff} days</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={r.status} daysOverdue={r.days_overdue} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <SourceBadge type={r.reminder_type} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Link
                            href={`/customers/${encodeURIComponent(r.customer_id)}`}
                            className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block text-sm"
                          >
                            {r.customer_name}
                          </Link>
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{r.mobile || r.customer_id}</span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-200 font-semibold block">
                            {r.service_type}
                          </span>
                          {r.complaint && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              {r.complaint}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {r.technician ? (
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              {r.technician}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {r.area ? `${r.area}, ` : ""}{r.address || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/customers/${encodeURIComponent(r.customer_id)}`}
                              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white hover:bg-gray-50 dark:bg-[#1A1A1E] dark:hover:bg-[#222227] border border-gray-200 dark:border-[#2E2E34] rounded-lg transition-colors"
                            >
                              Customer
                            </Link>
                            <Link
                              href={`/services/${encodeURIComponent(r.service_id)}`}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-lg transition-colors"
                            >
                              Service
                            </Link>
                            {isScheduled ? (
                              <Link
                                href={`/services/${encodeURIComponent(r.service_id)}?complete=true`}
                                className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition-colors"
                              >
                                Complete
                              </Link>
                            ) : (
                              <Link
                                href={`/services/new?customer_id=${encodeURIComponent(r.customer_id)}`}
                                className="px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800/60 rounded-lg transition-colors"
                              >
                                Book Svc
                              </Link>
                            )}
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
              totalItems={filteredReminders.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemName="reminders"
            />
          </div>
        );
      })()}
    </div>
  );
}
