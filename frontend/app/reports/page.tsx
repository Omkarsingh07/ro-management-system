"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchComprehensiveReport, getReportCsvExportUrl } from "@/app/lib/api";
import type { ComprehensiveReport } from "@/app/lib/types";

// ── Helpers ──

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDefaultMonthRange(): { from: string; to: string } {
  const today = new Date(getTodayIST());
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
}

function formatCurrency(amount: number): string {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function ReportsPage() {
  const initialRange = getDefaultMonthRange();
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  // Form inputs (can be edited before applying)
  const [inputFrom, setInputFrom] = useState(initialRange.from);
  const [inputTo, setInputTo] = useState(initialRange.to);

  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [activeExportType, setActiveExportType] = useState<string>("daily");

  const loadReport = useCallback(async (from: string, to: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setDateError(null);

    if (from > to) {
      setDateError(`From Date (${from}) cannot be after To Date (${to}).`);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await fetchComprehensiveReport(from, to);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReport(fromDate, toDate);
  }, [fromDate, toDate, loadReport]);

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputFrom > inputTo) {
      setDateError("From Date cannot be after To Date.");
      return;
    }
    setDateError(null);
    setFromDate(inputFrom);
    setToDate(inputTo);
  };

  // Quick Date Presets
  const applyPreset = (preset: "today" | "this_week" | "this_month" | "last_month") => {
    const today = new Date(getTodayIST());
    let start = today;
    let end = today;

    if (preset === "today") {
      start = today;
      end = today;
    } else if (preset === "this_week") {
      const day = today.getDay(); // 0 is Sun
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today);
      start.setDate(diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (preset === "this_month") {
      const r = getDefaultMonthRange();
      setInputFrom(r.from);
      setInputTo(r.to);
      setFromDate(r.from);
      setToDate(r.to);
      return;
    } else if (preset === "last_month") {
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-indexed
      const firstDayLastMonth = new Date(Date.UTC(year, month - 1, 1));
      const lastDayLastMonth = new Date(Date.UTC(year, month, 0));
      const f = firstDayLastMonth.toISOString().split("T")[0];
      const t = lastDayLastMonth.toISOString().split("T")[0];
      setInputFrom(f);
      setInputTo(t);
      setFromDate(f);
      setToDate(t);
      return;
    }

    const f = start.toISOString().split("T")[0];
    const t = end.toISOString().split("T")[0];
    setInputFrom(f);
    setInputTo(t);
    setFromDate(f);
    setToDate(t);
  };

  const exportUrl = getReportCsvExportUrl(fromDate, toDate, activeExportType);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-[#26262B]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Reports & Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60">
              Business Intelligence
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Operational and financial metrics calculated directly from service records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadReport(fromDate, toDate, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#2A2A30] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1E1E24] shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Date Range Selector Bar ── */}
      <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-4 shadow-xs space-y-3">
        <form onSubmit={handleApplyRange} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <label htmlFor="from_date" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                From Date
              </label>
              <input
                id="from_date"
                type="date"
                value={inputFrom}
                onChange={(e) => setInputFrom(e.target.value)}
                required
                className="w-full sm:w-auto border border-gray-200 dark:border-[#2E2E34] rounded-xl px-3 py-1.5 text-xs font-medium bg-gray-50/50 dark:bg-[#17171A] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex-1 sm:flex-initial">
              <label htmlFor="to_date" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                To Date
              </label>
              <input
                id="to_date"
                type="date"
                value={inputTo}
                onChange={(e) => setInputTo(e.target.value)}
                required
                className="w-full sm:w-auto border border-gray-200 dark:border-[#2E2E34] rounded-xl px-3 py-1.5 text-xs font-medium bg-gray-50/50 dark:bg-[#17171A] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Presets:</span>
            <div className="inline-flex flex-wrap p-1 bg-gray-100/80 dark:bg-[#17171A] border border-gray-200/80 dark:border-[#26262B] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="text-xs font-medium px-2.5 py-1 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#222227] rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this_week")}
                className="text-xs font-medium px-2.5 py-1 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#222227] rounded-lg transition-colors cursor-pointer"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this_month")}
                className="text-xs font-medium px-2.5 py-1 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#222227] rounded-lg transition-colors cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last_month")}
                className="text-xs font-medium px-2.5 py-1 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-[#222227] rounded-lg transition-colors cursor-pointer"
              >
                Last Month
              </button>
            </div>
          </div>
        </form>

        {dateError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
            {dateError}
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => loadReport(fromDate, toDate)}
            className="underline font-semibold hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading ? (
        <div className="p-20 text-center text-sm text-gray-500 dark:text-gray-400 space-y-3">
          <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-medium">Loading reports for {fromDate} to {toDate}...</p>
        </div>
      ) : !report ? (
        <div className="p-16 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-[#121214] rounded-2xl border border-gray-200/80 dark:border-[#26262B]">
          No report data available.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Period Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl px-4 py-3 text-xs text-blue-900 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 inline-block" />
              <span>
                Reporting Period: <strong className="font-semibold text-blue-950 dark:text-blue-200">{report.period.from_date}</strong> to{" "}
                <strong className="font-semibold text-blue-950 dark:text-blue-200">{report.period.to_date}</strong>
              </span>
            </div>
            {/* Export Toolbar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-gray-500 dark:text-gray-400 text-xs">Export:</span>
              <select
                value={activeExportType}
                onChange={(e) => setActiveExportType(e.target.value)}
                className="border border-blue-200 dark:border-blue-800/80 rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-[#17171A] text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="daily">Daily Timeline CSV</option>
                <option value="services">Service Types CSV</option>
                <option value="materials">Material Usage CSV</option>
                <option value="customers">Customer Activity CSV</option>
              </select>
              <a
                href={exportUrl}
                download
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-colors"
              >
                Download CSV
              </a>
            </div>
          </div>

          {/* ── 1. Business Summary Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-gray-200 dark:border-[#26262B] shadow-xs">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Services</div>
              <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100">{report.summary.total_services}</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Scheduled in period</div>
            </div>

            <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-gray-200 dark:border-[#26262B] shadow-xs">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Completed</div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{report.summary.completed_services}</div>
              <div className="mt-0.5 text-xs text-emerald-600/70 dark:text-emerald-500/70">Successfully serviced</div>
            </div>

            <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-gray-200 dark:border-[#26262B] shadow-xs">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending</div>
              <div className="mt-1.5 text-2xl font-bold text-amber-700 dark:text-amber-400">{report.summary.pending_services}</div>
              <div className="mt-0.5 text-xs text-amber-600/70 dark:text-amber-500/70">Awaiting service</div>
            </div>

            <div className={`p-4 rounded-xl border shadow-xs ${
              report.summary.overdue_services > 0
                ? "bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
                : "bg-white dark:bg-[#121214] border-gray-200 dark:border-[#26262B]"
            }`}>
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Overdue</div>
              <div className="mt-1.5 text-2xl font-bold text-rose-700 dark:text-rose-400">{report.summary.overdue_services}</div>
              <div className="mt-0.5 text-xs text-rose-600/70 dark:text-rose-500/70">Pending past date</div>
            </div>

            <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-gray-200 dark:border-[#26262B] shadow-xs">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Revenue</div>
              <div className="mt-1.5 text-2xl font-bold text-blue-900 dark:text-blue-300">{formatCurrency(report.summary.total_revenue)}</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Completed services</div>
            </div>

            <div className="bg-white dark:bg-[#121214] p-4 rounded-xl border border-gray-200 dark:border-[#26262B] shadow-xs">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Clients</div>
              <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-gray-100">{report.summary.new_customers}</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Created in period</div>
            </div>
          </div>

          {/* ── 2. Revenue & Payments Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Analytics Card */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Revenue Metrics</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Completed Service Values</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="bg-gray-50/70 dark:bg-[#17171A] p-3 rounded-xl border border-gray-100 dark:border-[#26262B]">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Billed Revenue</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(report.summary.total_revenue)}</div>
                </div>
                <div className="bg-gray-50/70 dark:bg-[#17171A] p-3 rounded-xl border border-gray-100 dark:border-[#26262B]">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg Service Value</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(report.summary.average_service_value)}</div>
                </div>
                <div className="bg-gray-50/70 dark:bg-[#17171A] p-3 rounded-xl border border-gray-100 dark:border-[#26262B]">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Highest Job Value</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(report.summary.highest_service_value)}</div>
                </div>
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-xs text-emerald-800 dark:text-emerald-300">Collected (Paid)</div>
                  <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1">{formatCurrency(report.summary.paid_amount)}</div>
                </div>
                <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 col-span-2 sm:col-span-2">
                  <div className="text-xs text-amber-800 dark:text-amber-300">Outstanding / Uncollected</div>
                  <div className="text-lg font-bold text-amber-900 dark:text-amber-200 mt-1">{formatCurrency(report.summary.uncollected_amount)}</div>
                </div>
              </div>
            </div>

            {/* Payment Status Breakdown */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Payment Breakdown</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">By Payment Status</span>
              </div>
              {report.payments.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">No payment records found in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2.5">Payment Status</th>
                        <th className="px-3 py-2.5 text-right">Service Count</th>
                        <th className="px-3 py-2.5 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60">
                      {report.payments.map((p) => (
                        <tr key={p.payment_status} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                          <td className="px-3 py-2.5 text-xs font-semibold">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              p.payment_status === "Paid"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60"
                                : p.payment_status === "Partial"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                p.payment_status === "Paid"
                                  ? "bg-emerald-500"
                                  : p.payment_status === "Partial"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }`} />
                              {p.payment_status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium">{p.count}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Service Type & Technician Analysis ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Type Analysis */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Service Type Analysis</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">{report.service_types.length} types performed</span>
              </div>
              {report.service_types.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">No service types recorded in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2.5">Service Type</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5 text-right">Completed</th>
                        <th className="px-3 py-2.5 text-right">Completed Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60">
                      {report.service_types.map((st) => (
                        <tr key={st.service_type} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-gray-100">{st.service_type}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium">{st.count}</td>
                          <td className="px-3 py-2.5 text-xs text-right text-emerald-700 dark:text-emerald-400 font-medium">{st.completed_count}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(st.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Technician Activity */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Technician Activity</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">Workforce Overview</span>
              </div>
              {report.technicians.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">No technician records found in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2.5">Technician</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                        <th className="px-3 py-2.5 text-right">Completed</th>
                        <th className="px-3 py-2.5 text-right">Pending</th>
                        <th className="px-3 py-2.5 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60">
                      {report.technicians.map((t) => (
                        <tr key={t.technician} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            {t.technician}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium">{t.total_services}</td>
                          <td className="px-3 py-2.5 text-xs text-right text-emerald-700 dark:text-emerald-400 font-medium">{t.completed_services}</td>
                          <td className="px-3 py-2.5 text-xs text-right text-amber-700 dark:text-amber-400">{t.pending_services}</td>
                          <td className="px-3 py-2.5 text-xs text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(t.total_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Customer Activity Report ── */}
          <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl shadow-xs overflow-hidden space-y-3">
            <div className="px-5 py-4 border-b border-gray-200/80 dark:border-[#26262B] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Customer Activity in Period</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {report.summary.customers_with_services} clients received service jobs ({report.summary.new_customers} new registrations)
                </p>
              </div>
            </div>
            {report.customer_activity.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-8 text-center">No customer service activity found for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200/80 dark:border-[#26262B]">
                    <tr>
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Mobile</th>
                      <th className="px-4 py-3.5 text-right">Services</th>
                      <th className="px-4 py-3.5 text-right">Completed</th>
                      <th className="px-4 py-3.5 text-right">Total Revenue</th>
                      <th className="px-4 py-3.5">Last Service Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60">
                    {report.customer_activity.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/customers/${encodeURIComponent(c.customer_id)}`}
                            className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {c.customer_name}
                          </Link>
                          <span className="text-xs text-gray-400 dark:text-gray-500 block font-mono mt-0.5">{c.customer_id}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400">{c.mobile || "—"}</td>
                        <td className="px-4 py-3.5 text-xs text-right font-medium">{c.service_count}</td>
                        <td className="px-4 py-3.5 text-xs text-right text-emerald-700 dark:text-emerald-400 font-semibold">{c.completed_count}</td>
                        <td className="px-4 py-3.5 text-xs text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(c.total_value)}</td>
                        <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400">{c.last_service_date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 5. Material Usage & Inventory Movement ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Material Usage (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Material Consumption</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Parts used in services during period</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 dark:text-gray-500">Total Material Cost</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(report.total_material_cost)}</div>
                </div>
              </div>
              {report.material_usage.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-8 text-center">No material usage found for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2.5">Material</th>
                        <th className="px-3 py-2.5 text-right">Quantity Used</th>
                        <th className="px-3 py-2.5 text-right">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60">
                      {report.material_usage.map((m) => (
                        <tr key={m.material_id} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/inventory/${encodeURIComponent(m.material_id)}`}
                              className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {m.material_name}
                            </Link>
                            <span className="text-xs text-gray-400 dark:text-gray-500 block font-mono mt-0.5">{m.material_id}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-semibold text-gray-900 dark:text-gray-100">
                            {m.quantity_used} <span className="font-normal text-gray-500 dark:text-gray-400">{m.unit}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-right font-medium text-gray-900 dark:text-gray-100">{formatCurrency(m.estimated_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inventory Movement & Health Snapshot (1 col) */}
            <div className="space-y-6">
              {/* Snapshot */}
              <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#26262B] pb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Current Inventory Status</h3>
                  <Link href="/inventory" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    Manage →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50/80 dark:bg-[#17171A] p-3 rounded-xl border border-gray-100 dark:border-[#26262B]">
                    <span className="text-gray-500 dark:text-gray-400">Total Materials</span>
                    <strong className="block text-base font-bold text-gray-900 dark:text-gray-100 mt-1">{report.inventory_snapshot.total_materials}</strong>
                  </div>
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <span className="text-emerald-800 dark:text-emerald-300">Healthy Stock</span>
                    <strong className="block text-base font-bold text-emerald-800 dark:text-emerald-300 mt-1">{report.inventory_snapshot.healthy_stock_count}</strong>
                  </div>
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50">
                    <span className="text-amber-800 dark:text-amber-300">Low Stock</span>
                    <strong className="block text-base font-bold text-amber-800 dark:text-amber-300 mt-1">{report.inventory_snapshot.low_stock_count}</strong>
                  </div>
                  <div className="bg-rose-50/60 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
                    <span className="text-rose-700 dark:text-rose-300">Out of Stock</span>
                    <strong className="block text-base font-bold text-rose-700 dark:text-rose-300 mt-1">{report.inventory_snapshot.out_of_stock_count}</strong>
                  </div>
                </div>
              </div>

              {/* Stock Movement in period */}
              <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-[#26262B] pb-2">Stock Transactions in Period</h3>
                {report.inventory_movements.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 py-3 text-center">No inventory transactions in this period.</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-[#26262B]/60 text-xs">
                    {report.inventory_movements.map((im) => (
                      <div key={im.transaction_type} className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{im.transaction_type}</span>
                        <div className="text-right">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{im.count} txs</span>
                          <span className={`ml-2 font-mono ${im.total_quantity < 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                            ({im.total_quantity > 0 ? `+${im.total_quantity}` : im.total_quantity})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 6. Daily Timeline Breakdown Table ── */}
          <div className="bg-white dark:bg-[#121214] border border-gray-200/80 dark:border-[#26262B] rounded-2xl shadow-xs overflow-hidden space-y-3">
            <div className="px-5 py-4 border-b border-gray-200/80 dark:border-[#26262B] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Daily Timeline Breakdown</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Chronological summary of daily service jobs and revenue</p>
              </div>
              <a
                href={exportUrl}
                download
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Export CSV ↓
              </a>
            </div>

            {report.daily_timeline.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-8 text-center">No daily activity recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50/80 dark:bg-[#17171A] text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200/80 dark:border-[#26262B]">
                    <tr>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-right">Total Services</th>
                      <th className="px-4 py-3.5 text-right">Completed Services</th>
                      <th className="px-4 py-3.5 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#26262B]/60 font-mono text-xs">
                    {report.daily_timeline.map((d) => (
                      <tr key={d.date} className="hover:bg-gray-50/70 dark:hover:bg-[#17171A]/70">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{d.date}</td>
                        <td className="px-4 py-3 text-right">{d.services_count}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 font-medium">{d.completed_count}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatCurrency(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
