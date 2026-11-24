/** Séries para os gráficos e KPIs da página de Investimentos (puro). */
import type { InvestmentSnapshot } from "@/types";
import { snapshotFlows, snapshotTotal, sortSnapshotsAsc } from "./totals";

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11" → "nov/26". */
export function formatMonthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month;
  return `${MONTHS_SHORT[m - 1]}/${String(y % 100).padStart(2, "0")}`;
}

export interface EvolutionPoint {
  month: string;
  /** Patrimônio no lançamento. */
  total: number;
  /** Total investido: base (1º lançamento) + aportes líquidos acumulados. */
  invested: number;
  /** Ganho acumulado sobre o investido (total − investido). */
  gain: number;
}

/** Evolução do patrimônio versus o que foi efetivamente investido. Ordem cronológica. */
export function evolutionSeries(snapshots: InvestmentSnapshot[]): EvolutionPoint[] {
  const ordered = sortSnapshotsAsc(snapshots);
  let invested = 0;
  return ordered.map((s, i) => {
    const total = snapshotTotal(s);
    // O 1º lançamento é a base: o que existia já conta como investido.
    invested = i === 0 ? total : invested + snapshotFlows(s).net;
    return { month: s.month, total, invested, gain: total - invested };
  });
}

export interface MonthOverMonth {
  previousTotal: number;
  /** Variação em R$ do total entre os dois últimos lançamentos. */
  change: number;
  /** Variação percentual (fração), ou `null` se o anterior era zero. */
  changePct: number | null;
}

/** Variação entre o último e o penúltimo lançamento (ou `null` com menos de dois). */
export function monthOverMonth(snapshots: InvestmentSnapshot[]): MonthOverMonth | null {
  const ordered = sortSnapshotsAsc(snapshots);
  if (ordered.length < 2) return null;
  const previousTotal = snapshotTotal(ordered[ordered.length - 2]);
  const change = snapshotTotal(ordered[ordered.length - 1]) - previousTotal;
  return { previousTotal, change, changePct: previousTotal > 0 ? change / previousTotal : null };
}

const PCT = (digits: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Fração → "12,34%". `null` vira "—". */
export function formatPercent(fraction: number | null, digits = 2): string {
  if (fraction === null || !Number.isFinite(fraction)) return "—";
  return `${PCT(digits).format(fraction * 100)}%`;
}

/** Pontos percentuais com sinal: "+2,30 p.p." */
export function formatPp(pp: number, digits = 2): string {
  const sign = pp > 0 ? "+" : pp < 0 ? "−" : "";
  return `${sign}${PCT(digits).format(Math.abs(pp))} p.p.`;
}
