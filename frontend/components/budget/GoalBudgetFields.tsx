"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useTodayISO } from "@/hooks/useTodayISO";
import type { Goal } from "@/types";
import { GoalType } from "@/types";
import { createDefaultBudget } from "@/utils/budget/normalize";
import { countPeriodsBetween, getPeriodForDate } from "@/utils/budget/period";
import { getGoalReserve, getSuggestedGoalReserve, getTotalReserve } from "@/utils/budget/goalReservation";

type GoalBudgetDraft = Pick<
  Goal,
  "goalType" | "targetAmount" | "currentAmount" | "targetDate" | "reserveFromBudget" | "budgetReserveOverride"
>;

interface GoalBudgetFieldsProps {
  value: GoalBudgetDraft;
  onChange: (patch: Partial<Pick<Goal, "reserveFromBudget" | "budgetReserveOverride">>) => void;
  error?: string | null;
}

/**
 * Campos de "Reservar do budget mensal" do formulário de metas.
 * Use `key` (ex.: id da meta em edição) para reiniciar o estado local ao trocar de meta.
 */
export default function GoalBudgetFields({ value, onChange, error }: GoalBudgetFieldsProps) {
  const { userPlan } = useFinancialState();
  const { formatCurrency } = useCurrency();
  const todayISO = useTodayISO();
  const budget = userPlan.budget ?? createDefaultBudget();

  const isOpenEnded = value.goalType === GoalType.OPEN_ENDED;
  const [manualMode, setManualMode] = useState(
    value.budgetReserveOverride !== null && value.budgetReserveOverride !== undefined
  );
  const [manualText, setManualText] = useState(
    value.budgetReserveOverride !== null && value.budgetReserveOverride !== undefined
      ? String(value.budgetReserveOverride)
      : ""
  );

  const currentPeriod = getPeriodForDate(todayISO, budget.rolloverDay);
  const draftGoal = useMemo(() => ({ id: "draft", isActive: true, ...value }) as Goal, [value]);
  const suggested = value.targetDate ? getSuggestedGoalReserve(draftGoal, currentPeriod, budget.rolloverDay) : 0;
  const periodsLeft = value.targetDate
    ? Math.max(1, countPeriodsBetween(currentPeriod, value.targetDate, budget.rolloverDay))
    : 0;

  const showManual = isOpenEnded || manualMode;

  const startManual = () => {
    const initial = suggested > 0 ? String(Math.round(suggested * 100) / 100) : "";
    setManualMode(true);
    setManualText(initial);
    onChange({ budgetReserveOverride: initial === "" ? null : Number(initial) });
  };

  const backToAuto = () => {
    setManualMode(false);
    setManualText("");
    onChange({ budgetReserveOverride: null });
  };

  const handleManualChange = (text: string) => {
    setManualText(text);
    const n = Number(text.replace(",", "."));
    onChange({ budgetReserveOverride: text.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n });
  };

  return (
    <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(value.reserveFromBudget)}
          onChange={(e) => onChange({ reserveFromBudget: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Reservar do budget mensal</span>
      </label>

      {value.reserveFromBudget && !budget.enabled && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Ative o budget em{" "}
          <Link href="/settings" className="underline font-semibold">
            Configurações
          </Link>{" "}
          para usar a reserva.
        </p>
      )}

      {value.reserveFromBudget && (
        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {!isOpenEnded && !manualMode && (
            <p>
              {value.targetDate ? (
                <>
                  Reserva sugerida: <strong>{formatCurrency(suggested)}/período</strong> (
                  {periodsLeft === 1 ? "falta 1 período" : `faltam ${periodsLeft} períodos`}){" "}
                  <button
                    type="button"
                    onClick={startManual}
                    className="text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer"
                  >
                    Definir valor manualmente
                  </button>
                </>
              ) : (
                <>
                  Informe a data alvo para calcular a reserva sugerida.{" "}
                  <button
                    type="button"
                    onClick={startManual}
                    className="text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer"
                  >
                    Definir valor manualmente
                  </button>
                </>
              )}
            </p>
          )}

          {showManual && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="goal-budget-override" className="block text-[11px] font-semibold mb-1">
                  Reserva manual por período{isOpenEnded ? " *" : ""}
                </label>
                <input
                  id="goal-budget-override"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={manualText}
                  onChange={(e) => handleManualChange(e.target.value)}
                  className="w-40 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  placeholder="0.00"
                />
              </div>
              {!isOpenEnded && (
                <button
                  type="button"
                  onClick={backToAuto}
                  className="text-indigo-600 dark:text-indigo-400 underline font-semibold cursor-pointer pb-2"
                >
                  Voltar ao automático
                </button>
              )}
            </div>
          )}
          {isOpenEnded && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Esta meta não tem valor final, então não há como sugerir uma reserva automática.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Badge da lista: "Reserva R$ 412/período" (ou "manual"). Não renderiza sem opt-in. */
export function GoalBudgetBadge({ goal }: { goal: Goal }) {
  const { userPlan } = useFinancialState();
  const { formatCurrency } = useCurrency();
  const todayISO = useTodayISO();
  const budget = userPlan.budget ?? createDefaultBudget();

  if (!goal.reserveFromBudget || !goal.isActive) return null;
  const period = getPeriodForDate(todayISO, budget.rolloverDay);
  const amount = getGoalReserve(goal, period, budget.rolloverDay);
  const isManual = goal.budgetReserveOverride !== null && goal.budgetReserveOverride !== undefined;

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60"
      title={isManual ? "Reserva definida manualmente" : "Reserva calculada automaticamente"}
    >
      🎯 Reserva {formatCurrency(amount)}/período{isManual ? " (manual)" : ""}
    </span>
  );
}

/** Resumo "Total reservado do budget: R$ 800/período". Não renderiza se nenhuma meta reserva. */
export function GoalsBudgetSummary({ goals }: { goals: Goal[] }) {
  const { userPlan } = useFinancialState();
  const { formatCurrency } = useCurrency();
  const todayISO = useTodayISO();
  const budget = userPlan.budget ?? createDefaultBudget();

  const { total, byGoal } = useMemo(
    () => getTotalReserve(goals, getPeriodForDate(todayISO, budget.rolloverDay), budget.rolloverDay),
    [goals, todayISO, budget.rolloverDay]
  );
  if (byGoal.length === 0) return null;

  return (
    <div className="surface-card px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-slate-600 dark:text-slate-400">
        Total reservado do budget:{" "}
        <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(total)}/período</strong>
        {" "}({byGoal.length} {byGoal.length === 1 ? "meta" : "metas"})
      </span>
      {!budget.enabled && (
        <Link href="/settings" className="text-amber-700 dark:text-amber-400 underline font-semibold">
          Budget desativado: ative em Configurações
        </Link>
      )}
    </div>
  );
}
