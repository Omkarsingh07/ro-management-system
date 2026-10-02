import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";

export const metadata: Metadata = {
  title: "Maruti Enterprises",
  description: "Maruti Enterprises - RO Service & Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem("ro_theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (stored === "dark" || (!stored && prefersDark) || (stored === "system" && prefersDark)) {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F7F8FA] dark:bg-[#0B0B0C] text-[#111827] dark:text-[#F3F4F6] transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            {/* ── Top navigation ── */}
            <Navbar />

            {/* ── Page content ── */}
            <main className="flex-1 w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 pb-24 md:pb-8 max-w-7xl">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
