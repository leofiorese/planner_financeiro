/**
 * Alertas do budget (puro). Dispara quando um lançamento faz o percentual
 * CRUZAR para cima 80% ou 100% do Y efetivo.
 *
 * Regra da métrica (decisão da fase 1.7): se algum lançamento afetado tem
 * ocorrência de hoje ou anterior no período atual, compara-se `percentSpent`
 * (o que já foi gasto); se todas as ocorrências afetadas são futuras, compara-se
 * `percentProjected` (gasto + comprometido).
 */
import type { Expense, UserPlan } from "@/types";
import { computeBudgetStatus, OVER_THRESHOLD, WARNING_THRESHOLD } from "./budgetCalculator";
import { getExpenseOccurrences } from "./occurrences";

export type ThresholdCrossing = "warning" | "over" | null;

/** Cruzou para cima? Se cruzar os dois (ex.: 75% → 110%), vale o mais grave. */
export function detectThresholdCrossing(before: number, after: number): ThresholdCrossing {
  if (before < OVER_THRESHOLD && after >= OVER_THRESHOLD) return "over";
  if (before < WARNING_THRESHOLD && after >= WARNING_THRESHOLD) return "warning";
  return null;
}

export interface BudgetAlert {
  level: "warning" | "over";
  metric: "spent" | "projected";
  /** valor da métrica após a mudança (gasto ou gasto + comprometido) */
  value: number;
  effectiveBudget: number;
  /** percentual da métrica após a mudança (fração) */
  percent: number;
}

export interface ExpenseChange {
  before?: Expense;
  after?: Expense;
}

export interface BudgetFeedback {
  /** Alerta de limiar cruzado, se houver */
  alert: BudgetAlert | null;
  /** Percentual gasto (fração) após a mudança, para o toast de sucesso; null se não aplicável */
  percentSpentAfter: number | null;
}

/**
 * Avalia o efeito de adicionar/editar/excluir despesas no período ATUAL.
 * Devolve `null` se o budget está desativado/sem valor ou se nenhuma
 * ocorrência afetada cai no período atual.
 */
export function evaluateExpenseChange(
  planBefore: UserPlan,
  planAfter: UserPlan,
  todayISO: string,
  changes: ExpenseChange[]
): BudgetFeedback | null {
  const budget = planAfter.budget;
  if (!budget?.enabled) return null;

  const before = computeBudgetStatus(planBefore, todayISO);
  const after = computeBudgetStatus(planAfter, todayISO);
  if (after.budgetAmount <= 0) return null;

  // Ocorrências afetadas dentro do período atual (versão antiga e nova)
  const dates: string[] = [];
  for (const change of changes) {
    for (const expense of [change.before, change.after]) {
      if (expense) dates.push(...getExpenseOccurrences(expense, after.period).map((o) => o.date));
    }
  }
  if (dates.length === 0) return null;

  const metric: BudgetAlert["metric"] = dates.some((d) => d <= todayISO) ? "spent" : "projected";
  const pctBefore = metric === "spent" ? before.percentSpent : before.percentProjected;
  const pctAfter = metric === "spent" ? after.percentSpent : after.percentProjected;
  const crossing = detectThresholdCrossing(pctBefore, pctAfter);

  return {
    alert: crossing
      ? {
          level: crossing,
          metric,
          value: metric === "spent" ? after.spent : after.projectedTotal,
          effectiveBudget: after.effectiveBudget,
          percent: pctAfter,
        }
      : null,
    percentSpentAfter: Number.isFinite(after.percentSpent) ? after.percentSpent : null,
  };
}

/** Texto do toast (pt-BR) para um alerta. */
export function formatBudgetAlertMessage(alert: BudgetAlert, formatCurrency: (n: number) => string): string {
  const amounts = `${formatCurrency(alert.value)} de ${formatCurrency(alert.effectiveBudget)}`;
  return alert.level === "over"
    ? `Budget estourado: ${amounts}`
    : `Você atingiu 80% do budget: ${amounts}`;
}
