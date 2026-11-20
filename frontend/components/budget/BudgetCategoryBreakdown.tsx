"use client";

import React from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { useFinancialState } from "@/context";
import { formatCurrency } from "@/utils/format";
import { getCategoryInfo } from "@/utils/categoryRules";
import type { CategoryBreakdownItem } from "@/utils/budget/budgetCalculator";

/** Lista de gasto + previsto do período por categoria, com % do total e barra fina. */
export default function BudgetCategoryBreakdown({ breakdown }: { breakdown: CategoryBreakdownItem[] }) {
  const { userPlan } = useFinancialState();

  return (
    <SectionCard title="Por categoria">
      {breakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma despesa neste período.</p>
      ) : (
        <ul className="space-y-3">
          {breakdown.map((item) => {
            const info = getCategoryInfo(item.categoryId, userPlan.expenseCategories);
            return (
              <li key={item.categoryId}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{info.emoji}</span>
                    <span className="truncate">{info.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{formatCurrency(item.amount)}</strong>{" "}
                    <span className="text-muted-foreground">· {(item.share * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
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
    </SectionCard>
  );
}
