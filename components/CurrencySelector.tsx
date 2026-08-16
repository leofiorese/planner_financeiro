"use client";

import React, { useState } from "react";
import {
  useCurrency,
  SUPPORTED_CURRENCIES,
  CurrencyCode,
} from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";

export default function CurrencySelector() {
  const { currency, setCurrency, getCurrencyInfo } = useCurrency();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const currentCurrency = getCurrencyInfo();

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 focus-visible:ring-2 focus-visible:ring-indigo-500"
        title={t("currency.selector.buttonTitle", { name: currentCurrency.name })}
        aria-label={t("currency.selector.label")}
        aria-expanded={isOpen}
      >
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{currentCurrency.symbol}</span>
        <span className="tracking-wide">{currentCurrency.code}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 py-1.5 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t("currency.selector.label")}
            </div>
            {Object.entries(SUPPORTED_CURRENCIES).map(([code, currencyInfo]) => {
              const isSelected = currency === code;
              return (
                <button
                  key={code}
                  onClick={() => handleCurrencyChange(code as CurrencyCode)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                      {currencyInfo.symbol}
                    </span>
                    <div>
                      <div className="font-semibold">{currencyInfo.code}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        {currencyInfo.name}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
