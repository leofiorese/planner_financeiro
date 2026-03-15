import type { Metadata } from "next";
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
  title: "Finance Planner - Take Control of Your Financial Future",
  description:
    "A comprehensive financial planning tool to manage income, expenses, goals, and forecast your financial future with personalized insights and recommendations.",
  keywords: [
    "finance",
    "budgeting",
    "financial planning",
    "expense tracking",
    "income management",
    "financial goals",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}
      >
        <ThemeProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <FinancialProvider>
                <div className="min-h-screen flex flex-col">

                  {/* ── Top Bar ─────────────────────────────────────────────── */}
                  <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 shadow-sm">
                    <div className="max-w-[1400px] mx-auto flex items-center gap-6 px-4 sm:px-6 h-14">

                      {/* Logo */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                          <span className="text-white font-bold text-xs tracking-tight">FP</span>
                        </div>
                        <span className="font-bold text-base bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block select-none">
                          Finance Planner
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="hidden lg:block w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0" />

                      {/* Navigation — center-fills available space */}
                      <div className="flex-1 min-w-0">
                        <Navigation />
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-2 py-1">
                          <CurrencySelector />
                          <span className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                          <LanguageSelector />
                        </div>
                        <ThemeToggle />
                      </div>

                    </div>
                  </header>

                  <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
