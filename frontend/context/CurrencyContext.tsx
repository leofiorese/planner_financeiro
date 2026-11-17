"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// Popular currencies with their codes, symbols, and names
export const SUPPORTED_CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  BRL: { code: "BRL", symbol: "R$", name: "Real Brasileiro", locale: "pt-BR" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;
export type Currency = (typeof SUPPORTED_CURRENCIES)[CurrencyCode];

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (amount: number, compact?: boolean) => string;
  formatNumber: (amount: number) => string;
  parseCurrency: (currencyString: string) => number;
  getCurrencyInfo: () => Currency;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("BRL"); // Default to BRL
  const [mounted, setMounted] = useState(false);

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem(
      "finance-planner-currency"
    ) as CurrencyCode;
    if (savedCurrency && SUPPORTED_CURRENCIES[savedCurrency]) {
      setCurrencyState(savedCurrency);
    }
    setMounted(true);
  }, []);

  // Save currency to localStorage when it changes
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("finance-planner-currency", currency);
  }, [currency, mounted]);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
  };

  const getCurrencyInfo = (): Currency => {
    return SUPPORTED_CURRENCIES[currency];
  };

  const formatCurrency = (amount: number, compact: boolean = false): string => {
    const currencyInfo = getCurrencyInfo();

    if (compact && Math.abs(amount) >= 1000000) {
      return new Intl.NumberFormat(currencyInfo.locale, {
        style: "currency",
        currency: currencyInfo.code,
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(amount);
    }

    return new Intl.NumberFormat(currencyInfo.locale, {
      style: "currency",
      currency: currencyInfo.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (amount: number): string => {
    const currencyInfo = getCurrencyInfo();
    return new Intl.NumberFormat(currencyInfo.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const parseCurrency = (currencyString: string): number => {
    // Remove currency symbols, spaces, and commas, then parse
    const cleanString = currencyString
      .replace(/[฿$€£¥₹₩Fr,\s]/g, "")
      .replace(/[A-Z]/g, "") // Remove currency codes like A$, C$, S$
      .replace(/[^\d.-]/g, "");

    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
  };

  const value = {
    currency,
    setCurrency,
    formatCurrency,
    formatNumber,
    parseCurrency,
    getCurrencyInfo,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
