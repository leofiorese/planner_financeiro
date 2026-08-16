"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

export interface MonthPickerProps {
  value?: string | null; // "YYYY-MM"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  closingDay?: number;
  showInvoiceOption?: boolean;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const SHORT_MONTH_NAMES_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function MonthPicker({
  value,
  onChange,
  placeholder = "MM/AAAA",
  disabled = false,
  className = "",
  id,
  name,
  closingDay = 11,
  showInvoiceOption = true,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM
  const parsed = useMemo(() => {
    if (!value) return null;
    const match = value.match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (isNaN(y) || isNaN(m)) return null;
    return { year: y, month: m };
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(() => {
    return parsed ? parsed.year : new Date().getFullYear();
  });

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
    }
  }, [parsed]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayValue = useMemo(() => {
    if (!parsed) return "";
    const monthName = MONTH_NAMES_PT[parsed.month - 1] || "";
    return `${monthName} de ${parsed.year}`;
  }, [parsed]);

  const currentInvoiceInfo = useMemo(() => {
    const now = new Date();
    const day = now.getDate();
    const cDay = closingDay ?? 11;
    const billingDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (day > cDay) {
      billingDate.setMonth(billingDate.getMonth() + 1);
    }
    return {
      year: billingDate.getFullYear(),
      month: billingDate.getMonth() + 1,
    };
  }, [closingDay]);

  const handleSelectMonth = (monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${m}`);
    setIsOpen(false);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    onChange(`${y}-${m}`);
    setViewYear(y);
    setIsOpen(false);
  };

  const handleCurrentInvoice = () => {
    const y = currentInvoiceInfo.year;
    const m = String(currentInvoiceInfo.month).padStart(2, "0");
    onChange(`${y}-${m}`);
    setViewYear(y);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer ${className}`}
      >
        <span className={displayValue ? "text-slate-900 dark:text-slate-100 font-semibold" : "text-slate-400 dark:text-slate-500 font-normal"}>
          {displayValue || placeholder}
        </span>
        <svg
          className="w-4 h-4 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150 w-[270px] max-w-[90vw] text-slate-900 dark:text-slate-100 select-none">
          {/* Year Navigator */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ano anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {viewYear}
            </span>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo ano"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {SHORT_MONTH_NAMES_PT.map((name, index) => {
              const isSelected =
                parsed && parsed.year === viewYear && parsed.month === index + 1;
              const now = new Date();
              const isCurrent =
                now.getFullYear() === viewYear && now.getMonth() === index;
              const isInvoice =
                currentInvoiceInfo.year === viewYear &&
                currentInvoiceInfo.month === index + 1;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectMonth(index)}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold shadow-xs hover:bg-indigo-700"
                      : isCurrent && isInvoice
                      ? "border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      : isCurrent
                      ? "border border-indigo-500/80 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      : isInvoice
                      ? "border border-purple-500/80 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {name}
                  {isInvoice && !isSelected && (
                    <span
                      title="Fatura Atual"
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-500"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            >
              Mês Atual
            </button>
            {showInvoiceOption && (
              <button
                type="button"
                onClick={handleCurrentInvoice}
                className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>💳</span>
                <span>Fatura Atual</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
