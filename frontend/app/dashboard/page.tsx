"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  UserPlus,
  Package,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  LayoutGrid,
  Users,
  UserCheck,
  Boxes,
  AlertOctagon,
  Bell,
  BellRing,
  Clock,
  Activity,
  IndianRupee,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/app/components/StatCard";
import {
  fetchCustomers,
  fetchServicesToday,
  fetchServicesUpcoming,
  fetchServicesOverdue,
  fetchServices,
  fetchMaterials,
  fetchRemindersSummary,
  fetchComprehensiveReport,
} from "@/app/lib/api";
import type {
  Customer,
  Service,
  Material,
  ReminderSummary,
  ComprehensiveReport,
} from "@/app/lib/types";

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

function fmtCurrency(n: number): string {
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(n)
    )
  );
}

function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-section-header">
      <span>{children}</span>
      <div />
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-10 pb-20 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pt-2">
        <div className="space-y-2">
          <div className="h-5 w-52 rounded-lg bg-gray-200 dark:bg-white/[0.07]" />
          <div className="h-8 w-36 rounded-lg bg-gray-200 dark:bg-white/[0.07]" />
          <div className="h-3 w-28 rounded-full bg-gray-100 dark:bg-white/[0.04]" />
        </div>
        <div className="flex gap-2">
          {[104, 84, 84, 40].map((w, i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-gray-200 dark:bg-white/[0.07]"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Hero row */}
      <div>
        <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-white/[0.04] mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-6 lg:row-span-2">
            <StatCardSkeleton size="hero" className="lg:min-h-[336px]" />
          </div>
          <div className="lg:col-span-3">
            <StatCardSkeleton size="lg" />
          </div>
          <div className="lg:col-span-3">
            <StatCardSkeleton size="lg" />
          </div>
          <div className="lg:col-span-3">
            <StatCardSkeleton size="lg" />
          </div>
          <div className="lg:col-span-3">
            <StatCardSkeleton size="lg" />
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div>
        <div className="h-3 w-32 rounded-full bg-gray-100 dark:bg-white/[0.04] mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 col-span-2">
            <StatCardSkeleton size="lg" />
          </div>
          <div className="lg:col-span-2"><StatCardSkeleton /></div>
          <div className="lg:col-span-3"><StatCardSkeleton /></div>
          <div className="lg:col-span-2"><StatCardSkeleton /></div>
          <div className="lg:col-span-1"><StatCardSkeleton size="sm" /></div>
        </div>
      </div>

      {/* Row 3 Reminders */}
      <div>
        <div className="h-3 w-20 rounded-full bg-gray-100 dark:bg-white/[0.04] mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 col-span-2"><StatCardSkeleton /></div>
          <div className="lg:col-span-2"><StatCardSkeleton /></div>
          <div className="lg:col-span-3"><StatCardSkeleton /></div>
          <div className="lg:col-span-3"><StatCardSkeleton /></div>
        </div>
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-sm mx-auto my-24 p-8 rounded-[20px] border border-gray-200 dark:border-white/[0.07] text-center space-y-4"
         style={{ background: "var(--sc-bg)" }}>
      <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
           style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
        <AlertTriangle size={22} style={{ color: "#f43f5e" }} />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
          Unable to load dashboard
        </p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-gray-900 hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-xl transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);

  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [servicesToday, setServicesToday] = useState<Service[]>([]);
  const [servicesUpcoming, setServicesUpcoming] = useState<Service[]>([]);
  const [servicesOverdue, setServicesOverdue] = useState<Service[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [remindersSummary, setRemindersSummary] = useState<ReminderSummary>({
    today_count: 0,
    tomorrow_count: 0,
    upcoming_count: 0,
    overdue_count: 0,
    total_active: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const [
        reportRes, custRes, todayRes, upcomingRes,
        overdueRes, allSvcRes, matRes, remRes,
      ] = await Promise.allSettled([
        fetchComprehensiveReport(),
        fetchCustomers(),
        fetchServicesToday(),
        fetchServicesUpcoming(7),
        fetchServicesOverdue(),
        fetchServices(),
        fetchMaterials(),
        fetchRemindersSummary(7),
      ]);

      if (reportRes.status === "fulfilled") setReport(reportRes.value);
      if (custRes.status === "fulfilled") setCustomers(custRes.value);
      if (todayRes.status === "fulfilled") setServicesToday(todayRes.value);
      if (upcomingRes.status === "fulfilled") setServicesUpcoming(upcomingRes.value);
      if (overdueRes.status === "fulfilled") setServicesOverdue(overdueRes.value);
      if (allSvcRes.status === "fulfilled") setAllServices(allSvcRes.value);
      if (matRes.status === "fulfilled") setMaterials(matRes.value);
      if (remRes.status === "fulfilled") setRemindersSummary(remRes.value);

      const allFailed =
        reportRes.status === "rejected" &&
        custRes.status === "rejected" &&
        allSvcRes.status === "rejected";

      if (allFailed) {
        setLoadError("Unable to connect to the server. Is the backend running?");
      } else {
        setLoadError(null);
        setLastUpdated(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
          })
        );
        setDataReady(true);
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const todayIST = getTodayIST();

  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const currentMonthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  const monthlyRevenue = report?.summary?.total_revenue ?? 0;

  const todayRevenue = useMemo(() => {
    const entry = report?.daily_timeline?.find((d) => d.date === todayIST);
    if (entry) return entry.revenue;
    return allServices
      .filter((s) =>
        s.service_date === todayIST &&
        (s.completion_status === "COMPLETED" ||
          (s.work_done && s.work_done.trim() !== ""))
      )
      .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  }, [report, allServices, todayIST]);

  const completedServicesCount = useMemo(
    () =>
      allServices.filter(
        (s) =>
          s.completion_status === "COMPLETED" ||
          (s.work_done && s.work_done.trim() !== "")
      ).length,
    [allServices]
  );

  const completionPct =
    allServices.length > 0
      ? Math.round((completedServicesCount / allServices.length) * 100)
      : 0;

  const lowStockCount = useMemo(
    () =>
      materials.filter(
        (m) =>
          m.is_low_stock ||
          m.is_out_of_stock ||
          Number(m.current_stock) <= Number(m.minimum_stock)
      ).length,
    [materials]
  );

  const overdueCount = servicesOverdue.length;
  const newCustomersCount = report?.summary?.new_customers ?? 0;

  // ── Stagger delay counter ────────────────────────────────────────────────────
  // Assign delays by section/row order
  const D = (n: number) => n * 45; // 45ms per card

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <DashboardSkeleton />;
  if (loadError)
    return <DashboardError message={loadError} onRetry={loadDashboardData} />;

  return (
    <div className="relative pb-20">

      {/* ── Page background blob (behind hero row) ────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-[560px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 28% 20%, rgba(99,102,241,0.06) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="space-y-10">

        {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pt-2">
          <div className="space-y-1">
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-gray-900 dark:text-white leading-tight">
              {getGreeting()}, Maruti
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {formattedDate}
              {lastUpdated && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" · "}Updated at {lastUpdated}
                </span>
              )}
            </p>
          </div>

          <nav className="flex items-center gap-2 flex-wrap" aria-label="Dashboard actions">
            {/* Primary */}
            <Link
              href="/services/new"
              id="dash-new-service"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all shadow-sm"
              style={{
                background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              New Service
            </Link>

            {/* Ghost buttons */}
            <Link
              href="/customers/new"
              id="dash-new-customer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.09] hover:bg-gray-50 dark:hover:bg-white/[0.05] rounded-xl shadow-sm transition-colors"
            >
              <UserPlus size={14} className="text-gray-400" />
              Customer
            </Link>

            <Link
              href="/inventory/new"
              id="dash-new-material"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.09] hover:bg-gray-50 dark:hover:bg-white/[0.05] rounded-xl shadow-sm transition-colors"
            >
              <Package size={14} className="text-gray-400" />
              Material
            </Link>

            {/* Refresh icon button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              id="dash-refresh"
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-white/[0.05] text-gray-500 dark:text-gray-400 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </nav>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            HERO ROW: Revenue (6-col × 2-row) + Overdue (3) + Today (3)
                                              + Next 7 Days (3) + Completed (3)
        ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="section-overview">
          <SectionHeader>Overview</SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">

            {/* Revenue Hero — spans 6 cols × 2 rows */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-6 lg:row-span-2">
              <StatCard
                label={`Revenue — ${currentMonthLabel}`}
                value={fmtCurrency(monthlyRevenue)}
                rawNumber={monthlyRevenue}
                formatter={fmtCurrency}
                href="/reports"
                variant="dark"
                size="hero"
                icon={IndianRupee}
                secondaryValue={`Today  ${fmtCurrency(todayRevenue)}`}
                shouldAnimate={dataReady}
                animationDelay={D(0)}
                aria-label={`Monthly revenue: ${fmtCurrency(monthlyRevenue)}`}
              />
            </div>

            {/* Overdue Services — 3 cols */}
            <div className="lg:col-span-3">
              <StatCard
                label="Overdue Services"
                value={fmtCount(overdueCount)}
                rawNumber={overdueCount}
                formatter={fmtCount}
                href="/services"
                variant="red"
                size="lg"
                icon={AlertTriangle}
                hint={overdueCount > 0 ? "Needs immediate attention" : "All clear"}
                shouldAnimate={dataReady}
                animationDelay={D(1)}
              />
            </div>

            {/* Today's Services — 3 cols */}
            <div className="lg:col-span-3">
              <StatCard
                label="Today's Services"
                value={fmtCount(servicesToday.length)}
                rawNumber={servicesToday.length}
                formatter={fmtCount}
                href="/services"
                variant="blue"
                size="lg"
                icon={Calendar}
                shouldAnimate={dataReady}
                animationDelay={D(2)}
              />
            </div>

            {/* Next 7 Days — 3 cols (row 2, col 7–9) */}
            <div className="lg:col-span-3">
              <StatCard
                label="Next 7 Days"
                value={fmtCount(servicesUpcoming.length)}
                rawNumber={servicesUpcoming.length}
                formatter={fmtCount}
                href="/services"
                variant="neutral"
                size="lg"
                icon={Clock}
                shouldAnimate={dataReady}
                animationDelay={D(3)}
              />
            </div>

            {/* Completed — 3 cols (row 2, col 10–12) */}
            <div className="lg:col-span-3">
              <StatCard
                label="Completed"
                value={fmtCount(completedServicesCount)}
                rawNumber={completedServicesCount}
                formatter={fmtCount}
                href="/services"
                variant="green"
                size="lg"
                icon={CheckCircle2}
                hint={allServices.length > 0 ? `${completionPct}% of total` : undefined}
                shouldAnimate={dataReady}
                animationDelay={D(4)}
              />
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 2: Customers & Inventory (mixed widths — editorial feel)
            4 + 2 + 3 + 2 + 1 = 12 cols
        ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="section-customers-inventory">
          <SectionHeader>Customers &amp; Inventory</SectionHeader>

          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4">

            {/* Total Customers — 4 cols, large */}
            <div className="col-span-2 lg:col-span-4">
              <StatCard
                label="Total Customers"
                value={fmtCount(customers.length)}
                rawNumber={customers.length}
                formatter={fmtCount}
                href="/customers"
                variant="neutral"
                size="lg"
                icon={Users}
                shouldAnimate={dataReady}
                animationDelay={D(5)}
              />
            </div>

            {/* New This Month — 2 cols */}
            <div className="col-span-1 lg:col-span-2">
              <StatCard
                label="New This Month"
                value={fmtCount(newCustomersCount)}
                rawNumber={newCustomersCount}
                formatter={fmtCount}
                href="/customers"
                variant="blue"
                size="md"
                icon={UserCheck}
                shouldAnimate={dataReady}
                animationDelay={D(6)}
              />
            </div>

            {/* Total Services — 3 cols */}
            <div className="col-span-1 lg:col-span-3">
              <StatCard
                label="Total Services"
                value={fmtCount(allServices.length)}
                rawNumber={allServices.length}
                formatter={fmtCount}
                href="/services"
                variant="neutral"
                size="md"
                icon={LayoutGrid}
                shouldAnimate={dataReady}
                animationDelay={D(7)}
              />
            </div>

            {/* Inventory Items — 2 cols */}
            <div className="col-span-1 lg:col-span-2">
              <StatCard
                label="Inventory Items"
                value={fmtCount(materials.length)}
                rawNumber={materials.length}
                formatter={fmtCount}
                href="/inventory"
                variant="neutral"
                size="md"
                icon={Boxes}
                shouldAnimate={dataReady}
                animationDelay={D(8)}
              />
            </div>

            {/* Low Stock — 1 col, compact */}
            <div className="col-span-1 lg:col-span-1">
              <StatCard
                label="Low Stock"
                value={fmtCount(lowStockCount)}
                rawNumber={lowStockCount}
                formatter={fmtCount}
                href="/inventory"
                variant="amber"
                size="sm"
                icon={AlertOctagon}
                hint={lowStockCount > 0 ? "Low stock" : undefined}
                shouldAnimate={dataReady}
                animationDelay={D(9)}
              />
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 3: Reminders — 4 + 2 + 3 + 3 = 12 cols
        ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="section-reminders">
          <SectionHeader>Reminders</SectionHeader>

          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4">

            {/* Due Today — 4 cols, amber emphasis */}
            <div className="col-span-2 lg:col-span-4">
              <StatCard
                label="Due Today"
                value={fmtCount(remindersSummary.today_count)}
                rawNumber={remindersSummary.today_count}
                formatter={fmtCount}
                href="/reminders"
                variant="amber"
                size="lg"
                icon={BellRing}
                hint={
                  remindersSummary.today_count > 0
                    ? "Action required today"
                    : "Nothing due today"
                }
                shouldAnimate={dataReady}
                animationDelay={D(10)}
              />
            </div>

            {/* Due Tomorrow — 2 cols, neutral */}
            <div className="col-span-1 lg:col-span-2">
              <StatCard
                label="Due Tomorrow"
                value={fmtCount(remindersSummary.tomorrow_count)}
                rawNumber={remindersSummary.tomorrow_count}
                formatter={fmtCount}
                href="/reminders"
                variant="neutral"
                size="md"
                icon={Bell}
                shouldAnimate={dataReady}
                animationDelay={D(11)}
              />
            </div>

            {/* Overdue Reminders — 3 cols, red */}
            <div className="col-span-1 lg:col-span-3">
              <StatCard
                label="Overdue Reminders"
                value={fmtCount(remindersSummary.overdue_count)}
                rawNumber={remindersSummary.overdue_count}
                formatter={fmtCount}
                href="/reminders"
                variant="red"
                size="md"
                icon={AlertOctagon}
                hint={
                  remindersSummary.overdue_count > 0
                    ? "Past due date"
                    : undefined
                }
                shouldAnimate={dataReady}
                animationDelay={D(12)}
              />
            </div>

            {/* Active — 3 cols, blue */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-3">
              <StatCard
                label="Active Reminders"
                value={fmtCount(remindersSummary.total_active)}
                rawNumber={remindersSummary.total_active}
                formatter={fmtCount}
                href="/reminders"
                variant="blue"
                size="md"
                icon={Activity}
                shouldAnimate={dataReady}
                animationDelay={D(13)}
              />
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
