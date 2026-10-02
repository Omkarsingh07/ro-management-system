"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Boxes,
  BellRing,
  BarChart3,
  Menu,
  X,
  Plus,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reminders", label: "Reminders", icon: BellRing },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reminders", label: "Reminders", icon: BellRing },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === "/login";

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#26262B] transition-colors sticky top-0 z-50 shadow-2xs">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between max-w-7xl">
          {/* ── Left: Brand ── */}
          <div className="flex items-center justify-start">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
              aria-label="Maruti Enterprises Home"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 ring-2 ring-blue-500/20">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-[#F3F4F6] leading-none">
                  Maruti <span className="text-blue-600 dark:text-blue-400 font-semibold">Enterprises</span>
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide hidden sm:inline">
                  RO Service &amp; Management
                </span>
              </div>
            </Link>
          </div>

          {/* ── Center: Desktop Navigation ── */}
          {user && !isLoginPage && (
            <nav className="hidden md:flex items-center justify-center gap-1 lg:gap-2 text-sm font-medium">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg transition-all text-xs lg:text-sm font-medium ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1A1E]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ── Right: Theme Toggle, Logout & Mobile Hamburger ── */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              id="theme-toggle-button"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#26262B] bg-gray-100 hover:bg-gray-200 dark:bg-[#17171A] dark:hover:bg-[#222227] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              {resolvedTheme === "dark" ? (
                <Sun size={17} className="text-amber-400" />
              ) : (
                <Moon size={17} className="text-gray-700" />
              )}
            </button>

            {/* Desktop Logout Button */}
            {user && !isLoginPage && (
              <button
                onClick={() => logout()}
                type="button"
                id="logout-button"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            {user && !isLoginPage && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                id="mobile-menu-toggle"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#26262B] bg-gray-100 hover:bg-gray-200 dark:bg-[#17171A] dark:hover:bg-[#222227] text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile Dropdown / Slide-out Menu ── */}
        {user && !isLoginPage && mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-[#26262B] bg-white dark:bg-[#121214] px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/services/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
              >
                <Plus size={14} />
                <span>New Service</span>
              </Link>
              <Link
                href="/customers/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1C1C20] hover:bg-gray-200 dark:hover:bg-[#28282E] transition-colors border border-gray-200 dark:border-[#2E2E34]"
              >
                <Plus size={14} />
                <span>Customer</span>
              </Link>
              <Link
                href="/inventory/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1C1C20] hover:bg-gray-200 dark:hover:bg-[#28282E] transition-colors border border-gray-200 dark:border-[#2E2E34]"
                title="Add Material"
              >
                <Plus size={14} />
                <span>Material</span>
              </Link>
            </div>

            {/* Menu Links */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-[#1E1E22]">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/60"
                        : "bg-gray-50/70 dark:bg-[#17171A] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202025] border border-gray-200/60 dark:border-[#26262B]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200/80 dark:bg-[#24242A] text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Info & Logout */}
            <div className="pt-3 border-t border-gray-100 dark:border-[#1E1E22] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-900/60">
                  {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {user?.username || "Admin"}
                  </p>
                  <p className="text-[10px] text-gray-400">Signed in</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Bottom Navigation Bar (Persistent on Phones) ── */}
      {user && !isLoginPage && (
        <nav
          aria-label="Mobile navigation bar"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-t border-gray-200 dark:border-[#26262B] shadow-lg transition-colors"
        >
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 transition-colors relative ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {/* Active highlight indicator pill */}
                  {isActive && (
                    <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  )}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
