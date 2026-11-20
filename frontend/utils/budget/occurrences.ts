/**
 * Ocorrências reais (por dia) de despesas e rendas dentro de um intervalo.
 * Diferente do forecast (média mensal), o budget conta cada ocorrência na sua data.
 * Regras: docs/BUDGET_LOGIC.md, seções 3 e 4.
 *
 * Puro: nenhuma função lê o relógio.
 */
import type { Expense, Income } from "@/types";
import { Frequency, PaymentMethod } from "@/types";
import {
  addDays,
  addMonthsClamped,
  clampDay,
  diffInDays,
  parseLocalDate,
  toLocalISODate,
} from "@/utils/dates";
import { createdAtToLocalDate } from "./normalize";

export interface DateRange {
  /** "YYYY-MM-DD" (inclusivo) */
  start: string;
  /** "YYYY-MM-DD" (inclusivo) */
  end: string;
}

export interface Occurrence {
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  /** id da despesa/renda de origem */
  sourceId: string;
  installment?: { index: number; total: number };
}

const dateOnly = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : undefined;
};

/**
 * Data que define em qual período a despesa cai:
 * purchaseDate -> (cartão: data local do createdAt) -> dueDate.
 */
export function getBudgetDate(expense: Expense): string {
  const purchase = dateOnly(expense.purchaseDate);
  if (purchase) return purchase;
  if (expense.paymentMethod === PaymentMethod.CREDIT_CARD) {
    const fromCreated = createdAtToLocalDate(expense.createdAt);
    if (fromCreated) return fromCreated;
  }
  return dateOnly(expense.dueDate) ?? expense.dueDate;
}

// ---------------------------------------------------------------------------
// Geração de séries (sempre a partir da âncora, sem iterar desde o início)
// ---------------------------------------------------------------------------

/** Datas anchor + n*stepDays dentro de [start, end] (e nunca antes da âncora). */
function daySeries(anchorISO: string, stepDays: number, range: DateRange): string[] {
  const anchor = parseLocalDate(anchorISO);
  const rangeStart = parseLocalDate(range.start);
  const rangeEnd = parseLocalDate(range.end);
  const step = Math.max(1, Math.trunc(stepDays));

  let n = 0;
  if (anchor < rangeStart) {
    n = Math.ceil(diffInDays(anchor, rangeStart) / step);
  }
  const out: string[] = [];
  for (let d = addDays(anchor, n * step); d <= rangeEnd; d = addDays(anchor, ++n * step)) {
    out.push(toLocalISODate(d));
  }
  return out;
}

/** Datas anchor + n*stepMonths meses (clamp a partir da âncora) dentro de [start, end]. */
function monthSeries(anchorISO: string, stepMonths: number, range: DateRange): string[] {
  const anchor = parseLocalDate(anchorISO);
  const rangeStart = parseLocalDate(range.start);
  const rangeEnd = parseLocalDate(range.end);
  const step = Math.max(1, Math.trunc(stepMonths));

  const monthDiff =
    (rangeStart.getFullYear() - anchor.getFullYear()) * 12 + (rangeStart.getMonth() - anchor.getMonth());
  // um passo de folga: o clamp pode empurrar a data para trás dentro do mês
  let n = Math.max(0, Math.floor(monthDiff / step) - 1);
  const out: string[] = [];
  for (let d = addMonthsClamped(anchor, n * step); d <= rangeEnd; d = addMonthsClamped(anchor, ++n * step)) {
    if (d >= rangeStart && d >= anchor) out.push(toLocalISODate(d));
  }
  return out;
}

/** Série de datas de uma recorrência por frequência. `one_time` = só a âncora. */
function recurrenceDates(
  anchorISO: string,
  frequency: Frequency,
  weeksInterval: number | undefined,
  range: DateRange
): string[] {
  switch (frequency) {
    case Frequency.DAILY:
      return daySeries(anchorISO, 1, range);
    case Frequency.WEEKLY:
      return daySeries(anchorISO, 7 * Math.max(1, Math.trunc(weeksInterval ?? 1) || 1), range);
    case Frequency.BIWEEKLY:
      return daySeries(anchorISO, 14, range);
    case Frequency.MONTHLY:
      return monthSeries(anchorISO, 1, range);
    case Frequency.QUARTERLY:
      return monthSeries(anchorISO, 3, range);
    case Frequency.YEARLY:
      return monthSeries(anchorISO, 12, range);
    case Frequency.ONE_TIME:
    default:
      return anchorISO >= range.start && anchorISO <= range.end ? [anchorISO] : [];
  }
}

const byDate = (a: Occurrence, b: Occurrence) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

// ---------------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------------

/** Parcelas mensais: a k-ésima (0-based) cai em `dateOf(k)`. */
function installmentSeries(
  dateOf: (k: number) => Date,
  total: number,
  amountEach: number,
  sourceId: string,
  range: DateRange
): Occurrence[] {
  const out: Occurrence[] = [];
  for (let k = 0; k < total; k++) {
    const date = toLocalISODate(dateOf(k));
    if (date > range.end) break;
    if (date >= range.start) {
      out.push({ date, amount: amountEach, sourceId, installment: { index: k + 1, total } });
    }
  }
  return out;
}

/** Mesmo dia da âncora a cada mês (clamp sempre a partir da âncora). */
const fromAnchor = (firstISO: string) => {
  const first = parseLocalDate(firstISO);
  return (k: number) => addMonthsClamped(first, k);
};

/**
 * Parcelas FORA do cartão: mês `installmentStartMonth + k`, no dia de `dueDate`
 * (com clamp). Sem `installmentStartMonth`, parte de `dueDate`.
 */
function nonCardInstallmentDates(expense: Expense): (k: number) => Date {
  const dueISO = dateOnly(expense.dueDate) ?? expense.dueDate;
  const startMonth = /^(\d{4})-(\d{2})/.exec(expense.installmentStartMonth ?? "");
  if (!startMonth) return fromAnchor(dueISO);
  const dueDay = parseLocalDate(dueISO).getDate();
  const year = Number(startMonth[1]);
  const monthIndex = Number(startMonth[2]) - 1;
  return (k: number) => clampDay(year, monthIndex + k, dueDay);
}

/**
 * Ocorrências de uma despesa dentro de `range` (inclusivo), ordenadas por data.
 * Despesa inativa gera [].
 */
export function getExpenseOccurrences(expense: Expense, range: DateRange): Occurrence[] {
  if (!expense.isActive) return [];
  if (range.start > range.end) return [];

  const anchor = getBudgetDate(expense);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return [];

  const recurring = Boolean(expense.recurring && expense.frequency && expense.frequency !== Frequency.ONE_TIME);
  const installments =
    expense.isInstallment && expense.installmentMonths && expense.installmentMonths > 0
      ? Math.trunc(expense.installmentMonths)
      : 0;
  const each = installments > 0 ? expense.amount / installments : expense.amount;

  // Recorrente + parcelada: cada ciclo recorrente inicia uma série de parcelas mensais
  if (recurring && installments > 0) {
    // ciclos que ainda podem ter parcelas dentro do range
    const lowerBound = toLocalISODate(addMonthsClamped(parseLocalDate(range.start), -(installments - 1)));
    const cycles = recurrenceDates(anchor, expense.frequency as Frequency, expense.recurringWeeksInterval, {
      start: lowerBound,
      end: range.end,
    });
    const out: Occurrence[] = [];
    for (const cycle of cycles) {
      out.push(...installmentSeries(fromAnchor(cycle), installments, each, expense.id, range));
    }
    return out.sort(byDate);
  }

  // Parcelada (não recorrente)
  if (installments > 0) {
    const dateOf =
      expense.paymentMethod === PaymentMethod.CREDIT_CARD ? fromAnchor(anchor) : nonCardInstallmentDates(expense);
    return installmentSeries(dateOf, installments, each, expense.id, range);
  }

  // Recorrente simples
  if (recurring) {
    return recurrenceDates(anchor, expense.frequency as Frequency, expense.recurringWeeksInterval, range).map(
      (date) => ({ date, amount: expense.amount, sourceId: expense.id })
    );
  }

  // Avulsa
  return anchor >= range.start && anchor <= range.end
    ? [{ date: anchor, amount: expense.amount, sourceId: expense.id }]
    : [];
}

// ---------------------------------------------------------------------------
// Rendas
// ---------------------------------------------------------------------------

/** Ocorrências de uma renda dentro de `range`, respeitando `startDate` e `endDate`. */
export function getIncomeOccurrences(income: Income, range: DateRange): Occurrence[] {
  if (!income.isActive) return [];
  if (range.start > range.end) return [];

  const anchor = dateOnly(income.startDate);
  if (!anchor) return [];
  const end = dateOnly(income.endDate);
  const effectiveRange: DateRange = { start: range.start, end: end && end < range.end ? end : range.end };
  if (effectiveRange.start > effectiveRange.end) return [];

  const frequency = income.frequency ?? Frequency.ONE_TIME;
  return recurrenceDates(anchor, frequency, undefined, effectiveRange).map((date) => ({
    date,
    amount: income.amount,
    sourceId: income.id,
  }));
}
