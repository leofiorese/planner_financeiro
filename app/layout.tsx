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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider>
          <CurrencyProvider>
            <LanguageProvider>
              <FinancialProvider>
                <div className="min-h-screen flex flex-col">
                  <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center py-3 px-4 sm:px-6 lg:px-8">
                      <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        Finance Planner
                      </h1>
                      <div className="flex-1 flex justify-center">
                        <Navigation />
                      </div>
                      <div className="flex items-center space-x-3">
                        <CurrencySelector />
                        <LanguageSelector />
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
