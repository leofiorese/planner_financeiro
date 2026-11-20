import test from "node:test";
import assert from "node:assert/strict";
import { getBudgetDate, getExpenseOccurrences, getIncomeOccurrences } from "../../utils/budget/occurrences";
import { Frequency, PaymentMethod } from "../../types";
import { diffInDaysISO, toLocalISODate } from "../../utils/dates";
import { makeExpense, makeIncome, oneOff } from "./helpers";

const RANGE = { start: "2026-11-20", end: "2026-12-19" };
const dates = (occ: { date: string }[]) => occ.map((o) => o.date);

// --- getBudgetDate -----------------------------------------------------------

test("getBudgetDate: cartão com purchaseDate usa a data da compra", () => {
  const e = makeExpense({
    paymentMethod: PaymentMethod.CREDIT_CARD,
    dueDate: "2026-12-17",
    purchaseDate: "2026-11-20",
    createdAt: "2026-10-01",
  });
  assert.equal(getBudgetDate(e), "2026-11-20");
});

test("getBudgetDate: cartão sem purchaseDate usa o createdAt (data local)", () => {
  const e = makeExpense({ paymentMethod: PaymentMethod.CREDIT_CARD, dueDate: "2026-12-17", createdAt: "2026-11-09" });
  assert.equal(getBudgetDate(e), "2026-11-09");

  const iso = "2026-11-10T01:30:00.000Z";
  const withTime = makeExpense({ paymentMethod: PaymentMethod.CREDIT_CARD, dueDate: "2026-12-17", createdAt: iso });
  assert.equal(getBudgetDate(withTime), toLocalISODate(new Date(iso)));
});

test("getBudgetDate: pix usa o dueDate, mesmo com createdAt diferente", () => {
  const e = makeExpense({ paymentMethod: PaymentMethod.PIX, dueDate: "2026-11-25", createdAt: "2026-09-01" });
  assert.equal(getBudgetDate(e), "2026-11-25");
});

// --- avulsa ------------------------------------------------------------------

test("avulsa: dentro e fora do range, inclusive nas bordas", () => {
  assert.deepEqual(dates(getExpenseOccurrences(oneOff("2026-11-25", 50), RANGE)), ["2026-11-25"]);
  assert.deepEqual(dates(getExpenseOccurrences(oneOff("2026-11-20", 50), RANGE)), ["2026-11-20"]);
  assert.deepEqual(dates(getExpenseOccurrences(oneOff("2026-12-19", 50), RANGE)), ["2026-12-19"]);
  assert.deepEqual(getExpenseOccurrences(oneOff("2026-11-19", 50), RANGE), []);
  assert.deepEqual(getExpenseOccurrences(oneOff("2026-12-20", 50), RANGE), []);
});

test("avulsa de cartão conta na data da compra, não no vencimento da fatura", () => {
  const e = makeExpense({
    paymentMethod: PaymentMethod.CREDIT_CARD,
    dueDate: "2026-12-17",
    purchaseDate: "2026-11-21",
    amount: 80,
  });
  const occ = getExpenseOccurrences(e, RANGE);
  assert.deepEqual(dates(occ), ["2026-11-21"]);
  assert.equal(occ[0].amount, 80);
});

test("isActive=false gera []", () => {
  assert.deepEqual(getExpenseOccurrences(oneOff("2026-11-25", 50, { isActive: false }), RANGE), []);
  assert.deepEqual(
    getExpenseOccurrences(
      makeExpense({ recurring: true, frequency: Frequency.MONTHLY, dueDate: "2026-01-25", isActive: false }),
      RANGE
    ),
    []
  );
});

test("recorrente com frequência one_time é tratada como avulsa", () => {
  const e = oneOff("2026-11-25", 50, { recurring: true, frequency: Frequency.ONE_TIME });
  assert.deepEqual(dates(getExpenseOccurrences(e, RANGE)), ["2026-11-25"]);
});

// --- recorrentes --------------------------------------------------------------

test("monthly com dia 31: fevereiro cai no último dia e março volta ao 31", () => {
  const e = oneOff("2027-01-31", 100, { recurring: true, frequency: Frequency.MONTHLY });
  assert.deepEqual(dates(getExpenseOccurrences(e, { start: "2027-02-01", end: "2027-03-31" })), [
    "2027-02-28",
    "2027-03-31",
  ]);
  assert.deepEqual(dates(getExpenseOccurrences(e, { start: "2027-01-01", end: "2027-04-30" })), [
    "2027-01-31",
    "2027-02-28",
    "2027-03-31",
    "2027-04-30",
  ]);
});

test("recorrente nunca gera ocorrências antes da âncora", () => {
  const e = oneOff("2026-12-10", 100, { recurring: true, frequency: Frequency.MONTHLY });
  assert.deepEqual(dates(getExpenseOccurrences(e, RANGE)), ["2026-12-10"]);
  assert.deepEqual(getExpenseOccurrences(e, { start: "2026-10-01", end: "2026-11-30" }), []);
});

test("weekly: intervalo 1 e intervalo 3", () => {
  const w1 = oneOff("2026-11-02", 10, { recurring: true, frequency: Frequency.WEEKLY, recurringWeeksInterval: 1 });
  assert.deepEqual(dates(getExpenseOccurrences(w1, RANGE)), ["2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14"]);

  const w3 = oneOff("2026-11-02", 10, { recurring: true, frequency: Frequency.WEEKLY, recurringWeeksInterval: 3 });
  assert.deepEqual(dates(getExpenseOccurrences(w3, RANGE)), ["2026-11-23", "2026-12-14"]);

  const noInterval = oneOff("2026-11-02", 10, { recurring: true, frequency: Frequency.WEEKLY });
  assert.equal(getExpenseOccurrences(noInterval, RANGE).length, 4);
});

test("biweekly: a cada 14 dias", () => {
  const e = oneOff("2026-11-02", 10, { recurring: true, frequency: Frequency.BIWEEKLY });
  assert.deepEqual(dates(getExpenseOccurrences(e, RANGE)), ["2026-11-30", "2026-12-14"]);
});

test("daily: uma ocorrência por dia (contagem exata)", () => {
  const e = oneOff("2026-11-10", 5, { recurring: true, frequency: Frequency.DAILY });
  const occ = getExpenseOccurrences(e, RANGE);
  assert.equal(occ.length, 30);
  assert.equal(occ[0].date, "2026-11-20");
  assert.equal(occ[29].date, "2026-12-19");

  const later = oneOff("2026-12-01", 5, { recurring: true, frequency: Frequency.DAILY });
  assert.equal(getExpenseOccurrences(later, RANGE).length, 19); // 1 a 19 de dezembro
});

test("quarterly e yearly entram cheios, na data real", () => {
  const q = oneOff("2026-02-15", 300, { recurring: true, frequency: Frequency.QUARTERLY });
  assert.deepEqual(getExpenseOccurrences(q, RANGE), []);
  const qNov = getExpenseOccurrences(q, { start: "2026-11-01", end: "2026-11-30" });
  assert.deepEqual(dates(qNov), ["2026-11-15"]);
  assert.equal(qNov[0].amount, 300);

  const y = oneOff("2025-12-10", 1200, { recurring: true, frequency: Frequency.YEARLY });
  const yOcc = getExpenseOccurrences(y, RANGE);
  assert.deepEqual(dates(yOcc), ["2026-12-10"]);
  assert.equal(yOcc[0].amount, 1200);
});

test("yearly de 29/fev: 28/fev em ano não bissexto e 29/fev no bissexto", () => {
  const y = oneOff("2024-02-29", 100, { recurring: true, frequency: Frequency.YEARLY });
  assert.deepEqual(dates(getExpenseOccurrences(y, { start: "2027-02-01", end: "2027-02-28" })), ["2027-02-28"]);
  assert.deepEqual(dates(getExpenseOccurrences(y, { start: "2028-02-01", end: "2028-02-29" })), ["2028-02-29"]);
});

test("recorrência longa não itera desde a âncora (e continua alinhada)", () => {
  const e = oneOff("2020-01-01", 1, { recurring: true, frequency: Frequency.WEEKLY, recurringWeeksInterval: 1 });
  const occ = getExpenseOccurrences(e, RANGE);
  assert.ok(occ.length >= 4 && occ.length <= 5);
  for (const o of occ) assert.equal(diffInDaysISO("2020-01-01", o.date) % 7, 0);

  const m = oneOff("2020-01-31", 1, { recurring: true, frequency: Frequency.MONTHLY });
  assert.deepEqual(dates(getExpenseOccurrences(m, { start: "2027-02-01", end: "2027-03-31" })), [
    "2027-02-28",
    "2027-03-31",
  ]);
});

// --- parceladas --------------------------------------------------------------

test("parcelada no cartão 6x a partir da purchaseDate", () => {
  const e = makeExpense({
    paymentMethod: PaymentMethod.CREDIT_CARD,
    amount: 600,
    dueDate: "2026-12-17",
    purchaseDate: "2026-10-31",
    isInstallment: true,
    installmentMonths: 6,
    installmentStartMonth: "2026-12",
  });
  const all = getExpenseOccurrences(e, { start: "2026-01-01", end: "2027-12-31" });
  assert.deepEqual(dates(all), [
    "2026-10-31",
    "2026-11-30",
    "2026-12-31",
    "2027-01-31",
    "2027-02-28",
    "2027-03-31",
  ]);
  assert.ok(all.every((o) => o.amount === 100));
  assert.deepEqual(all[2].installment, { index: 3, total: 6 });

  assert.deepEqual(dates(getExpenseOccurrences(e, RANGE)), ["2026-11-30"]);
  assert.deepEqual(dates(getExpenseOccurrences(e, { start: "2026-12-20", end: "2027-01-19" })), ["2026-12-31"]);
});

test("parcelada fora do cartão a partir de installmentStartMonth, no dia de dueDate", () => {
  const e = makeExpense({
    paymentMethod: PaymentMethod.PIX,
    amount: 300,
    dueDate: "2026-11-15",
    isInstallment: true,
    installmentMonths: 3,
    installmentStartMonth: "2026-12",
  });
  const all = getExpenseOccurrences(e, { start: "2026-01-01", end: "2027-12-31" });
  assert.deepEqual(dates(all), ["2026-12-15", "2027-01-15", "2027-02-15"]);
  assert.ok(all.every((o) => o.amount === 100));
  assert.deepEqual(dates(getExpenseOccurrences(e, RANGE)), ["2026-12-15"]);
});

test("parcelada fora do cartão com dia 31 mantém o dia original (clamp por mês)", () => {
  const e = makeExpense({
    amount: 300,
    dueDate: "2026-10-31",
    isInstallment: true,
    installmentMonths: 3,
    installmentStartMonth: "2027-02",
  });
  assert.deepEqual(dates(getExpenseOccurrences(e, { start: "2027-01-01", end: "2027-12-31" })), [
    "2027-02-28",
    "2027-03-31",
    "2027-04-30",
  ]);
});

test("recorrente + parcelada weekly intervalo 4: cada ciclo inicia uma série mensal", () => {
  const e = makeExpense({
    amount: 300,
    dueDate: "2026-11-02",
    purchaseDate: "2026-11-02",
    recurring: true,
    frequency: Frequency.WEEKLY,
    recurringWeeksInterval: 4,
    isInstallment: true,
    installmentMonths: 3,
    installmentStartMonth: "2026-11",
  });
  // ciclos: 11-02, 11-30, 12-28, 01-25 ...; parcelas de cada um: C, C+1m, C+2m
  const occ = getExpenseOccurrences(e, { start: "2026-12-20", end: "2027-01-19" });
  assert.deepEqual(dates(occ), ["2026-12-28", "2026-12-30", "2027-01-02"]);
  assert.ok(occ.every((o) => o.amount === 100));
  assert.deepEqual(
    occ.map((o) => o.installment),
    [
      { index: 1, total: 3 }, // ciclo 12-28
      { index: 2, total: 3 }, // ciclo 11-30 -> 12-30
      { index: 3, total: 3 }, // ciclo 11-02 -> 01-02
    ]
  );
});

// --- rendas ------------------------------------------------------------------

test("renda monthly com endDate no meio do período", () => {
  // paga dia 25; termina em 10/dez: 25/nov entra, 25/dez não
  const income = makeIncome({ startDate: "2026-01-25", endDate: "2026-12-10" });
  assert.deepEqual(dates(getIncomeOccurrences(income, RANGE)), ["2026-11-25"]);

  // endDate no mesmo dia do pagamento ainda conta
  const sameDay = makeIncome({ startDate: "2026-01-25", endDate: "2026-11-25" });
  assert.deepEqual(dates(getIncomeOccurrences(sameDay, RANGE)), ["2026-11-25"]);

  const ended = makeIncome({ startDate: "2026-01-25", endDate: "2026-11-24" });
  assert.deepEqual(getIncomeOccurrences(ended, RANGE), []);
});

test("renda one_time: só em startDate", () => {
  const one = makeIncome({ frequency: Frequency.ONE_TIME, startDate: "2026-12-01", amount: 1000 });
  assert.deepEqual(dates(getIncomeOccurrences(one, RANGE)), ["2026-12-01"]);
  assert.deepEqual(getIncomeOccurrences(one, { start: "2026-12-02", end: "2027-01-19" }), []);
});

test("renda inativa ou antes do início não gera ocorrências", () => {
  assert.deepEqual(getIncomeOccurrences(makeIncome({ isActive: false }), RANGE), []);
  assert.deepEqual(getIncomeOccurrences(makeIncome({ startDate: "2027-03-01" }), RANGE), []);
});

test("renda monthly sem endDate repete todo mês", () => {
  const income = makeIncome({ startDate: "2026-01-20", amount: 6000 });
  assert.deepEqual(dates(getIncomeOccurrences(income, RANGE)), ["2026-11-20"]);
  assert.deepEqual(dates(getIncomeOccurrences(income, { start: "2026-12-20", end: "2027-01-19" })), ["2026-12-20"]);
});
