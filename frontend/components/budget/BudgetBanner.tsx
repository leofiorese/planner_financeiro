"use client";

import React from "react";
import Link from "next/link";
import { useBudget } from "@/hooks/useBudget";
import { formatCurrency } from "@/utils/format";
import BudgetProgress from "./BudgetProgress";

/** Banner compacto para a página de Despesas. Some se o budget estiver desativado. */
export default function BudgetBanner() {
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) return null;

  return (
    <Link
      href="/budget"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="shrink-0 text-sm font-semibold">Budget · {status.label}</span>
      <BudgetProgress status={status} size="sm" className="min-w-[120px] flex-1" />
      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
        {formatCurrency(status.spent)} de {formatCurrency(status.effectiveBudget)}
        {status.committed > 0 && <> · + {formatCurrency(status.committed)} previstos</>}
      </span>
    </Link>
  );
}
