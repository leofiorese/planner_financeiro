"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

export interface DatePickerProps {
  value?: string | null; // ISO string "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string; // "YYYY-MM-DD"
  max?: string; // "YYYY-MM-DD"
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
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

const WEEKDAY_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parseIsoToParts(isoString?: string | null): { year: number; month: number; day: number } | null {
  if (!isoString) return null;
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function partsToIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function partsToDisplay(parts: { year: number; month: number; day: number } | null): string {
  if (!parts) return "";
  const d = String(parts.day).padStart(2, "0");
  const m = String(parts.month).padStart(2, "0");
  const y = String(parts.year).padStart(4, "0");
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  required = false,
  disabled = false,
  min,
  max,
  className = "",
  id,
  name,
  ariaLabel,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedValue = useMemo(() => parseIsoToParts(value), [value]);

  // Current viewing month and year in the calendar dropdown
  const [viewYear, setViewYear] = useState<number>(() => {
    const today = new Date();
    return parsedValue ? parsedValue.year : today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const today = new Date();
    return parsedValue ? parsedValue.month : today.getMonth() + 1;
  });

  // Synchronize input text with value prop
  useEffect(() => {
    if (parsedValue) {
      setInputText(partsToDisplay(parsedValue));
    } else if (!value) {
      setInputText("");
    }
  }, [parsedValue, value]);

  // Update calendar view whenever popover opens or value changes
  useEffect(() => {
    if (isOpen) {
      if (parsedValue) {
        setViewYear(parsedValue.year);
        setViewMonth(parsedValue.month);
      } else {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth() + 1);
      }
    }
  }, [isOpen, parsedValue]);

  // Close calendar on outside click or escape
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

  // Handle typing in DD/MM/YYYY mask
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract only digits
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    let formatted = "";
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }

    setInputText(formatted);

    if (digits.length === 8) {
      const d = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      const y = parseInt(digits.slice(4, 8), 10);

      if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        const maxDays = getDaysInMonth(y, m);
        if (d >= 1 && d <= maxDays) {
          const iso = partsToIso(y, m, d);
          // Check min/max
          if (min && iso < min) return;
          if (max && iso > max) return;
          onChange(iso);
          setViewYear(y);
          setViewMonth(m);
        }
      }
    } else if (digits.length === 0) {
      onChange("");
    }
  };

  const handleInputBlur = () => {
    if (inputText) {
      const parts = inputText.split("/");
      if (parts.length === 3 && parts[2].length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          const maxDays = getDaysInMonth(y, m);
          if (d >= 1 && d <= maxDays) {
            const iso = partsToIso(y, m, d);
            if ((!min || iso >= min) && (!max || iso <= max)) {
              onChange(iso);
              return;
            }
          }
        }
      }
      // Invalid date typed -> revert to parsed value or clear
      if (parsedValue) {
        setInputText(partsToDisplay(parsedValue));
      } else {
        setInputText("");
        onChange("");
      }
    }
  };

  // Calendar navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    let targetMonth = viewMonth + monthOffset;
    let targetYear = viewYear;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    } else if (targetMonth < 1) {
      targetMonth = 12;
      targetYear -= 1;
    }

    const iso = partsToIso(targetYear, targetMonth, day);
    if (min && iso < min) return;
    if (max && iso > max) return;

    onChange(iso);
    setInputText(partsToDisplay({ year: targetYear, month: targetMonth, day }));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const iso = partsToIso(y, m, d);
    if (min && iso < min) return;
    if (max && iso > max) return;

    onChange(iso);
    setInputText(partsToDisplay({ year: y, month: m, day: d }));
    setViewYear(y);
    setViewMonth(m);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setInputText("");
    setIsOpen(false);
  };

  // Generate calendar grid cells
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
    const prevMonthDays = getDaysInMonth(
      viewMonth === 1 ? viewYear - 1 : viewYear,
      viewMonth === 1 ? 12 : viewMonth - 1
    );

    const cells: Array<{
      day: number;
      monthOffset: number;
      isCurrentMonth: boolean;
      iso: string;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
      cells.push({
        day,
        monthOffset: -1,
        isCurrentMonth: false,
        iso: partsToIso(prevYear, prevMonth, day),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      cells.push({
        day,
        monthOffset: 0,
        isCurrentMonth: true,
        iso: partsToIso(viewYear, viewMonth, day),
      });
    }

    // Next month padding to fill grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
      cells.push({
        day,
        monthOffset: 1,
        isCurrentMonth: false,
        iso: partsToIso(nextYear, nextMonth, day),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return partsToIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const yearsRange = useMemo(() => {
    const currentY = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentY - 15; y <= currentY + 15; y++) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* ── Input Container ─────────────────────────────────────────── */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          aria-label={ariaLabel}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className={`w-full pr-9 pl-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-colors cursor-pointer"
          title="Abrir calendário"
          aria-label="Abrir calendário"
        >
          <svg
            className="w-4 h-4"
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
      </div>

      {/* ── Localized Calendar Popover ──────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-xl dark:shadow-2xl animate-in fade-in zoom-in-95 duration-150 w-[280px] max-w-[90vw] text-slate-900 dark:text-slate-100 select-none">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between gap-1 mb-3">
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer outline-none focus:border-indigo-500"
              >
                {MONTH_NAMES_PT.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer outline-none focus:border-indigo-500"
              >
                {yearsRange.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mês anterior"
                aria-label="Mês anterior"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo mês"
                aria-label="Próximo mês"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES_PT.map((w, i) => (
              <span
                key={w}
                className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
                  i === 0 || i === 6
                    ? "text-slate-400 dark:text-slate-500"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((cell, idx) => {
              const isSelected = parsedValue && cell.iso === value;
              const isToday = cell.iso === todayIso;
              const isDisabled = Boolean(
                (min && cell.iso < min) || (max && cell.iso > max)
              );

              return (
                <button
                  key={`${cell.iso}-${idx}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(cell.day, cell.monthOffset)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold shadow-xs hover:bg-indigo-700"
                      : isToday
                      ? "border border-indigo-500/80 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      : cell.isCurrentMonth
                      ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      : "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  } ${isDisabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
