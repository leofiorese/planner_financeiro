import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FinancialProvider } from "@/context";
import { ThemeProvider, themeInitScript } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";
import { sidebarInitScript } from "@/components/layout/sidebar-state";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planner Financeiro",
  description:
    "Planejamento financeiro pessoal: receitas, despesas, metas, carro, wishlist e previsão de fluxo de caixa.",
  keywords: [
    "finanças",
    "orçamento",
    "planejamento financeiro",
    "controle de despesas",
    "metas financeiras",
    "fluxo de caixa",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider>
          <CurrencyProvider>
            <FinancialProvider>
              <TooltipProvider delayDuration={150}>
                <AppShell>{children}</AppShell>
              </TooltipProvider>
              <Toaster richColors closeButton />
            </FinancialProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
