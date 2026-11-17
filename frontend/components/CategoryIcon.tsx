"use client";

import React from "react";
import { ExpenseCategory, ExpenseCategoryConfig, GoalCategory, Priority } from "@/types";
import { getCategoryInfo } from "@/utils/categoryRules";
import { useFinancialState } from "@/context";

export function ExpenseCategoryIcon({
  category,
  customCategories,
  className = "w-4 h-4",
}: {
  category: ExpenseCategory | string;
  customCategories?: ExpenseCategoryConfig[];
  className?: string;
}) {
  let stateCategories: ExpenseCategoryConfig[] | undefined = customCategories;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const state = useFinancialState();
    if (!stateCategories && state?.userPlan?.expenseCategories) {
      stateCategories = state.userPlan.expenseCategories;
    }
  } catch {
    // Fallback to default categories when outside FinancialProvider
  }

  const info = getCategoryInfo(String(category), stateCategories);

  return (
    <span
      className={`inline-flex items-center justify-center leading-none select-none ${className}`}
      role="img"
      aria-label={info.name}
      style={{ fontSize: "0.95rem" }}
    >
      {info.emoji}
    </span>
  );
}

export function GoalCategoryIcon({ category, className = "w-4 h-4" }: { category: GoalCategory | string; className?: string }) {
  switch (category) {
    case GoalCategory.EMERGENCY_FUND:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case GoalCategory.RETIREMENT:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case GoalCategory.EDUCATION:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5" />
        </svg>
      );
    case GoalCategory.HOME_PURCHASE:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case GoalCategory.VACATION:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case GoalCategory.DEBT_PAYOFF:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case GoalCategory.MAJOR_PURCHASE:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case GoalCategory.INVESTMENT:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
  }
}

export function PriorityBadge({ priority, label, className = "" }: { priority: Priority; label?: string; className?: string }) {
  switch (priority) {
    case Priority.CRITICAL:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          {label || "Crítica"}
        </span>
      );
    case Priority.HIGH:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {label || "Alta"}
        </span>
      );
    case Priority.MEDIUM:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {label || "Média"}
        </span>
      );
    case Priority.LOW:
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {label || "Baixa"}
        </span>
      );
  }
}
