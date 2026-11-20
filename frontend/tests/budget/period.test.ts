import test from "node:test";
import assert from "node:assert/strict";
import {
  countPeriodsBetween,
  formatPeriodLabel,
  getDaysRemaining,
  getPeriodByOffset,
  getPeriodForDate,
  listPeriods,
} from "../../utils/budget/period";
import { addDaysISO } from "../../utils/dates";

const P = (start: string, end: string) => ({ start, end });

test("D=1: período é o mês-calendário", () => {
  assert.deepEqual(getPeriodForDate("2026-11-15", 1), P("2026-11-01", "2026-11-30"));
  assert.deepEqual(getPeriodForDate("2026-12-31", 1), P("2026-12-01", "2026-12-31"));
  assert.deepEqual(getPeriodForDate("2027-02-10", 1), P("2027-02-01", "2027-02-28"));
  assert.deepEqual(getPeriodForDate("2028-02-10", 1), P("2028-02-01", "2028-02-29")); // bissexto
});

test("D=20: de 20 a 19, com virada de ano", () => {
  assert.deepEqual(getPeriodForDate("2026-11-25", 20), P("2026-11-20", "2026-12-19"));
  assert.deepEqual(getPeriodForDate("2026-12-15", 20), P("2026-11-20", "2026-12-19"));
  assert.deepEqual(getPeriodForDate("2027-01-10", 20), P("2026-12-20", "2027-01-19"));
  assert.deepEqual(getPeriodForDate("2026-01-05", 20), P("2025-12-20", "2026-01-19"));
});

test("data igual ao início e igual ao fim pertencem ao próprio período", () => {
  assert.deepEqual(getPeriodForDate("2026-11-20", 20), P("2026-11-20", "2026-12-19"));
  assert.deepEqual(getPeriodForDate("2026-12-19", 20), P("2026-11-20", "2026-12-19"));
  assert.deepEqual(getPeriodForDate("2026-11-19", 20), P("2026-10-20", "2026-11-19"));
  assert.deepEqual(getPeriodForDate("2026-12-20", 20), P("2026-12-20", "2027-01-19"));
});

test("D=31: usa o último dia do mês (fevereiro não bissexto)", () => {
  // 2027 não é bissexto: jan 31 – fev 27 · fev 28 – mar 30 · mar 31 – abr 29
  assert.deepEqual(getPeriodForDate("2027-02-10", 31), P("2027-01-31", "2027-02-27"));
  assert.deepEqual(getPeriodForDate("2027-02-28", 31), P("2027-02-28", "2027-03-30"));
  assert.deepEqual(getPeriodForDate("2027-03-30", 31), P("2027-02-28", "2027-03-30"));
  assert.deepEqual(getPeriodForDate("2027-03-31", 31), P("2027-03-31", "2027-04-29"));
  assert.deepEqual(getPeriodForDate("2027-04-29", 31), P("2027-03-31", "2027-04-29"));
  assert.deepEqual(getPeriodForDate("2027-04-30", 31), P("2027-04-30", "2027-05-30"));
});

test("D=31 em fevereiro bissexto", () => {
  assert.deepEqual(getPeriodForDate("2028-02-15", 31), P("2028-01-31", "2028-02-28"));
  assert.deepEqual(getPeriodForDate("2028-02-29", 31), P("2028-02-29", "2028-03-30"));
});

test("D=29 e D=30 em fevereiro", () => {
  assert.deepEqual(getPeriodForDate("2027-03-01", 29), P("2027-02-28", "2027-03-28"));
  assert.deepEqual(getPeriodForDate("2028-03-01", 29), P("2028-02-29", "2028-03-28"));
  assert.deepEqual(getPeriodForDate("2027-03-01", 30), P("2027-02-28", "2027-03-29"));
  assert.deepEqual(getPeriodForDate("2027-01-30", 30), P("2027-01-30", "2027-02-27"));
});

test("offset -1 e +1", () => {
  assert.deepEqual(getPeriodByOffset("2026-11-25", 20, -1), P("2026-10-20", "2026-11-19"));
  assert.deepEqual(getPeriodByOffset("2026-11-25", 20, 1), P("2026-12-20", "2027-01-19"));
  assert.deepEqual(getPeriodByOffset("2026-11-25", 20, 0), P("2026-11-20", "2026-12-19"));
  assert.deepEqual(getPeriodByOffset("2026-12-25", 20, 1), P("2027-01-20", "2027-02-19"));
  assert.deepEqual(getPeriodByOffset("2026-01-25", 20, -1), P("2025-12-20", "2026-01-19"));
  assert.deepEqual(getPeriodByOffset("2027-03-10", 31, -1), P("2027-01-31", "2027-02-27"));
});

test("offset parte do período que contém a data (não do mês da data)", () => {
  // 2026-11-10 está no período que começou em 20/out
  assert.deepEqual(getPeriodByOffset("2026-11-10", 20, 0), P("2026-10-20", "2026-11-19"));
  assert.deepEqual(getPeriodByOffset("2026-11-10", 20, 1), P("2026-11-20", "2026-12-19"));
});

test("listPeriods: do mais antigo ao mais novo", () => {
  assert.deepEqual(listPeriods("2026-11-25", 20, 3), [
    P("2026-09-20", "2026-10-19"),
    P("2026-10-20", "2026-11-19"),
    P("2026-11-20", "2026-12-19"),
  ]);
});

test("listPeriods(12): contíguos e sem sobreposição, para vários D", () => {
  for (const D of [1, 20, 29, 30, 31]) {
    const periods = listPeriods("2027-03-15", D, 12);
    assert.equal(periods.length, 12);
    for (let i = 1; i < periods.length; i++) {
      assert.equal(periods[i].start, addDaysISO(periods[i - 1].end, 1), `D=${D} i=${i}`);
      assert.ok(periods[i].start <= periods[i].end);
    }
    const last = periods[periods.length - 1];
    assert.ok("2027-03-15" >= last.start && "2027-03-15" <= last.end, `D=${D} contém a data`);
  }
});

test("countPeriodsBetween: inclusivo", () => {
  const current = P("2026-11-20", "2026-12-19");
  assert.equal(countPeriodsBetween(current, "2026-12-01", 20), 1); // mesmo período
  assert.equal(countPeriodsBetween(current, "2026-12-19", 20), 1);
  assert.equal(countPeriodsBetween(current, "2026-12-20", 20), 2);
  assert.equal(countPeriodsBetween(current, "2027-02-25", 20), 4); // nov, dez, jan, fev
  assert.equal(countPeriodsBetween(current, "2026-10-01", 20), 0); // antes do período
});

test("formatPeriodLabel: pt-BR, mês abreviado minúsculo, ano só quando preciso", () => {
  assert.equal(formatPeriodLabel(P("2026-11-20", "2026-12-19")), "20 nov – 19 dez");
  assert.equal(formatPeriodLabel(P("2026-12-20", "2027-01-19")), "20 dez 2026 – 19 jan 2027");
  assert.equal(formatPeriodLabel(P("2026-11-20", "2026-12-19"), "2026-11-25"), "20 nov – 19 dez");
  assert.equal(formatPeriodLabel(P("2026-11-20", "2026-12-19"), "2027-02-01"), "20 nov 2026 – 19 dez 2026");
  assert.equal(formatPeriodLabel(P("2026-11-01", "2026-11-30")), "1 nov – 30 nov");
});

test("getDaysRemaining: inclui hoje; 0 se passou; período futuro conta inteiro", () => {
  const p = P("2026-11-20", "2026-12-19");
  assert.equal(getDaysRemaining(p, "2026-11-20"), 30);
  assert.equal(getDaysRemaining(p, "2026-11-25"), 25);
  assert.equal(getDaysRemaining(p, "2026-12-19"), 1);
  assert.equal(getDaysRemaining(p, "2026-12-20"), 0);
  assert.equal(getDaysRemaining(p, "2026-11-01"), 30);
});
