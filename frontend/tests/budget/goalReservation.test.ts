import test from "node:test";
import assert from "node:assert/strict";
import { getGoalReserve, getSuggestedGoalReserve, getTotalReserve } from "../../utils/budget/goalReservation";
import { GoalType } from "../../types";
import { makeGoal } from "./helpers";

const CURRENT = { start: "2026-11-20", end: "2026-12-19" };
const D = 20;

test("Z: meta com prazo em 4 períodos dá restante / 4", () => {
  // períodos: nov, dez, jan, fev (prazo 25/fev) -> 4
  const goal = makeGoal({ targetAmount: 4000, currentAmount: 0, targetDate: "2027-02-25" });
  assert.equal(getSuggestedGoalReserve(goal, CURRENT, D), 1000);
  assert.equal(getGoalReserve(goal, CURRENT, D), 1000);

  const partial = makeGoal({ targetAmount: 4000, currentAmount: 1600, targetDate: "2027-02-25" });
  assert.equal(getSuggestedGoalReserve(partial, CURRENT, D), 600);
});

test("Z: prazo vencido dá o restante inteiro (1 período)", () => {
  const goal = makeGoal({ targetAmount: 4000, currentAmount: 500, targetDate: "2026-10-01" });
  assert.equal(getSuggestedGoalReserve(goal, CURRENT, D), 3500);
});

test("Z: prazo no período atual dá o restante inteiro", () => {
  const goal = makeGoal({ targetAmount: 900, currentAmount: 0, targetDate: "2026-12-10" });
  assert.equal(getSuggestedGoalReserve(goal, CURRENT, D), 900);
});

test("Z: meta concluída dá 0, mesmo com override", () => {
  const done = makeGoal({ targetAmount: 1000, currentAmount: 1000, budgetReserveOverride: 300 });
  assert.equal(getSuggestedGoalReserve(done, CURRENT, D), 0);
  assert.equal(getGoalReserve(done, CURRENT, D), 0);
  const over = makeGoal({ targetAmount: 1000, currentAmount: 1500 });
  assert.equal(getGoalReserve(over, CURRENT, D), 0);
});

test("Z: open-ended sem override dá 0; com override usa o valor manual", () => {
  const open = makeGoal({ goalType: GoalType.OPEN_ENDED, targetAmount: 0, currentAmount: 0 });
  assert.equal(getSuggestedGoalReserve(open, CURRENT, D), 0);
  assert.equal(getGoalReserve(open, CURRENT, D), 0);

  const withOverride = makeGoal({ goalType: GoalType.OPEN_ENDED, targetAmount: 0, budgetReserveOverride: 250 });
  assert.equal(getGoalReserve(withOverride, CURRENT, D), 250);
});

test("Z: override prevalece sobre o sugerido", () => {
  const goal = makeGoal({ targetAmount: 4000, targetDate: "2027-02-25", budgetReserveOverride: 700 });
  assert.equal(getSuggestedGoalReserve(goal, CURRENT, D), 1000); // o sugerido continua disponível
  assert.equal(getGoalReserve(goal, CURRENT, D), 700);
  const zero = makeGoal({ targetAmount: 4000, targetDate: "2027-02-25", budgetReserveOverride: 0 });
  assert.equal(getGoalReserve(zero, CURRENT, D), 0);
});

test("Z: sem opt-in ou inativa não reserva", () => {
  const noOptIn = makeGoal({ reserveFromBudget: false });
  assert.equal(getGoalReserve(noOptIn, CURRENT, D), 0);
  assert.ok(getSuggestedGoalReserve(noOptIn, CURRENT, D) > 0); // sugestão para pré-visualizar no formulário
  const inactive = makeGoal({ isActive: false });
  assert.equal(getGoalReserve(inactive, CURRENT, D), 0);
});

test("getTotalReserve: soma e detalha só metas ativas com opt-in", () => {
  const a = makeGoal({ id: "a", targetAmount: 4000, targetDate: "2027-02-25" }); // 1000
  const b = makeGoal({ id: "b", targetAmount: 9999, budgetReserveOverride: 500 }); // manual 500
  const c = makeGoal({ id: "c", reserveFromBudget: false });
  const d = makeGoal({ id: "d", isActive: false });
  const e = makeGoal({ id: "e", goalType: GoalType.OPEN_ENDED, targetAmount: 0 }); // opt-in sem valor: 0
  const { total, byGoal } = getTotalReserve([a, b, c, d, e], CURRENT, D);
  assert.equal(total, 1500);
  assert.deepEqual(byGoal, [
    { goalId: "a", amount: 1000, isManual: false },
    { goalId: "b", amount: 500, isManual: true },
    { goalId: "e", amount: 0, isManual: false },
  ]);
});

test("getTotalReserve: sem metas dá 0", () => {
  assert.deepEqual(getTotalReserve([], CURRENT, D), { total: 0, byGoal: [] });
});
