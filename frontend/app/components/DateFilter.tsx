"use client";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  presets?: boolean;
}

export function DateFilter({
  startDate,
  endDate,
  onChange,
  label = "Date",
  presets = true,
}: DateFilterProps) {
  const hasFilter = Boolean(startDate || endDate);

  const getToday = () => new Date().toISOString().split("T")[0];

  const getPastDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  const getMonthStart = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  };

  const todayStr = getToday();
  const weekAgoStr = getPastDays(7);
  const monthStartStr = getMonthStart();

  const isToday = startDate === todayStr && endDate === todayStr;
  const isWeek = startDate === weekAgoStr && endDate === todayStr;
  const isMonth = startDate === monthStartStr && endDate === todayStr;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
        <svg
          className="w-4 h-4 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>{label}:</span>
      </div>

      {/* Date input controls */}
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#17171A] border border-gray-200 dark:border-[#2E2E34] rounded-xl px-3 py-1.5 shadow-2xs">
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          className="bg-transparent text-gray-900 dark:text-[#F3F4F6] text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
        />
        <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">to</span>
        <input
          type="date"
          aria-label="End date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          className="bg-transparent text-gray-900 dark:text-[#F3F4F6] text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
        />
      </div>

      {/* Presets */}
      {presets && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(todayStr, todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isToday
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#28282E]"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onChange(weekAgoStr, todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isWeek
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#28282E]"
            }`}
          >
            Last 7d
          </button>
          <button
            type="button"
            onClick={() => onChange(monthStartStr, todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isMonth
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-[#1E1E22] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#28282E]"
            }`}
          >
            This Month
          </button>
        </div>
      )}

      {/* Clear button */}
      {hasFilter && (
        <button
          type="button"
          onClick={() => onChange("", "")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/50"
          title="Reset date filter"
        >
          <span>✕</span>
          <span>Clear</span>
        </button>
      )}
    </div>
  );
}
