/**
 * Cálculos de apresentação do budget (puros), para as barras e pills.
 */
import type { BudgetLevel, BudgetStatus } from "./budgetCalculator";

export interface ProgressSegments {
  /** largura do segmento "gasto" (0–100) */
  spentPct: number;
  /** largura do segmento "comprometido" (0–100, somado ao gasto nunca passa de 100) */
  committedPct: number;
  /** quanto o gasto passou do Y efetivo (0 se dentro) */
  overBy: number;
  /** quanto o gasto + comprometido passa do Y efetivo (0 se dentro) */
  projectedOverBy: number;
  /** o gasto já ultrapassou o Y efetivo */
  isOver: boolean;
  level: BudgetLevel;
  /** "65%", ">100%" quando não há budget efetivo e há gasto */
  percentLabel: string;
  /** percentual inteiro do gasto, limitado a 0–100 (para aria-valuenow) */
  ariaNow: number;
}

type SegmentInput = Pick<
  BudgetStatus,
  "effectiveBudget" | "spent" | "committed" | "projectedTotal" | "percentSpent" | "level"
>;

export function getProgressSegments(status: SegmentInput): ProgressSegments {
  const eff = status.effectiveBudget;
  let spentPct: number;
  let committedPct: number;

  if (eff <= 0) {
    spentPct = status.spent > 0 ? 100 : 0;
    committedPct = status.spent > 0 ? 0 : status.committed > 0 ? 100 : 0;
  } else {
    spentPct = Math.min(100, (status.spent / eff) * 100);
    committedPct = Math.min(100 - spentPct, (status.committed / eff) * 100);
  }

  const overBy = Math.max(0, status.spent - Math.max(0, eff));
  const projectedOverBy = Math.max(0, status.projectedTotal - Math.max(0, eff));
  const finite = Number.isFinite(status.percentSpent);

  return {
    spentPct,
    committedPct,
    overBy,
    projectedOverBy,
    isOver: status.level === "over",
    level: status.level,
    percentLabel: finite ? `${Math.round(status.percentSpent * 100)}%` : ">100%",
    ariaNow: finite ? Math.max(0, Math.min(100, Math.round(status.percentSpent * 100))) : 100,
  };
}

/** Classes Tailwind por nível (sólido para o gasto). */
export const LEVEL_STYLES: Record<BudgetLevel, { bar: string; text: string; soft: string; border: string }> = {
  ok: {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    soft: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  warning: {
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    soft: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
  },
  over: {
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    soft: "bg-rose-50 dark:bg-rose-950/50",
    border: "border-rose-200 dark:border-rose-800",
  },
};
