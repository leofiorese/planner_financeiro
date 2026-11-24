/**
 * Rentabilidade da carteira e das classes pelo método Modified Dietz (puro).
 *
 *   r = (Vf − Vi − F) / (Vi + F/2),   F = aportes − resgates do período
 *
 * - O primeiro lançamento é só a base: não tem retorno.
 * - Os aportes/resgates de um lançamento valem para o período desde o lançamento anterior
 *   (um mês, ou mais se houver meses sem lançar). O fluxo é considerado no meio do período.
 * - Se `Vi + F/2 ≤ 0` o período não tem retorno (`null`) e fica fora do acumulado.
 * - Acumulado = Π(1 + r) − 1. Anualizado = (1 + acumulado)^(12 / meses) − 1.
 * Todas as taxas são frações (0,012 = 1,2%).
 */
import type { InvestmentClass, InvestmentSnapshot } from "@/types";
import { monthDiff } from "./months";
import { leafIdsUnder, sortSnapshotsAsc } from "./totals";

export interface ReturnPoint {
  month: string;
  /** Meses desde o lançamento anterior (≥ 1). */
  periodMonths: number;
  startBalance: number;
  endBalance: number;
  contributions: number;
  withdrawals: number;
  netFlow: number;
  /** Ganho do período em R$: Vf − Vi − F */
  gain: number;
  /** Retorno do período, ou `null` quando não calculável. */
  periodReturn: number | null;
  /** Retorno acumulado até este ponto (fração), ou `null` se ainda não houver períodos válidos. */
  accumulated: number | null;
}

export interface ReturnSeries {
  points: ReturnPoint[];
  /** Retorno acumulado total (fração) ou `null`. */
  accumulated: number | null;
  /** Retorno anualizado (fração) ou `null`. */
  annualized: number | null;
  /** Meses cobertos pelos períodos com retorno válido. */
  months: number;
  totalGain: number;
  totalContributions: number;
  totalWithdrawals: number;
}

/** Retorno de um período; `null` quando o capital médio exposto é ≤ 0. */
export function periodReturn(startBalance: number, endBalance: number, netFlow: number): number | null {
  const base = startBalance + netFlow / 2;
  if (!(base > 0)) return null;
  return (endBalance - startBalance - netFlow) / base;
}

export function annualize(accumulated: number, months: number): number | null {
  if (months <= 0) return null;
  const growth = 1 + accumulated;
  if (growth <= 0) return -1;
  return Math.pow(growth, 12 / months) - 1;
}

/** Conversão de taxa mensal efetiva para anual. */
export function monthlyToAnnual(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1;
}

function seriesFromSnapshots(snapshots: InvestmentSnapshot[], classIds: ReadonlySet<string> | null): ReturnSeries {
  const ordered = sortSnapshotsAsc(snapshots);
  const pick = (s: InvestmentSnapshot) => {
    let balance = 0;
    let contributions = 0;
    let withdrawals = 0;
    for (const e of s.entries) {
      if (classIds && !classIds.has(e.classId)) continue;
      balance += e.balance;
      contributions += e.contributions;
      withdrawals += e.withdrawals;
    }
    return { balance, contributions, withdrawals };
  };

  const points: ReturnPoint[] = [];
  let growth = 1;
  let validMonths = 0;
  let hasValid = false;
  let totalGain = 0;
  let totalContributions = 0;
  let totalWithdrawals = 0;

  for (let i = 1; i < ordered.length; i++) {
    const prev = pick(ordered[i - 1]);
    const cur = pick(ordered[i]);
    const netFlow = cur.contributions - cur.withdrawals;
    const ret = periodReturn(prev.balance, cur.balance, netFlow);
    const months = Math.max(1, monthDiff(ordered[i - 1].month, ordered[i].month));
    const gain = cur.balance - prev.balance - netFlow;

    if (ret !== null) {
      growth *= 1 + ret;
      validMonths += months;
      hasValid = true;
    }
    totalGain += gain;
    totalContributions += cur.contributions;
    totalWithdrawals += cur.withdrawals;

    points.push({
      month: ordered[i].month,
      periodMonths: months,
      startBalance: prev.balance,
      endBalance: cur.balance,
      contributions: cur.contributions,
      withdrawals: cur.withdrawals,
      netFlow,
      gain,
      periodReturn: ret,
      accumulated: hasValid ? growth - 1 : null,
    });
  }

  const accumulated = hasValid ? growth - 1 : null;
  return {
    points,
    accumulated,
    annualized: accumulated === null ? null : annualize(accumulated, validMonths),
    months: validMonths,
    totalGain,
    totalContributions,
    totalWithdrawals,
  };
}

/** Rentabilidade da carteira inteira. */
export function portfolioReturns(snapshots: InvestmentSnapshot[]): ReturnSeries {
  return seriesFromSnapshots(snapshots, null);
}

/** Rentabilidade de uma classe (categoria = soma das folhas; folha = ela mesma). */
export function classReturns(snapshots: InvestmentSnapshot[], classId: string, classes: InvestmentClass[]): ReturnSeries {
  return seriesFromSnapshots(snapshots, new Set(leafIdsUnder(classId, classes)));
}

/** Média mensal de aportes líquidos nos últimos `lastN` períodos (0 sem períodos). */
export function averageMonthlyNetFlow(series: ReturnSeries, lastN = 6): number {
  const recent = series.points.slice(-lastN);
  const months = recent.reduce((s, p) => s + p.periodMonths, 0);
  if (months === 0) return 0;
  return recent.reduce((s, p) => s + p.netFlow, 0) / months;
}
