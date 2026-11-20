import test from "node:test";
import assert from "node:assert/strict";
import { getGoalBudgetFormError } from "../../utils/budget/goalForm";
import { GoalType } from "../../types";

test("open-ended com reserva ligada e sem valor manual não salva", () => {
  for (const override of [null, undefined, Number.NaN, -1]) {
    assert.ok(
      getGoalBudgetFormError({
        goalType: GoalType.OPEN_ENDED,
        reserveFromBudget: true,
        budgetReserveOverride: override as number | null | undefined,
      })
    );
  }
});

test("open-ended com valor manual (inclusive 0) é válida", () => {
  assert.equal(
    getGoalBudgetFormError({ goalType: GoalType.OPEN_ENDED, reserveFromBudget: true, budgetReserveOverride: 300 }),
    null
  );
  assert.equal(
    getGoalBudgetFormError({ goalType: GoalType.OPEN_ENDED, reserveFromBudget: true, budgetReserveOverride: 0 }),
    null
  );
});

test("sem reserva ligada, ou meta de valor fixo, não exige override", () => {
  assert.equal(
    getGoalBudgetFormError({ goalType: GoalType.OPEN_ENDED, reserveFromBudget: false, budgetReserveOverride: null }),
    null
  );
  assert.equal(
    getGoalBudgetFormError({ goalType: GoalType.FIXED_AMOUNT, reserveFromBudget: true, budgetReserveOverride: null }),
    null
  );
});
