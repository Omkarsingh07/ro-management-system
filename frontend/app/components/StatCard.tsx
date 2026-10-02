"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ElementType } from "react";
import { ArrowUpRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatCardVariant =
  | "dark"
  | "red"
  | "blue"
  | "amber"
  | "green"
  | "neutral";

export type StatCardSize = "sm" | "md" | "lg" | "hero";

export interface StatCardProps {
  label: string;
  /** Pre-formatted string shown when not animating */
  value: string;
  /** Raw number used for count-up animation */
  rawNumber?: number;
  /** How to format the animated count (defaults to en-IN grouping) */
  formatter?: (n: number) => string;
  href?: string;
  variant?: StatCardVariant;
  size?: StatCardSize;
  /** Lucide-react icon component */
  icon?: ElementType;
  /** Small secondary text below the number (e.g. "Needs attention") */
  hint?: string;
  /**
   * Secondary metric shown at the card bottom — used on the hero revenue card
   * to show "Today ₹X" without a second StatCard.
   */
  secondaryValue?: string;
  /** Set to true once on first data load; starts the count-up animation */
  shouldAnimate?: boolean;
  /** CSS animation-delay in ms for the stagger entrance effect */
  animationDelay?: number;
}

// ── Count-up hook ─────────────────────────────────────────────────────────────

/**
 * Animates from 0 → target over `duration` ms using easeOutCubic.
 * Fires once per mount (subsequent refreshes snap to new value instantly).
 */
function useCountUp(
  target: number,
  duration: number,
  trigger: boolean
): number {
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!trigger) return;

    if (hasRun.current) {
      setValue(target);
      return;
    }

    hasRun.current = true;

    if (target === 0) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, trigger]);

  return value;
}

// ── Size config ───────────────────────────────────────────────────────────────

const SIZE_CONFIG: Record<
  StatCardSize,
  { padding: string; numClass: string; minH: string }
> = {
  sm: {
    padding: "p-3.5 sm:p-4",
    numClass: "text-[24px] sm:text-[32px] lg:text-[38px]",
    minH: "min-h-[90px] sm:min-h-[100px]",
  },
  md: {
    padding: "p-4 sm:p-5",
    numClass: "text-[28px] sm:text-[38px] lg:text-[46px]",
    minH: "min-h-[105px] sm:min-h-[120px]",
  },
  lg: {
    padding: "p-4 sm:p-6",
    numClass: "text-[32px] sm:text-[44px] lg:text-[54px]",
    minH: "min-h-[115px] sm:min-h-[140px]",
  },
  hero: {
    padding: "p-5 sm:p-7 lg:p-8",
    numClass: "text-[38px] sm:text-[54px] lg:text-[72px]",
    minH: "min-h-[160px] sm:min-h-[200px]",
  },
};

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  rawNumber,
  formatter,
  href,
  variant = "neutral",
  size = "md",
  icon: Icon,
  hint,
  secondaryValue,
  shouldAnimate = false,
  animationDelay = 0,
}: StatCardProps) {
  const animatedCount = useCountUp(
    rawNumber ?? 0,
    700,
    shouldAnimate && rawNumber !== undefined
  );

  const defaultFmt = (n: number) =>
    new Intl.NumberFormat("en-IN").format(n);

  const displayValue =
    shouldAnimate && rawNumber !== undefined
      ? (formatter ? formatter(animatedCount) : defaultFmt(animatedCount))
      : value;

  const { padding, numClass, minH } = SIZE_CONFIG[size];

  // ── Card element ────────────────────────────────────────────────────────────
  const cardEl = (
    <div
      className={`
        stat-card stat-card-animated group
        relative flex flex-col
        ${padding} ${minH} h-full
        rounded-[20px] overflow-hidden
        transition-[transform,box-shadow] duration-200 ease-out
        hover:-translate-y-[3px]
      `}
      data-variant={variant}
      style={{
        background: "var(--sc-bg)",
        border: "1px solid var(--sc-border)",
        boxShadow: "var(--sc-shadow)",
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* ── Accent bar (top 3px) ────────────────────────────────────────── */}
      <div
        className="absolute top-0 inset-x-0 h-[3px]"
        style={{ background: "var(--sc-accent)" }}
        aria-hidden="true"
      />

      {/* ── Top row: icon chip + hover arrow ────────────────────────────── */}
      <div className="flex items-start justify-between mb-3 mt-1">
        {Icon ? (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
            style={{ backgroundColor: "var(--sc-chip-bg)" }}
          >
            <Icon
              size={16}
              strokeWidth={2}
              style={{ color: "var(--sc-chip-color)" }}
            />
          </div>
        ) : (
          <div />
        )}

        {href && (
          <ArrowUpRight
            size={15}
            className="opacity-0 group-hover:opacity-50 transition-opacity duration-200 shrink-0"
            style={{ color: "var(--sc-chip-color)" }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* ── Label ───────────────────────────────────────────────────────── */}
      <p
        className="text-[13px] font-medium leading-snug mb-2 tracking-[0.004em]"
        style={{ color: "var(--sc-label)" }}
      >
        {label}
      </p>

      {/* ── Number (hero of the card) ────────────────────────────────────── */}
      <p
        className={`${numClass} font-bold leading-none tracking-[-0.03em]`}
        style={{
          color: "var(--sc-num)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue}
      </p>

      {/* ── Hint text ───────────────────────────────────────────────────── */}
      {hint && (
        <p
          className="text-[12px] font-medium mt-2 leading-snug"
          style={{ color: "var(--sc-hint)" }}
        >
          {hint}
        </p>
      )}

      {/* ── Secondary value (bottom, hero card) ─────────────────────────── */}
      {secondaryValue && (
        <div
          className="mt-auto pt-5 border-t"
          style={{ borderColor: "var(--sc-border)" }}
        >
          <p
            className="text-[13px] font-medium"
            style={{ color: "var(--sc-hint)" }}
          >
            {secondaryValue}
          </p>
        </div>
      )}

      {/* ── Watermark icon (bottom-right, large, faint) ──────────────────── */}
      {Icon && (
        <div
          className="absolute -bottom-3 -right-3 pointer-events-none group-hover:scale-[1.08] group-hover:rotate-3 transition-transform duration-300"
          style={{ color: "var(--sc-icon)" }}
          aria-hidden="true"
        >
          <Icon size={96} strokeWidth={1} />
        </div>
      )}

      {/* ── Hover shadow overlay ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
        style={{ boxShadow: "var(--sc-shadow-hover)" }}
        aria-hidden="true"
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] dark:focus-visible:ring-offset-[#0B0B0C]"
        aria-label={`${label}: ${value}`}
      >
        {cardEl}
      </Link>
    );
  }

  return cardEl;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function StatCardSkeleton({
  size = "md",
  className = "",
}: {
  size?: StatCardSize;
  className?: string;
}) {
  const { minH } = SIZE_CONFIG[size];
  return (
    <div
      className={`
        rounded-[20px] border border-gray-200 dark:border-white/[0.06]
        ${minH} h-full
        animate-pulse
        ${className}
      `}
      style={{ background: "var(--sc-bg)" }}
    />
  );
}
