/**
 * Transições puras do plano relacionadas ao budget (sem relógio implícito:
 * `todayISO`/`nowISO` vêm de quem chama). Usadas pelo reducer.
 */
import type { BudgetAmountEntry, BudgetPeriodClosure, BudgetSettings, UserPlan } from "@/types";
import { computeClosureSummary, getBudgetAmountForPeriod } from "./budgetCalculator";
import { createDefaultBudget } from "./normalize";
import { type BudgetPeriod, getPeriodForDate } from "./period";

function getBudget(plan: UserPlan): BudgetSettings {
  return plan.budget ?? createDefaultBudget();
}

const sortHistory = (history: BudgetAmountEntry[]): BudgetAmountEntry[] =>
  [...history].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));

/** Grava `amount` em `effectiveFrom`: substitui a entrada do mesmo início ou adiciona. */
function upsertAmount(history: BudgetAmountEntry[], amount: number, effectiveFrom: string): BudgetAmountEntry[] {
  const exists = history.some((e) => e.effectiveFrom === effectiveFrom);
  const next = exists
    ? history.map((e) => (e.effectiveFrom === effectiveFrom ? { ...e, amount } : e))
    : [...history, { amount, effectiveFrom }];
  return sortHistory(next);
}

/**
 * Liga/desliga o budget e define o dia de virada.
 *  - 1ª ativação grava `enabledAt = hoje` (reativar depois mantém o original).
 *  - Mudar o dia de virada com um Y vigente regrava esse Y ancorado no início do
 *    novo período atual; sem isso o histórico (ancorado nos períodos antigos)
 *    deixaria o Y do período atual em 0 (ou com um valor antigo).
 */
export function applyBudgetSettings(
  plan: UserPlan,
  settings: { enabled: boolean; rolloverDay: number },
  todayISO: string
): UserPlan {
  const budget = getBudget(plan);
  const rolloverDay = Math.min(31, Math.max(1, Math.trunc(Number(settings.rolloverDay)) || 1));

  let amountHistory = budget.amountHistory;
  if (rolloverDay !== budget.rolloverDay) {
    const oldCurrent = getPeriodForDate(todayISO, budget.rolloverDay);
    const newCurrent = getPeriodForDate(todayISO, rolloverDay);
    const vigente = getBudgetAmountForPeriod(budget.amountHistory, oldCurrent);
    if (vigente > 0 && getBudgetAmountForPeriod(budget.amountHistory, newCurrent) !== vigente) {
      amountHistory = upsertAmount(budget.amountHistory, vigente, newCurrent.start);
    }
  }

  return {
    ...plan,
    budget: {
      ...budget,
      enabled: Boolean(settings.enabled),
      rolloverDay,
      enabledAt: settings.enabled && !budget.enabledAt ? todayISO : budget.enabledAt,
      amountHistory,
    },
  };
}

/**
 * Define o Y a partir do período atual: substitui a entrada que começa nele ou
 * adiciona uma nova. Períodos passados mantêm o Y da época (D7).
 * Valor inválido (NaN ou negativo) não altera nada.
 */
export function applyBudgetAmount(plan: UserPlan, amount: number, todayISO: string): UserPlan {
  if (!Number.isFinite(amount) || amount < 0) return plan;
  const budget = getBudget(plan);
  const period = getPeriodForDate(todayISO, budget.rolloverDay);
  return {
    ...plan,
    budget: { ...budget, amountHistory: upsertAmount(budget.amountHistory, amount, period.start) },
  };
}

/**
 * Registra o fechamento de um período (e `skipped` para os mais antigos
 * pendentes). Se `confirmed`, soma cada alocação em `goal.currentAmount` no
 * MESMO update. Idempotente: se já existe fechamento para o `periodStart`,
 * não faz nada (evita aportar duas vezes).
 */
export function applyBudgetClosure(
  plan: UserPlan,
  closure: BudgetPeriodClosure,
  skipped: BudgetPeriod[],
  nowISO: string
): UserPlan {
  const budget = getBudget(plan);
  if (budget.periodClosures.some((c) => c.periodStart === closure.periodStart)) return plan;

  const skippedRecords: BudgetPeriodClosure[] = skipped
    .filter((p) => p.start !== closure.periodStart && !budget.periodClosures.some((c) => c.periodStart === p.start))
    .map((p) => {
      const summary = computeClosureSummary(plan, p);
      return {
        periodStart: p.start,
        periodEnd: p.end,
        status: "skipped" as const,
        income: summary.income,
        spent: summary.spent,
        budgetAmount: summary.budgetAmount,
        allocations: [],
        closedAt: nowISO,
      };
    });

  const normalizedClosure: BudgetPeriodClosure =
    closure.status === "skipped" ? { ...closure, allocations: [] } : closure;
  const periodClosures = [...budget.periodClosures, ...skippedRecords, normalizedClosure].sort((a, b) =>
    a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0
  );

  let goals = plan.goals;
  if (normalizedClosure.status === "confirmed" && normalizedClosure.allocations.length > 0) {
    const byGoal = new Map<string, number>();
    for (const a of normalizedClosure.allocations) {
      if (Number.isFinite(a.amount) && a.amount !== 0) byGoal.set(a.goalId, (byGoal.get(a.goalId) ?? 0) + a.amount);
    }
    goals = plan.goals.map((g) =>
      byGoal.has(g.id)
        ? { ...g, currentAmount: Math.round((g.currentAmount + (byGoal.get(g.id) as number)) * 100) / 100, updatedAt: nowISO }
        : g
    );
  }

  return { ...plan, goals, budget: { ...budget, periodClosures } };
}
