"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetGoalAllocation, Goal, UserPlan } from "@/types";
import { computeClosureSummary, suggestClosureAllocations } from "@/utils/budget/budgetCalculator";
import type { BudgetPeriod } from "@/utils/budget/period";

export interface ClosureModalResult {
  status: "confirmed" | "skipped";
  allocations: BudgetGoalAllocation[];
  income: number;
  spent: number;
  budgetAmount: number;
}

interface PeriodClosureModalProps {
  plan: UserPlan;
  period: BudgetPeriod;
  todayISO: string;
  /** Quantos períodos mais antigos serão gravados como "pulados" junto com a resposta */
  olderSkippedCount: number;
  /** Fechar no X / Esc: não grava nada (pergunta de novo no próximo carregamento) */
  onDismiss: () => void;
  onSubmit: (result: ClosureModalResult) => void;
}

const parseAmount = (text: string): number => {
  const n = Number(text.replace(",", "."));
  return text.trim() === "" ? 0 : n;
};

/** Metas que entram no fechamento: ativas, com opt-in. */
function optInGoals(plan: UserPlan): Goal[] {
  return plan.goals.filter((g) => g.isActive && g.reserveFromBudget);
}

/**
 * Modal de fim de período: resumo (receita, gasto, economia inferida) e aporte
 * sugerido por meta, editável. Confirmar soma em `goal.currentAmount` (feito pelo
 * reducer); Pular grava só o registro.
 */
export default function PeriodClosureModal({
  plan,
  period,
  todayISO,
  olderSkippedCount,
  onDismiss,
  onSubmit,
}: PeriodClosureModalProps) {
  const { formatCurrency } = useCurrency();
  const summary = useMemo(() => computeClosureSummary(plan, period, todayISO), [plan, period, todayISO]);
  const suggestion = useMemo(() => suggestClosureAllocations(plan, period), [plan, period]);
  const goals = useMemo(() => optInGoals(plan), [plan]);

  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(suggestion.allocations.map((a) => [a.goalId, a.amount > 0 ? String(a.amount) : "0"]))
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Foco inicial (primeiro input, ou o botão principal sem metas) e restauração ao fechar
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (firstInputRef.current ?? confirmRef.current)?.focus();
    return () => previous?.focus?.();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onDismiss();
      return;
    }
    if (e.key === "Tab" && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const parsed = goals.map((g) => ({ goal: g, value: parseAmount(amounts[g.id] ?? "0") }));
  const invalid = parsed.some((p) => !Number.isFinite(p.value) || p.value < 0);
  const total = parsed.reduce((sum, p) => sum + (Number.isFinite(p.value) && p.value > 0 ? p.value : 0), 0);

  const snapshot = {
    income: summary.income,
    spent: summary.spent,
    budgetAmount: summary.budgetAmount,
  };

  const handleConfirm = () => {
    if (invalid) return;
    onSubmit({
      status: "confirmed",
      allocations: parsed
        .filter((p) => p.value > 0)
        .map((p) => ({ goalId: p.goal.id, amount: Math.round(p.value * 100) / 100 })),
      ...snapshot,
    });
  };

  const handleSkip = () => onSubmit({ status: "skipped", allocations: [], ...snapshot });

  const hasGoals = goals.length > 0;
  const shortOfReserves = hasGoals && summary.inferredSavings > 0 && summary.inferredSavings < summary.reserveTotal;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="closure-title"
        aria-describedby="closure-desc"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="closure-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Período {summary.label} encerrado
            </h2>
            <p id="closure-desc" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Veja como foi o período e registre o aporte nas suas metas.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar e perguntar depois"
            className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
            <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Receita</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(summary.income)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
            <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gasto</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(summary.spent)}</dd>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
            <dt className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Economia inferida</dt>
            <dd
              className={`font-bold tabular-nums ${
                summary.inferredSavings >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(summary.inferredSavings)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
            <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Budget</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.budgetAmount)}{" "}
              {summary.budgetAmount > 0 &&
                (summary.withinBudget ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✅ dentro</span>
                ) : (
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">❌ estourou</span>
                ))}
            </dd>
          </div>
        </dl>

        {hasGoals ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Aporte nas metas</h3>
            {summary.inferredSavings <= 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Não houve economia estimada neste período, então a sugestão é zero. Você pode editar os valores.
              </p>
            )}
            {shortOfReserves && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente.
              </p>
            )}
            <ul className="space-y-2">
              {goals.map((goal, index) => (
                <li key={goal.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`closure-${goal.id}`} className="text-sm text-slate-800 dark:text-slate-200 truncate">
                    {goal.name}
                  </label>
                  <input
                    id={`closure-${goal.id}`}
                    ref={index === 0 ? firstInputRef : undefined}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amounts[goal.id] ?? "0"}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                    className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total do aporte</span>
              <strong className="tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(total)}</strong>
            </div>
            {invalid && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">Use valores maiores ou iguais a zero.</p>}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nenhuma meta reserva do budget, então não há aporte para registrar.
          </p>
        )}

        {olderSkippedCount > 0 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {olderSkippedCount === 1
              ? "Há outro período mais antigo sem fechamento; ele será marcado como pulado."
              : `Há outros ${olderSkippedCount} períodos mais antigos sem fechamento; eles serão marcados como pulados.`}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {hasGoals && (
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
            >
              Pular este período
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={invalid}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer"
          >
            {hasGoals ? "Confirmar aporte" : "Ok"}
          </button>
        </div>
      </div>
    </div>
  );
}
