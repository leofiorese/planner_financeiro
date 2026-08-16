import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FinancialProvider } from "@/context";
import { ThemeProvider } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import LanguageSelector from "@/components/LanguageSelector";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Planner — Personal Financial Intelligence Workstation",
  description:
    "A comprehensive financial planning workstation to manage income, expenses, vehicle assets, wishlists, and multi-month forecast simulations.",
  keywords: [
    "finance",
    "budgeting",
    "financial planning",
    "expense tracking",
    "income management",
    "financial goals",
    "cashflow forecast",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150`}
      >
        {/*
          THESIS: Financial intelligence workstation that unifies transaction tracking, vehicle asset telemetry, wishlist prioritization, and 12-month forward simulation without decorative fluff.
          OWN-WORLD: Slate/Indigo analytical palette, crisp tabular numerals, structured data cards, and zero-clutter typography.
          STORY: The operator immediately monitors cashflow health, inspects upcoming obligations, models goal completion, and takes corrective action.
          FIRST VIEWPORT: High-density financial status ribbon, quick action toolbar, multi-month cashflow telemetry, and prioritized alerts.
          FORM: Personal Financial Planner Workstation, code-first implementation.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        <ThemeProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <FinancialProvider>
                <div className="min-h-screen flex flex-col">

                  {/* ── Top Bar ─────────────────────────────────────────────── */}
                  <header className="sticky top-0 z-40 w-full glass-header bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="max-w-[1440px] mx-auto flex items-center gap-3 px-4 sm:px-6 h-14">

                      {/* Logo */}
                      <Link href="/" className="flex items-center gap-2.5 shrink-0 no-underline group focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-xs text-white group-hover:bg-indigo-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="hidden sm:flex flex-col">
                          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                            Finance Planner
                          </span>
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-none">
                            Workstation
                          </span>
                        </div>
                      </Link>

                      {/* Vertical Divider */}
                      <div className="hidden lg:block w-px h-6 bg-slate-200 dark:bg-slate-800 shrink-0" />

                      {/* Navigation — center-fills available space */}
                      <div className="flex-1 min-w-0">
                        <Navigation />
                      </div>

                      {/* Right controls */}
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <CurrencySelector />
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        <LanguageSelector />
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        <ThemeToggle />
                      </div>

                      {/* Mobile-only compact controls */}
                      <div className="sm:hidden flex items-center gap-1 shrink-0">
                        <ThemeToggle />
                      </div>

                    </div>
                  </header>

                  <main className="flex-1 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                    {children}
                  </main>

                </div>
              </FinancialProvider>
            </LanguageProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
