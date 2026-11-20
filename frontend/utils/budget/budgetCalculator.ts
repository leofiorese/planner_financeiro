/**
 * Engine do Budget Mensal (puro: sem React e sem relógio implícito; `today` é
 * sempre um parâmetro). Regras: docs/BUDGET_LOGIC.md.
 */
import type {
  BudgetAmountEntry,
  BudgetGoalAllocation,
  BudgetPeriodClosure,
  BudgetSettings,
  UserPlan,
} from "@/types";
import { createDefaultBudget } from "./normalize";
import {
  type BudgetPeriod,
  formatPeriodLabel,
  getDaysRemaining,
  getPeriodByOffset,
  getPeriodForDate,
  listPeriods,
} from "./period";
import {
  type DateRange,
  type Occurrence,
  getExpenseOccurrences,
  getIncomeOccurrences,
} from "./occurrences";
import { type GoalReserveItem, getTotalReserve } from "./goalReservation";

export type BudgetLevel = "ok" | "warning" | "over";

/** Limiares sobre `percentSpent` (fração: 0,8 = 80%). */
export const WARNING_THRESHOLD = 0.8;
export const OVER_THRESHOLD = 1;

export interface BudgetStatus {
  period: BudgetPeriod;
  label: string;
  /** Budget está ativado nas configurações */
  enabled: boolean;
  /** Y vigente no início do período */
  budgetAmount: number;
  /** ΣZ */
  reserveTotal: number;
  reserves: GoalReserveItem[];
  /** max(0, Y − ΣZ) */
  effectiveBudget: number;
  /** X gasto: ocorrências com data ≤ hoje */
  spent: number;
  /** X comprometido: ocorrências com data > hoje */
  committed: number;
  projectedTotal: number;
  /** spent / effectiveBudget (Infinity se não há budget efetivo mas há gasto) */
  percentSpent: number;
  percentProjected: number;
  level: BudgetLevel;
  daysRemaining: number;
  dailyAllowance: number;
  income: number;
  /** income − projectedTotal */
  inferredSavings: number;
  isCurrent: boolean;
  isPast: boolean;
}

export type ClosureState = "confirmed" | "skipped" | "pending" | "none";

export interface BudgetHistoryItem {
  period: BudgetPeriod;
  label: string;
  /** Y da época */
  budgetAmount: number;
  /** ΣZ ATUAL (aproximação: o ΣZ histórico não é guardado) */
  reserveTotal: number;
  effectiveBudget: number;
  spent: number;
  committed: number;
  projectedTotal: number;
  /** quanto passou do Y efetivo (0 se dentro) */
  overBy: number;
  withinBudget: boolean;
  level: BudgetLevel;
  income: number;
  inferredSavings: number;
  isCurrent: boolean;
  closure?: BudgetPeriodClosure;
  closureState: ClosureState;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  amount: number;
  /** fração do total do período (0–1) */
  share: number;
}

export interface FeasibilityResult {
  feasible: boolean;
  suggestedBudget: number;
  gap: number;
  /** false quando não há receita no período: não dá para avaliar a viabilidade */
  evaluable: boolean;
}

export interface ClosureSummary {
  period: BudgetPeriod;
  label: string;
  income: number;
  spent: number;
  budgetAmount: number;
  effectiveBudget: number;
  reserveTotal: number;
  inferredSavings: number;
  withinBudget: boolean;
  overBy: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

function getBudget(plan: UserPlan): BudgetSettings {
  return plan.budget ?? createDefaultBudget();
}

/** Y vigente: última entrada com `effectiveFrom ≤ período.start`; sem entrada = 0. */
export function getBudgetAmountForPeriod(history: BudgetAmountEntry[], period: BudgetPeriod): number {
  let amount = 0;
  let bestFrom = "";
  for (const entry of history) {
    if (entry.effectiveFrom <= period.start && entry.effectiveFrom >= bestFrom) {
      bestFrom = entry.effectiveFrom;
      amount = entry.amount;
    }
  }
  return amount;
}

function levelFor(percentSpent: number): BudgetLevel {
  if (percentSpent < WARNING_THRESHOLD) return "ok";
  if (percentSpent < OVER_THRESHOLD) return "warning";
  return "over";
}

function ratio(value: number, base: number): number {
  if (base > 0) return value / base;
  return value > 0 ? Infinity : 0;
}

/** Todas as ocorrências de despesa do período. */
export function getPeriodExpenseOccurrences(plan: UserPlan, range: DateRange): Occurrence[] {
  const out: Occurrence[] = [];
  for (const expense of plan.expenses ?? []) out.push(...getExpenseOccurrences(expense, range));
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Todas as ocorrências de renda do período. */
export function getPeriodIncomeOccurrences(plan: UserPlan, range: DateRange): Occurrence[] {
  const out: Occurrence[] = [];
  for (const income of plan.income ?? []) out.push(...getIncomeOccurrences(income, range));
  return out;
}

const sum = (items: Occurrence[]): number => items.reduce((acc, o) => acc + o.amount, 0);

// ---------------------------------------------------------------------------
// Status do período
// ---------------------------------------------------------------------------

/**
 * Status de um período. `offset` desloca em relação ao período que contém `todayISO`
 * (0 = atual, -1 = anterior, +1 = próximo).
 *
 * O ΣZ é sempre o ATUAL (calculado a partir do período em curso, com o
 * `currentAmount` de hoje), inclusive para períodos passados/futuros.
 */
export function computeBudgetStatus(plan: UserPlan, todayISO: string, offset = 0): BudgetStatus {
  const budget = getBudget(plan);
  const D = budget.rolloverDay;
  const currentPeriod = getPeriodForDate(todayISO, D);
  const period = offset === 0 ? currentPeriod : getPeriodByOffset(todayISO, D, offset);

  const budgetAmount = getBudgetAmountForPeriod(budget.amountHistory, period);
  const { total: reserveTotal, byGoal } = getTotalReserve(plan.goals ?? [], currentPeriod, D);
  const effectiveBudget = Math.max(0, budgetAmount - reserveTotal);

  const expenseOcc = getPeriodExpenseOccurrences(plan, period);
  const spent = sum(expenseOcc.filter((o) => o.date <= todayISO));
  const committed = sum(expenseOcc.filter((o) => o.date > todayISO));
  const projectedTotal = spent + committed;

  const percentSpent = ratio(spent, effectiveBudget);
  const percentProjected = ratio(projectedTotal, effectiveBudget);
  const daysRemaining = getDaysRemaining(period, todayISO);
  const income = sum(getPeriodIncomeOccurrences(plan, period));

  return {
    period,
    label: formatPeriodLabel(period, todayISO),
    enabled: budget.enabled,
    budgetAmount,
    reserveTotal,
    reserves: byGoal,
    effectiveBudget,
    spent,
    committed,
    projectedTotal,
    percentSpent,
    percentProjected,
    level: levelFor(percentSpent),
    daysRemaining,
    dailyAllowance: Math.max(0, effectiveBudget - projectedTotal) / Math.max(1, daysRemaining),
    income,
    inferredSavings: income - projectedTotal,
    isCurrent: offset === 0,
    isPast: period.end < todayISO,
  };
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

function findClosure(budget: BudgetSettings, period: BudgetPeriod): BudgetPeriodClosure | undefined {
  return budget.periodClosures.find((c) => c.periodStart === period.start);
}

/** Períodos encerrados ainda sem fechamento, do mais antigo ao mais novo. */
function getPendingPeriods(plan: UserPlan, todayISO: string): BudgetPeriod[] {
  const budget = getBudget(plan);
  if (!budget.enabled || !budget.enabledAt) return [];

  const D = budget.rolloverDay;
  const first = getPeriodForDate(budget.enabledAt, D);
  const lastClosedEnd = budget.periodClosures.reduce<string>(
    (max, c) => (c.periodEnd > max ? c.periodEnd : max),
    ""
  );

  const pending: BudgetPeriod[] = [];
  // Limite de segurança: no máximo ~20 anos de períodos
  for (let i = 0; i < 240; i++) {
    const p = getPeriodByOffset(first.start, D, i);
    if (p.end >= todayISO) break; // período em curso/futuro não encerrou
    if (!lastClosedEnd || p.start > lastClosedEnd) pending.push(p);
  }
  return pending;
}

/**
 * Últimos `count` períodos (o atual incluso), do mais antigo ao mais novo,
 * calculados sob demanda num único passe sobre as ocorrências (sem snapshot).
 */
export function computePeriodHistory(plan: UserPlan, todayISO: string, count: number): BudgetHistoryItem[] {
  const budget = getBudget(plan);
  const D = budget.rolloverDay;
  const periods = listPeriods(todayISO, D, count);
  if (periods.length === 0) return [];

  const currentPeriod = periods[periods.length - 1];
  const range: DateRange = { start: periods[0].start, end: currentPeriod.end };
  const expenseOcc = getPeriodExpenseOccurrences(plan, range);
  const incomeOcc = getPeriodIncomeOccurrences(plan, range);
  const { total: reserveTotal } = getTotalReserve(plan.goals ?? [], currentPeriod, D);
  const pendingStarts = new Set(getPendingPeriods(plan, todayISO).map((p) => p.start));

  return periods.map((period) => {
    const inPeriod = (o: Occurrence) => o.date >= period.start && o.date <= period.end;
    const periodExpenses = expenseOcc.filter(inPeriod);
    const spent = sum(periodExpenses.filter((o) => o.date <= todayISO));
    const committed = sum(periodExpenses.filter((o) => o.date > todayISO));
    const projectedTotal = spent + committed;
    const income = sum(incomeOcc.filter(inPeriod));

    const budgetAmount = getBudgetAmountForPeriod(budget.amountHistory, period);
    const effectiveBudget = Math.max(0, budgetAmount - reserveTotal);
    const closure = findClosure(budget, period);
    const closureState: ClosureState = closure
      ? closure.status
      : pendingStarts.has(period.start)
        ? "pending"
        : "none";

    return {
      period,
      label: formatPeriodLabel(period, todayISO),
      budgetAmount,
      reserveTotal,
      effectiveBudget,
      spent,
      committed,
      projectedTotal,
      overBy: Math.max(0, projectedTotal - effectiveBudget),
      withinBudget: projectedTotal <= effectiveBudget,
      level: levelFor(ratio(spent, effectiveBudget)),
      income,
      inferredSavings: income - projectedTotal,
      isCurrent: period.start === currentPeriod.start,
      closure,
      closureState,
    };
  });
}

// ---------------------------------------------------------------------------
// Breakdown por categoria
// ---------------------------------------------------------------------------

/** Gasto + comprometido do período por categoria, do maior para o menor. */
export function computeCategoryBreakdown(plan: UserPlan, period: BudgetPeriod): CategoryBreakdownItem[] {
  const totals = new Map<string, number>();
  for (const expense of plan.expenses ?? []) {
    const amount = sum(getExpenseOccurrences(expense, period));
    if (amount <= 0) continue;
    const key = String(expense.category);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({ categoryId, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// Viabilidade
// ---------------------------------------------------------------------------

/**
 * Viável se `receita − ΣZ ≥ Y`. Sem receita no período (ou sem Y) não há como
 * avaliar: devolve `feasible: true, evaluable: false`.
 */
export function checkFeasibility(status: BudgetStatus): FeasibilityResult {
  const suggestedBudget = Math.max(0, status.income - status.reserveTotal);
  if (status.income <= 0 || status.budgetAmount <= 0) {
    return { feasible: true, suggestedBudget, gap: 0, evaluable: false };
  }
  const feasible = status.income - status.reserveTotal >= status.budgetAmount;
  return {
    feasible,
    suggestedBudget,
    gap: feasible ? 0 : status.budgetAmount - suggestedBudget,
    evaluable: true,
  };
}

// ---------------------------------------------------------------------------
// Fechamento do período
// ---------------------------------------------------------------------------

/**
 * Próximo fechamento a perguntar: o período encerrado mais recente sem
 * fechamento. Os mais antigos pendentes vão em `olderToSkip`.
 * Nada pendente antes do período que contém `enabledAt`.
 */
export function getPendingClosure(
  plan: UserPlan,
  todayISO: string
): { period: BudgetPeriod; olderToSkip: BudgetPeriod[] } | null {
  const pending = getPendingPeriods(plan, todayISO);
  if (pending.length === 0) return null;
  return { period: pending[pending.length - 1], olderToSkip: pending.slice(0, -1) };
}

/** Receita, gasto total e economia inferida de um período (normalmente já encerrado). */
export function computeClosureSummary(plan: UserPlan, period: BudgetPeriod, todayISO?: string): ClosureSummary {
  const budget = getBudget(plan);
  const D = budget.rolloverDay;
  const income = sum(getPeriodIncomeOccurrences(plan, period));
  const spent = sum(getPeriodExpenseOccurrences(plan, period)); // período encerrado: tudo é gasto
  const budgetAmount = getBudgetAmountForPeriod(budget.amountHistory, period);
  const { total: reserveTotal } = getTotalReserve(plan.goals ?? [], period, D);
  const effectiveBudget = Math.max(0, budgetAmount - reserveTotal);
  return {
    period,
    label: formatPeriodLabel(period, todayISO),
    income,
    spent,
    budgetAmount,
    effectiveBudget,
    reserveTotal,
    inferredSavings: income - spent,
    withinBudget: spent <= effectiveBudget,
    overBy: Math.max(0, spent - effectiveBudget),
  };
}

/**
 * Sugestão de aporte por meta com opt-in:
 *  - economia ≤ 0         → tudo 0;
 *  - economia ≥ ΣZ        → aporte = Z da meta;
 *  - 0 < economia < ΣZ    → proporcional: economia × Z / ΣZ.
 * Valores arredondados em centavos.
 */
export function suggestClosureAllocations(
  plan: UserPlan,
  period: BudgetPeriod
): { inferredSavings: number; allocations: BudgetGoalAllocation[] } {
  const budget = getBudget(plan);
  const { inferredSavings } = computeClosureSummary(plan, period);
  const { total, byGoal } = getTotalReserve(plan.goals ?? [], period, budget.rolloverDay);

  const allocations = byGoal.map((item) => {
    let amount = 0;
    if (inferredSavings > 0 && total > 0) {
      amount = inferredSavings >= total ? item.amount : (inferredSavings * item.amount) / total;
    }
    return { goalId: item.goalId, amount: round2(amount) };
  });
  return { inferredSavings, allocations };
}
