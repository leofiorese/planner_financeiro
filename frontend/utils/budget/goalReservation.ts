/**
 * Reserva de metas no budget (Z). Puro.
 * Regras: docs/BUDGET_LOGIC.md, seção 6.
 *
 * NÃO aplica o multiplicador de prioridade do forecast (`calculateGoalContribution`).
 */
import type { Goal } from "@/types";
import { GoalType } from "@/types";
import { countPeriodsBetween, type BudgetPeriod } from "./period";

export interface GoalReserveItem {
  goalId: string;
  amount: number;
  /** true quando o valor vem de `budgetReserveOverride` */
  isManual: boolean;
}

const hasOverride = (goal: Goal): boolean =>
  goal.budgetReserveOverride !== null &&
  goal.budgetReserveOverride !== undefined &&
  Number.isFinite(Number(goal.budgetReserveOverride)) &&
  Number(goal.budgetReserveOverride) >= 0;

const remaining = (goal: Goal): number => Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));

/**
 * Z automático: (alvo − guardado) / nº de períodos do período atual até o que
 * contém `targetDate` (mínimo 1; prazo vencido = 1). Meta open-ended = 0.
 * Ignora o opt-in e o override: serve para pré-visualizar a sugestão no formulário.
 */
export function getSuggestedGoalReserve(goal: Goal, current: BudgetPeriod, rolloverDay: number): number {
  if (goal.goalType === GoalType.OPEN_ENDED) return 0;
  const rest = remaining(goal);
  if (rest === 0) return 0;
  const n = Math.max(1, countPeriodsBetween(current, goal.targetDate, rolloverDay));
  return rest / n;
}

/** Z efetivo: override ?? sugerido; 0 se a meta está inativa ou não faz opt-in. */
export function getGoalReserve(goal: Goal, current: BudgetPeriod, rolloverDay: number): number {
  return getGoalReserveItem(goal, current, rolloverDay)?.amount ?? 0;
}

function getGoalReserveItem(goal: Goal, current: BudgetPeriod, rolloverDay: number): GoalReserveItem | null {
  if (!goal.isActive || !goal.reserveFromBudget) return null;

  if (goal.goalType === GoalType.OPEN_ENDED) {
    // "restante" não faz sentido em meta sem valor final: só vale o valor manual
    return hasOverride(goal)
      ? { goalId: goal.id, amount: Number(goal.budgetReserveOverride), isManual: true }
      : { goalId: goal.id, amount: 0, isManual: false };
  }

  if (remaining(goal) === 0) return { goalId: goal.id, amount: 0, isManual: false };
  if (hasOverride(goal)) {
    return { goalId: goal.id, amount: Number(goal.budgetReserveOverride), isManual: true };
  }
  return { goalId: goal.id, amount: getSuggestedGoalReserve(goal, current, rolloverDay), isManual: false };
}

/** ΣZ e o detalhe por meta (apenas metas ativas com opt-in, mesmo que o Z seja 0). */
export function getTotalReserve(
  goals: Goal[],
  current: BudgetPeriod,
  rolloverDay: number
): { total: number; byGoal: GoalReserveItem[] } {
  const byGoal: GoalReserveItem[] = [];
  for (const goal of goals) {
    const item = getGoalReserveItem(goal, current, rolloverDay);
    if (item) byGoal.push(item);
  }
  return { total: byGoal.reduce((sum, g) => sum + g.amount, 0), byGoal };
}
