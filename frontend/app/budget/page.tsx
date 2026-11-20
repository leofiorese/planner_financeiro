"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFinancialActions } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useBudget } from "@/hooks/useBudget";
import BudgetProgress from "@/components/budget/BudgetProgress";
import BudgetFlowPanel from "@/components/budget/BudgetFlowPanel";
import BudgetCategoryBreakdown from "@/components/budget/BudgetCategoryBreakdown";
import BudgetGoalsPanel from "@/components/budget/BudgetGoalsPanel";
import BudgetHistory from "@/components/budget/BudgetHistory";
import BudgetPeriodItems from "@/components/budget/BudgetPeriodItems";

/** Quantos períodos para trás / para frente a navegação permite. */
const MIN_OFFSET = -11;
const MAX_OFFSET = 1;

export default function BudgetPage() {
  const { formatCurrency } = useCurrency();
  const { setBudgetAmount } = useFinancialActions();
  const [offset, setOffset] = useState(0);
  const { enabled, todayISO, status, history, feasibility, breakdown } = useBudget(offset, { historyCount: 12 });

  const kpis = [
    { label: "Budget (Y)", value: formatCurrency(status.budgetAmount) },
    { label: "Reservado p/ metas (ΣZ)", value: formatCurrency(status.reserveTotal) },
    { label: "Y efetivo", value: formatCurrency(status.effectiveBudget) },
    { label: "Gasto", value: formatCurrency(status.spent) },
    { label: "Comprometido", value: formatCurrency(status.committed) },
    { label: "Disponível/dia", value: status.isPast ? "—" : formatCurrency(status.dailyAllowance) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Budget Mensal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Período <strong className="text-slate-700 dark:text-slate-200">{status.label}</strong>
            {status.isCurrent ? " (atual)" : status.isPast ? " (encerrado)" : " (próximo)"}
          </p>
        </div>

        {enabled && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(MIN_OFFSET, o - 1))}
              disabled={offset <= MIN_OFFSET}
              aria-label="Período anterior"
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setOffset(0)}
              disabled={offset === 0}
              className="px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Período atual
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(MAX_OFFSET, o + 1))}
              disabled={offset >= MAX_OFFSET}
              aria-label="Próximo período"
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              →
            </button>
          </div>
        )}
      </div>

      {!enabled ? (
        <div className="surface-card p-10 text-center space-y-3">
          <div className="text-3xl" aria-hidden>
            💰
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">O budget mensal está desativado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Defina quanto pode gastar por período e o dia em que ele vira. O app acompanha o gasto, o que já está previsto e quanto
            reservar para as suas metas.
          </p>
          <Link
            href="/settings"
            className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            Configurar budget
          </Link>
        </div>
      ) : (
        <>
          {/* Progresso + KPIs */}
          <section className="surface-card p-5 space-y-5" aria-label="Resumo do período">
            {status.budgetAmount <= 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Não há budget definido para este período (o valor passou a valer depois dele).
              </p>
            )}
            <BudgetProgress status={status} size="lg" />
            <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 p-3">
                  <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{kpi.label}</dt>
                  <dd className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">{kpi.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <BudgetFlowPanel status={status} feasibility={feasibility} onAdjustBudget={(amount) => setBudgetAmount(amount)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BudgetCategoryBreakdown breakdown={breakdown} />
            <BudgetGoalsPanel status={status} />
          </div>

          <BudgetHistory history={history} />

          <BudgetPeriodItems period={status.period} todayISO={todayISO} />
        </>
      )}
    </div>
  );
}
