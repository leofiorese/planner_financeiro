import test from "node:test";
import assert from "node:assert/strict";
import {
  annualize,
  averageMonthlyNetFlow,
  classReturns,
  monthlyToAnnual,
  periodReturn,
  portfolioReturns,
} from "../../utils/investments/returns";
import { CLASSES, approx, entry, snap } from "./helpers";

test("periodReturn: Modified Dietz com aporte, resgate e sem fluxo", () => {
  approx(periodReturn(1000, 1100, 0), 0.1);
  // aporte de 100: (1110 − 1000 − 100) / (1000 + 50)
  approx(periodReturn(1000, 1110, 100), 10 / 1050);
  // resgate de 200: (850 − 1000 + 200) / (1000 − 100)
  approx(periodReturn(1000, 850, -200), 50 / 900);
  // aporte sem rendimento = 0%, não retorno inflado
  approx(periodReturn(1000, 1100, 100), 0);
});

test("periodReturn: sem capital exposto é null", () => {
  assert.equal(periodReturn(0, 0, 0), null);
  assert.equal(periodReturn(0, 100, 0), null);
  assert.equal(periodReturn(100, 0, -200), null);
});

test("annualize e monthlyToAnnual", () => {
  approx(annualize(0.1, 12), 0.1);
  approx(annualize(0.1, 6), Math.pow(1.1, 2) - 1);
  assert.equal(annualize(0.1, 0), null);
  assert.equal(annualize(-1, 3), -1);
  approx(monthlyToAnnual(0.01), Math.pow(1.01, 12) - 1);
});

const series = [
  snap("2026-01", [entry("a", 1000), entry("b", 500)]),
  snap("2026-02", [entry("a", 1050), entry("b", 550)]),
  snap("2026-03", [entry("a", 1100), entry("b", 600)]),
];

test("portfolioReturns: encadeia retornos mensais e anualiza", () => {
  const r = portfolioReturns(series);
  assert.equal(r.points.length, 2);
  approx(r.points[0].periodReturn, 100 / 1500);
  approx(r.points[1].periodReturn, 100 / 1600);
  const acc = (1 + 100 / 1500) * (1 + 100 / 1600) - 1;
  approx(r.accumulated, acc);
  approx(r.points[1].accumulated, acc);
  assert.equal(r.months, 2);
  approx(r.annualized, Math.pow(1 + acc, 6) - 1);
  approx(r.totalGain, 200);
});

test("a ordem de entrada dos lançamentos não importa", () => {
  const shuffled = [series[2], series[0], series[1]];
  approx(portfolioReturns(shuffled).accumulated, portfolioReturns(series).accumulated as number);
});

test("um único lançamento (ou nenhum) não tem retorno", () => {
  const one = portfolioReturns([series[0]]);
  assert.deepEqual(one.points, []);
  assert.equal(one.accumulated, null);
  assert.equal(one.annualized, null);
  assert.equal(portfolioReturns([]).accumulated, null);
});

test("meses sem lançamento: o período cobre os meses do intervalo", () => {
  const r = portfolioReturns([snap("2026-01", [entry("a", 1000)]), snap("2026-04", [entry("a", 1100)])]);
  assert.equal(r.points[0].periodMonths, 3);
  assert.equal(r.months, 3);
  approx(r.annualized, Math.pow(1.1, 4) - 1);
});

test("aportes não viram rentabilidade", () => {
  const r = portfolioReturns([
    snap("2026-01", [entry("a", 1000)]),
    snap("2026-02", [entry("a", 2000, 1000)]), // só aportou 1000, nada rendeu
  ]);
  approx(r.accumulated, 0);
  approx(r.totalGain, 0);
  assert.equal(r.totalContributions, 1000);
});

test("classReturns: classe folha, categoria (soma das folhas) e classe sem lançamentos", () => {
  const a = classReturns(series, "a", CLASSES);
  approx(a.points[0].periodReturn, 0.05);
  approx(a.points[1].periodReturn, 50 / 1050);
  // categoria r = a + b = a carteira inteira neste cenário
  approx(classReturns(series, "r", CLASSES).accumulated, portfolioReturns(series).accumulated as number);
  // classe sem entradas: sem capital exposto
  const none = classReturns(series, "c", CLASSES);
  assert.equal(none.accumulated, null);
});

test("período sem capital é ignorado, e o seguinte usa o saldo formado", () => {
  const r = classReturns(
    [
      snap("2026-01", [entry("a", 1000)]),
      snap("2026-02", [entry("a", 1000), entry("b", 0)]),
      snap("2026-03", [entry("a", 1000), entry("b", 100, 100)]), // b nasce com aporte
      snap("2026-04", [entry("a", 1000), entry("b", 110)]),
    ],
    "b",
    CLASSES,
  );
  assert.equal(r.points[0].periodReturn, null);
  approx(r.points[1].periodReturn, 0); // aportou 100 e vale 100
  approx(r.points[2].periodReturn, 10 / 100);
  approx(r.accumulated, 0.1);
  assert.equal(r.months, 2);
});

test("averageMonthlyNetFlow: média dos últimos N períodos, ponderada por meses", () => {
  const r = portfolioReturns([
    snap("2026-01", [entry("a", 1000)]),
    snap("2026-02", [entry("a", 1100, 100)]),
    snap("2026-03", [entry("a", 1400, 200)]),
    snap("2026-05", [entry("a", 1900, 400, 100)]), // 2 meses, líquido 300
  ]);
  approx(averageMonthlyNetFlow(r), (100 + 200 + 300) / 4);
  approx(averageMonthlyNetFlow(r, 1), 150);
  assert.equal(averageMonthlyNetFlow(portfolioReturns([])), 0);
});
