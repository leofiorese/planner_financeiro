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

/**
 * Classes por nível, com os tokens do tema (`success`, `warning`, `danger`): o contraste AA já vem
 * resolvido nos temas claro e escuro. `bar` é para preenchimento, `text` para textos sobre o card.
 */
export const LEVEL_STYLES: Record<BudgetLevel, { bar: string; text: string; soft: string; border: string }> = {
  ok: {
    bar: "bg-success",
    text: "text-success",
    soft: "bg-success/10",
    border: "border-success/30",
  },
  warning: {
    bar: "bg-warning",
    text: "text-warning",
    soft: "bg-warning/10",
    border: "border-warning/30",
  },
  over: {
    bar: "bg-danger",
    text: "text-danger",
    soft: "bg-danger/10",
    border: "border-danger/30",
  },
};

/** Texto do nível: a cor sozinha não pode ser a única forma de saber se o budget está perto do limite. */
export const LEVEL_LABELS: Record<BudgetLevel, string> = {
  ok: "Dentro do limite",
  warning: "Perto do limite",
  over: "Limite estourado",
};
