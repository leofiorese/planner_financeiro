/**
 * Períodos do budget (puro; sem relógio implícito).
 *
 * Um período vai de D (dia de virada) do mês M até D-1 do mês M+1, ambos
 * inclusivos. Se o mês não tem o dia D, usa o último dia do mês.
 * Regras: docs/BUDGET_LOGIC.md, seção 2.
 */
import {
  addDays,
  clampDay,
  diffInDays,
  parseLocalDate,
  toLocalISODate,
} from "@/utils/dates";

export interface BudgetPeriod {
  /** "YYYY-MM-DD" (inclusivo) */
  start: string;
  /** "YYYY-MM-DD" (inclusivo) */
  end: string;
}

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function sanitizeDay(rolloverDay: number): number {
  const d = Math.trunc(Number(rolloverDay));
  if (!Number.isFinite(d)) return 1;
  return Math.min(31, Math.max(1, d));
}

/** Período cujo início cai no mês (year, monthIndex). monthIndex pode estar fora de 0-11. */
function periodStartingInMonth(year: number, monthIndex: number, rolloverDay: number): BudgetPeriod {
  const d = sanitizeDay(rolloverDay);
  const start = clampDay(year, monthIndex, d);
  const nextStart = clampDay(year, monthIndex + 1, d);
  return { start: toLocalISODate(start), end: toLocalISODate(addDays(nextStart, -1)) };
}

/** Período que contém a data. */
export function getPeriodForDate(dateISO: string, rolloverDay: number): BudgetPeriod {
  const d = parseLocalDate(dateISO);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startThisMonth = toLocalISODate(clampDay(y, m, sanitizeDay(rolloverDay)));
  const day = toLocalISODate(d);
  return day >= startThisMonth
    ? periodStartingInMonth(y, m, rolloverDay)
    : periodStartingInMonth(y, m - 1, rolloverDay);
}

/** Período deslocado `offset` períodos do que contém a data (-1 = anterior, +1 = próximo). */
export function getPeriodByOffset(dateISO: string, rolloverDay: number, offset: number): BudgetPeriod {
  const base = parseLocalDate(getPeriodForDate(dateISO, rolloverDay).start);
  return periodStartingInMonth(base.getFullYear(), base.getMonth() + offset, rolloverDay);
}

/** `count` períodos terminando no que contém `endingAtISO`, do mais antigo ao mais novo. */
export function listPeriods(endingAtISO: string, rolloverDay: number, count: number): BudgetPeriod[] {
  const out: BudgetPeriod[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(getPeriodByOffset(endingAtISO, rolloverDay, -i));
  }
  return out;
}

/**
 * Quantidade de períodos de `fromPeriod` até o que contém `toDateISO`, inclusive
 * (mesmo período = 1). Se `toDateISO` cai antes de `fromPeriod`, devolve 0.
 */
export function countPeriodsBetween(fromPeriod: BudgetPeriod, toDateISO: string, rolloverDay: number): number {
  const from = parseLocalDate(fromPeriod.start);
  const to = parseLocalDate(getPeriodForDate(toDateISO, rolloverDay).start);
  const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, diff + 1);
}

/**
 * Rótulo pt-BR: "20 nov – 19 dez". Acrescenta o ano ("20 dez 2026 – 19 jan 2027")
 * quando os extremos estão em anos diferentes ou, se `todayISO` for informado,
 * quando algum extremo não é do ano atual.
 */
export function formatPeriodLabel(p: BudgetPeriod, todayISO?: string): string {
  const s = parseLocalDate(p.start);
  const e = parseLocalDate(p.end);
  const currentYear = todayISO ? parseLocalDate(todayISO).getFullYear() : undefined;
  const withYear =
    s.getFullYear() !== e.getFullYear() ||
    (currentYear !== undefined && s.getFullYear() !== currentYear);
  const fmt = (d: Date) =>
    `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
  return `${fmt(s)} – ${fmt(e)}`;
}

/**
 * Dias de hoje até o fim do período, inclusive (0 se o período já passou).
 * Em período futuro, conta o período inteiro.
 */
export function getDaysRemaining(p: BudgetPeriod, todayISO: string): number {
  if (todayISO > p.end) return 0;
  const from = todayISO > p.start ? todayISO : p.start;
  return diffInDays(parseLocalDate(from), parseLocalDate(p.end)) + 1;
}
