"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  return (
    <header className="bg-white dark:bg-[#121214] border-b border-gray-200 dark:border-[#26262B] transition-colors sticky top-0 z-50 shadow-2xs">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between max-w-7xl">
        {/* ── Left: Brand ── */}
        <div className="flex-1 flex items-center justify-start">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6]">
              Maruti <span className="text-blue-600 dark:text-blue-400 font-semibold">Enterprises</span>
            </span>
          </Link>
        </div>

        {/* ── Center: Navigation ── */}
        {user && !isLoginPage && (
          <nav className="flex items-center justify-center gap-8 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`transition-colors py-1 ${
                pathname.startsWith("/dashboard")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/customers"
              className={`transition-colors py-1 ${
                pathname.startsWith("/customers")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Customers
            </Link>
            <Link
              href="/services"
              className={`transition-colors py-1 ${
                pathname.startsWith("/services")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Services
            </Link>
            <Link
              href="/inventory"
              className={`transition-colors py-1 ${
                pathname.startsWith("/inventory")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Inventory
            </Link>
            <Link
              href="/reminders"
              className={`transition-colors py-1 ${
                pathname.startsWith("/reminders")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Reminders
            </Link>
            <Link
              href="/reports"
              className={`transition-colors py-1 ${
                pathname.startsWith("/reports")
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Reports
            </Link>
          </nav>
        )}

        {/* ── Right: Theme Toggle & Logout ── */}
        <div className="flex-1 flex items-center justify-end gap-3">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            id="theme-toggle-button"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#26262B] bg-gray-100 hover:bg-gray-200 dark:bg-[#17171A] dark:hover:bg-[#222227] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            {resolvedTheme === "dark" ? (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Logout */}
          {user && !isLoginPage && (
            <button
              onClick={() => logout()}
              type="button"
              id="logout-button"
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
