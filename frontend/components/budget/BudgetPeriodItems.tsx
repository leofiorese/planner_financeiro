"use client";

import React, { useMemo, useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import { useFinancialState } from "@/context";
import { getPeriodExpenseOccurrences } from "@/utils/budget/budgetCalculator";
import { formatShortDate, type BudgetPeriod } from "@/utils/budget/period";

/** Lançamentos do período (as ocorrências que compõem o X), colapsável. */
export default function BudgetPeriodItems({ period, todayISO }: { period: BudgetPeriod; todayISO: string }) {
  const { formatCurrency } = useCurrency();
  const { userPlan } = useFinancialState();
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    if (!open) return [];
    const names = new Map(userPlan.expenses.map((e) => [e.id, e.name]));
    return getPeriodExpenseOccurrences(userPlan, period).map((o, i) => ({
      key: `${o.sourceId}-${o.date}-${i}`,
      name: names.get(o.sourceId) ?? "Despesa",
      ...o,
    }));
  }, [open, userPlan, period]);

  return (
    <section className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-5 py-3 flex items-center justify-between text-left text-sm font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer"
      >
        <span>Lançamentos do período</span>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{open ? "Recolher" : "Expandir"}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-800">
          {items.length === 0 ? (
            <p className="pt-3 text-xs text-slate-500 dark:text-slate-400">Nenhum lançamento neste período.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <li key={item.key} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 flex items-center gap-2">
                    <span className="tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {formatShortDate(item.date, false)}
                    </span>
                    <span className="truncate text-slate-800 dark:text-slate-200">
                      {item.name}
                      {item.installment && (
                        <span className="text-slate-500"> ({item.installment.index}/{item.installment.total})</span>
                      )}
                    </span>
                    {item.date > todayISO && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                        previsto
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                    {formatCurrency(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
