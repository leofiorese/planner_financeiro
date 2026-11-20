/**
 * Normalização/defaults do budget (puro). Usado ao carregar o plano
 * (context/storage.ts → migrateUserPlan), no import e no estado inicial.
 *
 * Regras: docs/BUDGET_LOGIC.md.
 */
import type {
  BudgetAmountEntry,
  BudgetGoalAllocation,
  BudgetPeriodClosure,
  BudgetSettings,
  Expense,
  Goal,
} from "@/types";
import { PaymentMethod } from "@/types";
import { toLocalISODate } from "@/utils/dates";

export function createDefaultBudget(): BudgetSettings {
  return {
    enabled: false,
    rolloverDay: 1,
    enabledAt: "",
    amountHistory: [],
    periodClosures: [],
  };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeAllocations(raw: unknown): BudgetGoalAllocation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a.goalId === "string")
    .map((a) => ({ goalId: a.goalId as string, amount: num(a.amount) }));
}

/** Aceita qualquer coisa vinda do servidor/import e devolve um BudgetSettings válido. */
export function normalizeBudget(raw: unknown): BudgetSettings {
  const base = createDefaultBudget();
  if (!raw || typeof raw !== "object") return base;
  const b = raw as Partial<BudgetSettings>;

  const rolloverDay = Math.trunc(Number(b.rolloverDay));
  const amountHistory: BudgetAmountEntry[] = Array.isArray(b.amountHistory)
    ? b.amountHistory
        .filter((e) => e && typeof e.effectiveFrom === "string" && e.effectiveFrom)
        .map((e) => ({ amount: num(e.amount), effectiveFrom: e.effectiveFrom }))
        .sort((x, y) => (x.effectiveFrom < y.effectiveFrom ? -1 : x.effectiveFrom > y.effectiveFrom ? 1 : 0))
    : [];
  const periodClosures: BudgetPeriodClosure[] = Array.isArray(b.periodClosures)
    ? b.periodClosures
        .filter((c) => c && typeof c.periodStart === "string" && typeof c.periodEnd === "string")
        .map((c) => ({
          periodStart: c.periodStart,
          periodEnd: c.periodEnd,
          status: (c.status === "skipped" ? "skipped" : "confirmed") as BudgetPeriodClosure["status"],
          income: num(c.income),
          spent: num(c.spent),
          budgetAmount: num(c.budgetAmount),
          allocations: c.status === "skipped" ? [] : normalizeAllocations(c.allocations),
          closedAt: typeof c.closedAt === "string" ? c.closedAt : "",
        }))
    : [];

  return {
    enabled: Boolean(b.enabled),
    rolloverDay: Number.isFinite(rolloverDay) ? Math.min(31, Math.max(1, rolloverDay)) : base.rolloverDay,
    enabledAt: typeof b.enabledAt === "string" ? b.enabledAt : "",
    amountHistory,
    periodClosures,
  };
}

/**
 * Data local (YYYY-MM-DD) de um `createdAt`. Com horário ("...T...") converte
 * para o dia LOCAL do usuário; sem horário usa a própria data.
 */
export function createdAtToLocalDate(createdAt: string | undefined): string | undefined {
  if (!createdAt) return undefined;
  if (createdAt.includes("T")) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) return toLocalISODate(d);
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(createdAt);
  return m ? m[1] : undefined;
}

/**
 * D4 (backfill): despesas de cartão sem `purchaseDate` usam a data do `createdAt`.
 * Não altera despesas que não são de cartão (a engine usa `dueDate` para elas).
 */
export function withBackfilledPurchaseDate<T extends Pick<Expense, "paymentMethod" | "createdAt"> & { purchaseDate?: string }>(
  expense: T
): T & { purchaseDate?: string } {
  if (expense.purchaseDate) return expense;
  if (expense.paymentMethod !== PaymentMethod.CREDIT_CARD) return expense;
  const backfilled = createdAtToLocalDate(expense.createdAt);
  return backfilled ? { ...expense, purchaseDate: backfilled } : expense;
}

/** Metas sem os campos de budget ficam com opt-in desligado e override automático. */
export function withBudgetGoalDefaults<T extends Partial<Pick<Goal, "reserveFromBudget" | "budgetReserveOverride">>>(
  goal: T
): Omit<T, "reserveFromBudget" | "budgetReserveOverride"> & {
  reserveFromBudget: boolean;
  budgetReserveOverride: number | null;
} {
  const override =
    goal.budgetReserveOverride === null || goal.budgetReserveOverride === undefined
      ? null
      : Number.isFinite(Number(goal.budgetReserveOverride))
        ? Number(goal.budgetReserveOverride)
        : null;
  return {
    ...goal,
    reserveFromBudget: Boolean(goal.reserveFromBudget),
    budgetReserveOverride: override,
  };
}
