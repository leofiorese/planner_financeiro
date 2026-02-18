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
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title={t("currency.selector.buttonTitle", { name: currentCurrency.name })}
        aria-label={t("currency.selector.label")}
      >
        <span className="font-medium">{currentCurrency.symbol}</span>
        <span className="text-sm">{currentCurrency.code}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-60 overflow-y-auto">
            {Object.entries(SUPPORTED_CURRENCIES).map(
              ([code, currencyInfo]) => (
                <button
                  key={code}
                  onClick={() => handleCurrencyChange(code as CurrencyCode)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${currency === code
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-lg">
                      {currencyInfo.symbol}
                    </span>
                    <div>
                      <div className="font-medium">{currencyInfo.code}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {currencyInfo.name}
                      </div>
                    </div>
                  </div>
                  {currency === code && (
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
