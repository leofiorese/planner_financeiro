"use client";

import React from "react";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetStatus, FeasibilityResult } from "@/utils/budget/budgetCalculator";

interface BudgetFlowPanelProps {
  status: BudgetStatus;
  feasibility: FeasibilityResult;
  /** Chamado ao aceitar o "Budget realista"; só oferecido no período atual */
  onAdjustBudget?: (amount: number) => void;
}

/** Receita × Despesas × Metas do período, com a economia inferida e o alerta de viabilidade. */
export default function BudgetFlowPanel({ status, feasibility, onAdjustBudget }: BudgetFlowPanelProps) {
  const { formatCurrency } = useCurrency();

  const rows = [
    { key: "income", label: "Receita do período", value: status.income, bar: "bg-emerald-500" },
    { key: "expenses", label: "Despesas (gasto + previsto)", value: status.projectedTotal, bar: "bg-rose-500" },
    { key: "goals", label: "Reservado para metas", value: status.reserveTotal, bar: "bg-indigo-500" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const savings = status.inferredSavings;

  return (
    <section className="surface-card p-5 space-y-4" aria-labelledby="budget-flow-title">
      <h2 id="budget-flow-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Receita × Despesas × Metas
      </h2>

      {!feasibility.feasible && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-2"
        >
          <p>
            Sua receita do período ({formatCurrency(status.income)}) menos as metas ({formatCurrency(status.reserveTotal)}) não
            cobre o budget de {formatCurrency(status.budgetAmount)}. Budget realista:{" "}
            <strong>{formatCurrency(feasibility.suggestedBudget)}</strong>.
          </p>
          {onAdjustBudget && status.isCurrent && (
            <button
              type="button"
              onClick={() => onAdjustBudget(feasibility.suggestedBudget)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Ajustar budget para {formatCurrency(feasibility.suggestedBudget)}
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(row.value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full ${row.bar} rounded-full`} style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-slate-600 dark:text-slate-400">Economia inferida (receita − despesas)</span>
        <strong
          className={`tabular-nums text-sm ${
            savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {formatCurrency(savings)}
        </strong>
      </div>
      {status.income <= 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Nenhuma receita cadastrada neste período: cadastre sua renda para ver a economia e a viabilidade do budget.
        </p>
      )}
    </section>
  );
}
