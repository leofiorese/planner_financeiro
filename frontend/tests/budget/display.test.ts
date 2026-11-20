import test from "node:test";
import assert from "node:assert/strict";
import { getProgressSegments } from "../../utils/budget/display";

const base = { effectiveBudget: 1000, spent: 0, committed: 0, projectedTotal: 0, percentSpent: 0, level: "ok" as const };

test("segmentos: gasto e comprometido proporcionais ao Y efetivo", () => {
  const s = getProgressSegments({ ...base, spent: 650, committed: 200, projectedTotal: 850, percentSpent: 0.65 });
  assert.equal(s.spentPct, 65);
  assert.equal(s.committedPct, 20);
  assert.equal(s.overBy, 0);
  assert.equal(s.percentLabel, "65%");
  assert.equal(s.ariaNow, 65);
});

test("segmentos: comprometido é cortado para não passar de 100% no total", () => {
  const s = getProgressSegments({ ...base, spent: 900, committed: 500, projectedTotal: 1400, percentSpent: 0.9, level: "warning" });
  assert.equal(s.spentPct, 90);
  assert.equal(s.committedPct, 10);
  assert.equal(s.projectedOverBy, 400);
});

test("segmentos: acima de 100% a barra enche e informa o excesso", () => {
  const s = getProgressSegments({ ...base, spent: 1350, projectedTotal: 1350, percentSpent: 1.35, level: "over" });
  assert.equal(s.spentPct, 100);
  assert.equal(s.committedPct, 0);
  assert.equal(s.overBy, 350);
  assert.equal(s.isOver, true);
  assert.equal(s.percentLabel, "135%");
  assert.equal(s.ariaNow, 100);
});

test("segmentos: sem Y efetivo", () => {
  const withSpend = getProgressSegments({
    ...base,
    effectiveBudget: 0,
    spent: 50,
    projectedTotal: 50,
    percentSpent: Infinity,
    level: "over",
  });
  assert.equal(withSpend.spentPct, 100);
  assert.equal(withSpend.overBy, 50);
  assert.equal(withSpend.percentLabel, ">100%");
  assert.equal(withSpend.ariaNow, 100);

  const empty = getProgressSegments({ ...base, effectiveBudget: 0 });
  assert.equal(empty.spentPct, 0);
  assert.equal(empty.committedPct, 0);
  assert.equal(empty.percentLabel, "0%");

  const onlyCommitted = getProgressSegments({ ...base, effectiveBudget: 0, committed: 10, projectedTotal: 10 });
  assert.equal(onlyCommitted.committedPct, 100);
});
