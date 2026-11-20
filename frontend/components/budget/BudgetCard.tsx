"use client";

import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/utils/format";
import { useBudget } from "@/hooks/useBudget";
import BudgetProgress from "./BudgetProgress";

/** Card do Dashboard: progresso do período atual ou convite para configurar. */
export default function BudgetCard() {
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) {
    return (
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg" aria-hidden>
            💰
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Defina um budget mensal</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe quanto já gastou no período e reserve parte para suas metas.
            </p>
          </div>
        </div>
        <Link
          href="/settings"
          className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
        >
          Configurar budget
        </Link>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Budget do período</h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70">
            {status.label}
          </span>
        </div>
        <Link href="/budget" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Ver detalhes →
        </Link>
      </div>

      <BudgetProgress status={status} size="lg" />

      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
        Budget {formatCurrency(status.budgetAmount)}
        {status.reserveTotal > 0 && <> − Metas {formatCurrency(status.reserveTotal)}</>}
        {" = "}
        <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(status.effectiveBudget)}</strong>
      </p>
    </div>
  );
}
