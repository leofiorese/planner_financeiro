import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLocalDate,
  toLocalISODate,
  toLocalISOMonth,
  todayLocalISO,
  daysInMonth,
  clampDay,
  addMonthsClamped,
  addDays,
  addDaysISO,
  diffInDays,
  diffInDaysISO,
  compareISO,
  isWithinISO,
} from "../utils/dates";

// Estes testes não dependem do TZ do host: tudo usa componentes locais.
// Para validar no fuso do usuário: TZ=America/Sao_Paulo npm test (bash) ou
// $env:TZ="America/Sao_Paulo"; npm test (PowerShell).

test("parseLocalDate: YYYY-MM-DD vira dia/mês locais corretos", () => {
  const d = parseLocalDate("2026-12-01");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 11);
  assert.equal(d.getDate(), 1);
  assert.equal(d.getHours(), 0);
});

test("parseLocalDate: YYYY-MM vira dia 1", () => {
  const d = parseLocalDate("2026-03");
  assert.equal(toLocalISODate(d), "2026-03-01");
});

test("parseLocalDate: ISO completo usa só a parte da data", () => {
  assert.equal(toLocalISODate(parseLocalDate("2026-11-20T23:30:00.000Z")), "2026-11-20");
  assert.equal(toLocalISODate(parseLocalDate("2026-11-20T00:00:00Z")), "2026-11-20");
});

test("parseLocalDate: entrada inválida devolve Date inválido", () => {
  assert.ok(Number.isNaN(parseLocalDate("abc").getTime()));
  assert.ok(Number.isNaN(parseLocalDate("").getTime()));
});

test("toLocalISODate / toLocalISOMonth fazem round-trip", () => {
  assert.equal(toLocalISODate(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(toLocalISOMonth(new Date(2026, 0, 5)), "2026-01");
  assert.equal(toLocalISODate(parseLocalDate("2026-02-28")), "2026-02-28");
});

test("todayLocalISO tem formato YYYY-MM-DD e bate com a data local", () => {
  const now = new Date();
  assert.match(todayLocalISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayLocalISO(), toLocalISODate(now));
});

test("daysInMonth: bissexto e não bissexto", () => {
  assert.equal(daysInMonth(2024, 1), 29);
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2026, 0), 31);
  assert.equal(daysInMonth(2026, 3), 30);
  assert.equal(daysInMonth(2000, 1), 29);
  assert.equal(daysInMonth(2100, 1), 28);
});

test("clampDay: 31 em fevereiro (bissexto e não bissexto)", () => {
  assert.equal(toLocalISODate(clampDay(2026, 1, 31)), "2026-02-28");
  assert.equal(toLocalISODate(clampDay(2028, 1, 31)), "2028-02-29");
  assert.equal(toLocalISODate(clampDay(2026, 3, 31)), "2026-04-30");
  assert.equal(toLocalISODate(clampDay(2026, 0, 15)), "2026-01-15");
});

test("clampDay: monthIndex fora de 0-11 é normalizado", () => {
  assert.equal(toLocalISODate(clampDay(2026, 12, 31)), "2027-01-31");
  assert.equal(toLocalISODate(clampDay(2026, -1, 31)), "2025-12-31");
});

test("addMonthsClamped: 2026-01-31 + 1 mês = 2026-02-28", () => {
  assert.equal(toLocalISODate(addMonthsClamped(parseLocalDate("2026-01-31"), 1)), "2026-02-28");
  assert.equal(toLocalISODate(addMonthsClamped(parseLocalDate("2028-01-31"), 1)), "2028-02-29");
});

test("addMonthsClamped: virada de ano e meses negativos", () => {
  assert.equal(toLocalISODate(addMonthsClamped(parseLocalDate("2026-12-15"), 1)), "2027-01-15");
  assert.equal(toLocalISODate(addMonthsClamped(parseLocalDate("2026-01-15"), -1)), "2025-12-15");
  assert.equal(toLocalISODate(addMonthsClamped(parseLocalDate("2026-11-30"), 15)), "2028-02-29");
});

test("addMonthsClamped: série a partir da âncora preserva o dia original", () => {
  const anchor = parseLocalDate("2026-01-31");
  const series = [0, 1, 2, 3].map((k) => toLocalISODate(addMonthsClamped(anchor, k)));
  assert.deepEqual(series, ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
});

test("addDays: atravessa mês e ano", () => {
  assert.equal(toLocalISODate(addDays(parseLocalDate("2026-12-31"), 1)), "2027-01-01");
  assert.equal(toLocalISODate(addDays(parseLocalDate("2026-03-01"), -1)), "2026-02-28");
  assert.equal(addDaysISO("2026-11-20", -1), "2026-11-19");
  assert.equal(addDaysISO("2026-01-31", 30), "2026-03-02");
});

test("diffInDays: ignora horário de verão e horário do dia", () => {
  assert.equal(diffInDays(parseLocalDate("2026-11-20"), parseLocalDate("2026-11-21")), 1);
  assert.equal(diffInDays(parseLocalDate("2026-11-20"), parseLocalDate("2026-11-20")), 0);
  assert.equal(diffInDays(parseLocalDate("2026-11-21"), parseLocalDate("2026-11-20")), -1);
  // Atravessa a mudança de DST dos EUA/Europa: continua sendo 7 dias
  assert.equal(diffInDaysISO("2026-03-05", "2026-03-12"), 7);
  assert.equal(diffInDaysISO("2026-10-20", "2026-11-05"), 16);
  assert.equal(diffInDays(new Date(2026, 5, 1, 23, 59), new Date(2026, 5, 2, 0, 1)), 1);
  assert.equal(diffInDaysISO("2026-01-01", "2027-01-01"), 365);
});

test("compareISO e isWithinISO", () => {
  assert.equal(compareISO("2026-11-19", "2026-11-20"), -1);
  assert.equal(compareISO("2026-11-20", "2026-11-20"), 0);
  assert.equal(compareISO("2027-01-01", "2026-12-31"), 1);
  assert.equal(isWithinISO("2026-11-20", "2026-11-20", "2026-12-19"), true);
  assert.equal(isWithinISO("2026-12-19", "2026-11-20", "2026-12-19"), true);
  assert.equal(isWithinISO("2026-11-19", "2026-11-20", "2026-12-19"), false);
  assert.equal(isWithinISO("2026-12-20", "2026-11-20", "2026-12-19"), false);
});
