"use client";

import React from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { useFinancialState } from "@/context";
import type { BudgetStatus } from "@/utils/budget/budgetCalculator";

/** Metas que reservam do budget: Z por período (automático/manual) e progresso da meta. */
export default function BudgetGoalsPanel({ status }: { status: BudgetStatus }) {
  const { formatCurrency } = useCurrency();
  const { userPlan } = useFinancialState();

  return (
    <section className="surface-card p-5 space-y-3" aria-labelledby="budget-goals-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="budget-goals-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Metas que reservam
        </h2>
        <Link href="/goals" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
          Gerenciar metas →
        </Link>
      </div>

      {status.reserves.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Nenhuma meta reserva do budget. Ligue &ldquo;Reservar do budget mensal&rdquo; em uma meta para separar um valor por período.
        </p>
      ) : (
        <ul className="space-y-3">
          {status.reserves.map((reserve) => {
            const goal = userPlan.goals.find((g) => g.id === reserve.goalId);
            if (!goal) return null;
            const progress = Math.min(100, (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100);
            return (
              <li key={reserve.goalId}>
                <div className="flex items-center justify-between gap-3 text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{goal.name}</span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{formatCurrency(reserve.amount)}</strong>
                    <span className="text-slate-500 dark:text-slate-400">
                      /período · {reserve.isManual ? "manual" : "automático"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
