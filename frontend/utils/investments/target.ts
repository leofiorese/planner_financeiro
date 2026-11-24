/**
 * Metas: rentabilidade (% a.a.) e patrimônio (R$ até um mês). Puro; nenhuma função lê o relógio.
 */
import { addMonths, monthDiff } from "./months";

const MAX_PROJECTION_MONTHS = 1200; // 100 anos

/** Taxa mensal efetiva equivalente a uma meta em % a.a. (12 → 0,00949). */
export function monthlyEquivalent(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export type TargetStatus = "above" | "on" | "below";

export interface ReturnComparison {
  targetAnnualPct: number;
  actualAnnualPct: number;
  /** Diferença em pontos percentuais (realizado − meta). */
  diffPp: number;
  status: TargetStatus;
}

/** Compara o retorno anualizado realizado (fração) com a meta em % a.a. Tolerância de 0,005 p.p. */
export function compareToTarget(actualAnnual: number, targetAnnualPct: number): ReturnComparison {
  const actualAnnualPct = actualAnnual * 100;
  const diffPp = actualAnnualPct - targetAnnualPct;
  const status: TargetStatus = Math.abs(diffPp) < 0.005 ? "on" : diffPp > 0 ? "above" : "below";
  return { targetAnnualPct, actualAnnualPct, diffPp, status };
}

export interface WealthProjectionInput {
  currentBalance: number;
  /** Mês do último lançamento (YYYY-MM). */
  currentMonth: string;
  targetAmount: number;
  /** Mês-alvo (YYYY-MM). */
  targetMonth: string;
  /** Rentabilidade esperada, % a.a. (ex.: a meta de rentabilidade). */
  annualReturnPct: number;
  /** Aporte líquido mensal assumido (R$; negativo se a média é de resgates). */
  monthlyContribution: number;
}

export interface WealthProjection {
  /** Meses entre o último lançamento e o mês-alvo (≤ 0 se o prazo já passou). */
  monthsToDeadline: number;
  /** Saldo projetado no mês-alvo (o saldo atual, se o prazo já passou). */
  projectedAtTarget: number;
  /** Alcança o alvo até o prazo mantendo o ritmo informado. */
  onTrack: boolean;
  /** Mês em que o alvo é atingido no ritmo informado (YYYY-MM), ou `null` (inalcançável em 100 anos). */
  reachedMonth: string | null;
  /** Aporte mensal necessário para chegar ao alvo no prazo (≥ 0), ou `null` se o prazo já passou. */
  requiredMonthlyContribution: number | null;
}

/** Aportes no fim de cada mês: V(k+1) = V(k)·(1+r) + c. */
export function projectWealthTarget(input: WealthProjectionInput): WealthProjection {
  const { currentBalance, currentMonth, targetAmount, targetMonth, annualReturnPct, monthlyContribution } = input;
  const r = monthlyEquivalent(annualReturnPct);
  const n = monthDiff(currentMonth, targetMonth);
  const grow = (v: number) => v * (1 + r) + monthlyContribution;

  let projectedAtTarget = currentBalance;
  for (let k = 0; k < Math.max(0, n); k++) projectedAtTarget = grow(projectedAtTarget);

  let reachedMonth: string | null = null;
  if (currentBalance >= targetAmount) {
    reachedMonth = currentMonth;
  } else {
    let v = currentBalance;
    for (let k = 1; k <= MAX_PROJECTION_MONTHS; k++) {
      const next = grow(v);
      // Sem crescimento: nunca chega (evita iterar 100 anos à toa).
      if (next <= v) break;
      v = next;
      if (v >= targetAmount) {
        reachedMonth = addMonths(currentMonth, k);
        break;
      }
    }
  }

  let requiredMonthlyContribution: number | null = null;
  if (n > 0) {
    const g = Math.pow(1 + r, n);
    const annuity = r === 0 ? n : (g - 1) / r;
    requiredMonthlyContribution = Math.max(0, (targetAmount - currentBalance * g) / annuity);
  }

  return {
    monthsToDeadline: n,
    projectedAtTarget,
    onTrack: projectedAtTarget >= targetAmount,
    reachedMonth,
    requiredMonthlyContribution,
  };
}
