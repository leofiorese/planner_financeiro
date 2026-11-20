"use client";

import { useMemo } from "react";
import { useFinancialState } from "@/context";
import {
  checkFeasibility,
  computeBudgetStatus,
  computeCategoryBreakdown,
  computePeriodHistory,
  type BudgetHistoryItem,
  type BudgetStatus,
  type CategoryBreakdownItem,
  type FeasibilityResult,
} from "@/utils/budget/budgetCalculator";
import { useTodayISO } from "./useTodayISO";

export interface UseBudgetResult {
  /** Budget ativado nas configurações */
  enabled: boolean;
  /** "YYYY-MM-DD" local de hoje (muda sem reload quando o dia vira) */
  todayISO: string;
  status: BudgetStatus;
  /** Últimos `historyCount` períodos (vazio se `historyCount` = 0) */
  history: BudgetHistoryItem[];
  feasibility: FeasibilityResult;
  breakdown: CategoryBreakdownItem[];
}

/**
 * Estado do budget para o período `offset` (0 = atual, -1 = anterior, +1 = próximo).
 * Tudo é memoizado sobre `userPlan` + `todayISO`.
 *
 * `historyCount` (padrão 0) controla quantos períodos de histórico calcular:
 * só a página /budget precisa (12); header, card e banner não.
 */
export function useBudget(offset = 0, options: { historyCount?: number } = {}): UseBudgetResult {
  const { userPlan } = useFinancialState();
  const todayISO = useTodayISO();
  const historyCount = options.historyCount ?? 0;

  const status = useMemo(() => computeBudgetStatus(userPlan, todayISO, offset), [userPlan, todayISO, offset]);
  const history = useMemo(
    () => (historyCount > 0 ? computePeriodHistory(userPlan, todayISO, historyCount) : []),
    [userPlan, todayISO, historyCount]
  );
  const feasibility = useMemo(() => checkFeasibility(status), [status]);
  const breakdown = useMemo(() => computeCategoryBreakdown(userPlan, status.period), [userPlan, status.period]);

  return { enabled: Boolean(userPlan.budget?.enabled), todayISO, status, history, feasibility, breakdown };
}
