"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import { useBudget } from "@/hooks/useBudget";
import BudgetProgress from "./BudgetProgress";

/** Banner compacto (uma linha) para a página de Despesas. Some se o budget estiver desativado. */
export default function BudgetBanner() {
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) return null;

  return (
    <Link
      href="/budget"
      className="surface-card px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors no-underline"
      aria-label={`Budget do período ${status.label}: ${formatCurrency(status.spent)} de ${formatCurrency(status.effectiveBudget)}. Abrir detalhes.`}
    >
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">Budget · {status.label}</span>
      <BudgetProgress status={status} size="sm" className="flex-1 min-w-[120px]" />
      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
        {formatCurrency(status.spent)} de {formatCurrency(status.effectiveBudget)}
        {status.committed > 0 && <> · + {formatCurrency(status.committed)} previstos</>}
      </span>
    </Link>
  );
}
