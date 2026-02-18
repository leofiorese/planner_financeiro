"use client";

import React, { useState } from "react";
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  LanguageCode,
} from "@/context/LanguageContext";

export default function LanguageSelector() {
  const { language, setLanguage, getLanguageInfo, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = getLanguageInfo();

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title={t("language.selector.title")}
        aria-label={t("language.selector.label")}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm font-medium">
          {currentLanguage.code.toUpperCase()}
        </span>
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
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, languageInfo]) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code as LanguageCode)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${language === code
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{languageInfo.flag}</span>
                  <div>
                    <div className="font-medium">{languageInfo.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {languageInfo.nativeName}
                    </div>
                  </div>
                </div>
                {language === code && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
