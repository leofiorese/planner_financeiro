"use client";

import React from "react";
import { formatCurrency } from "@/utils/format";
import { useFinancialState } from "@/context";
import { getCategoryInfo } from "@/utils/categoryRules";
import type { CategoryBreakdownItem } from "@/utils/budget/budgetCalculator";

/** Lista de gasto + previsto do período por categoria, com % do total e barra fina. */
export default function BudgetCategoryBreakdown({ breakdown }: { breakdown: CategoryBreakdownItem[] }) {
  const { userPlan } = useFinancialState();

  return (
    <section className="surface-card p-5 space-y-3" aria-labelledby="budget-categories-title">
      <h2 id="budget-categories-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Por categoria
      </h2>
      {breakdown.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma despesa neste período.</p>
      ) : (
        <ul className="space-y-3">
          {breakdown.map((item) => {
            const info = getCategoryInfo(item.categoryId, userPlan.expenseCategories);
            return (
              <li key={item.categoryId}>
                <div className="flex items-center justify-between gap-3 text-xs mb-1">
                  <span className="flex items-center gap-2 min-w-0 text-slate-700 dark:text-slate-300">
                    <span aria-hidden>{info.emoji}</span>
                    <span className="truncate">{info.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)}</strong>{" "}
                    <span className="text-slate-500 dark:text-slate-400">· {(item.share * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(2, item.share * 100)}%`, backgroundColor: info.color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
