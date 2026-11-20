/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pure mapping helpers between the budget DB rows and the `UserPlan.budget` model.
 * Kept free of DB access so they can be unit tested (see tests/budgetMapping.test.ts).
 *
 * See docs/BUDGET_LOGIC.md (section 11) for the persistence model.
 */
import type { BudgetAmountEntry, BudgetGoalAllocation, BudgetPeriodClosure, BudgetSettings } from '../types';

export const DEFAULT_ROLLOVER_DAY = 1;

/** MySQL TINYINT(1)/BIT/boolean/Buffer -> boolean */
export function toBool(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
    if (value instanceof Buffer) return value[0] === 1;
    return false;
}

/** DECIMAL columns come back as strings from mysql2. */
export function toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/** Nullable DECIMAL: null/undefined/'' stay null. */
export function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Accepts the JSON column as a string or as an already-parsed value (depends on the driver). */
export function parseAllocations(raw: unknown): BudgetGoalAllocation[] {
    let value: unknown = raw;
    if (value instanceof Buffer) value = value.toString('utf8');
    if (typeof value === 'string') {
        if (value.trim() === '') return [];
        try {
            value = JSON.parse(value);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(value)) return [];
    return value
        .filter((a: any) => a && typeof a.goalId === 'string')
        .map((a: any) => ({ goalId: a.goalId as string, amount: toNumber(a.amount) }));
}

function toIsoDateTime(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return '';
}

export function clampRolloverDay(value: unknown): number {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) return DEFAULT_ROLLOVER_DAY;
    return Math.min(31, Math.max(1, n));
}

/**
 * Builds `userPlan.budget` from the DB rows. Without a `budget_settings` row the
 * result is `undefined` and the frontend applies its own defaults.
 */
export function mapBudgetFromRows(
    settingsRow: any | undefined,
    historyRows: any[],
    closureRows: any[]
): BudgetSettings | undefined {
    if (!settingsRow) return undefined;

    const amountHistory: BudgetAmountEntry[] = historyRows
        .map((r) => ({ amount: toNumber(r.amount), effectiveFrom: String(r.effective_from ?? r.effectiveFrom ?? '') }))
        .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));

    const periodClosures: BudgetPeriodClosure[] = closureRows
        .map((r) => ({
            periodStart: String(r.period_start ?? r.periodStart ?? ''),
            periodEnd: String(r.period_end ?? r.periodEnd ?? ''),
            status: (r.status === 'skipped' ? 'skipped' : 'confirmed') as BudgetPeriodClosure['status'],
            income: toNumber(r.income),
            spent: toNumber(r.spent),
            budgetAmount: toNumber(r.budget_amount ?? r.budgetAmount),
            allocations: parseAllocations(r.allocations),
            closedAt: toIsoDateTime(r.closed_at ?? r.closedAt),
        }))
        .sort((a, b) => (a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0));

    return {
        enabled: toBool(settingsRow.enabled),
        rolloverDay: clampRolloverDay(settingsRow.rollover_day ?? settingsRow.rolloverDay),
        enabledAt: String(settingsRow.enabled_at ?? settingsRow.enabledAt ?? ''),
        amountHistory,
        periodClosures,
    };
}

/** Sanitizes an incoming `budget` payload before it is written. */
export function normalizeBudgetForSave(budget: Partial<BudgetSettings> | undefined | null): BudgetSettings | undefined {
    if (!budget || typeof budget !== 'object') return undefined;

    // Same effectiveFrom twice would be ambiguous: the last one wins.
    const byDate = new Map<string, number>();
    for (const e of budget.amountHistory ?? []) {
        if (e && typeof e.effectiveFrom === 'string' && e.effectiveFrom) {
            byDate.set(e.effectiveFrom, toNumber(e.amount));
        }
    }
    const amountHistory = Array.from(byDate.entries())
        .map(([effectiveFrom, amount]) => ({ effectiveFrom, amount }))
        .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));

    // UNIQUE(user_plan_id, period_start): keep the last closure for each period.
    const closuresByStart = new Map<string, BudgetPeriodClosure>();
    for (const c of budget.periodClosures ?? []) {
        if (c && typeof c.periodStart === 'string' && c.periodStart) {
            closuresByStart.set(c.periodStart, {
                periodStart: c.periodStart,
                periodEnd: c.periodEnd,
                status: c.status === 'skipped' ? 'skipped' : 'confirmed',
                income: toNumber(c.income),
                spent: toNumber(c.spent),
                budgetAmount: toNumber(c.budgetAmount),
                allocations: c.status === 'skipped' ? [] : parseAllocations(c.allocations),
                closedAt: c.closedAt,
            });
        }
    }

    return {
        enabled: Boolean(budget.enabled),
        rolloverDay: clampRolloverDay(budget.rolloverDay),
        enabledAt: typeof budget.enabledAt === 'string' ? budget.enabledAt : '',
        amountHistory,
        periodClosures: Array.from(closuresByStart.values()),
    };
}

/** Extra goal fields (camelCased row in, normalized fields out). */
export function mapGoalBudgetFields(goal: any): { reserveFromBudget: boolean; budgetReserveOverride: number | null } {
    return {
        reserveFromBudget: toBool(goal.reserveFromBudget),
        budgetReserveOverride: toNullableNumber(goal.budgetReserveOverride),
    };
}

/** Value to bind into goals.budget_reserve_override (NULL = automatic). */
export function overrideToDb(value: unknown): number | null {
    const n = toNullableNumber(value);
    return n === null || n < 0 ? null : n;
}

/** Value to bind into expenses.purchase_date (NULL when empty). */
export function purchaseDateToDb(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value.slice(0, 10) : null;
}
