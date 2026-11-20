import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultBudget,
  createdAtToLocalDate,
  normalizeBudget,
  withBackfilledPurchaseDate,
  withBudgetGoalDefaults,
} from "../../utils/budget/normalize";
import { PaymentMethod } from "../../types";
import { toLocalISODate } from "../../utils/dates";

test("createDefaultBudget: desativado, dia 1, sem histórico", () => {
  assert.deepEqual(createDefaultBudget(), {
    enabled: false,
    rolloverDay: 1,
    enabledAt: "",
    amountHistory: [],
    periodClosures: [],
  });
});

test("normalizeBudget: undefined/lixo vira default", () => {
  assert.deepEqual(normalizeBudget(undefined), createDefaultBudget());
  assert.deepEqual(normalizeBudget(null), createDefaultBudget());
  assert.deepEqual(normalizeBudget("x"), createDefaultBudget());
});

test("normalizeBudget: clampa o dia, ordena o histórico e zera alocações de pulados", () => {
  const b = normalizeBudget({
    enabled: 1,
    rolloverDay: 99,
    enabledAt: "2026-11-20",
    amountHistory: [
      { amount: "4500", effectiveFrom: "2026-11-20" },
      { amount: 5000, effectiveFrom: "2026-10-20" },
      { amount: 1, effectiveFrom: "" },
    ],
    periodClosures: [
      {
        periodStart: "2026-10-20",
        periodEnd: "2026-11-19",
        status: "skipped",
        income: 1,
        spent: 2,
        budgetAmount: 3,
        allocations: [{ goalId: "g", amount: 5 }],
        closedAt: "2026-11-20T10:00:00.000Z",
      },
      { periodStart: 1, periodEnd: "x" },
    ],
  });
  assert.equal(b.enabled, true);
  assert.equal(b.rolloverDay, 31);
  assert.deepEqual(b.amountHistory, [
    { amount: 5000, effectiveFrom: "2026-10-20" },
    { amount: 4500, effectiveFrom: "2026-11-20" },
  ]);
  assert.equal(b.periodClosures.length, 1);
  assert.deepEqual(b.periodClosures[0].allocations, []);
});

test("normalizeBudget: dia inválido volta para 1", () => {
  assert.equal(normalizeBudget({ rolloverDay: "abc" }).rolloverDay, 1);
  assert.equal(normalizeBudget({ rolloverDay: 0 }).rolloverDay, 1);
});

test("createdAtToLocalDate: sem horário usa a própria data; com horário usa o dia local", () => {
  assert.equal(createdAtToLocalDate("2026-11-09"), "2026-11-09");
  assert.equal(createdAtToLocalDate(undefined), undefined);
  assert.equal(createdAtToLocalDate(""), undefined);
  const iso = "2026-11-10T01:30:00.000Z";
  assert.equal(createdAtToLocalDate(iso), toLocalISODate(new Date(iso)));
});

test("withBackfilledPurchaseDate: só despesas de cartão sem purchaseDate", () => {
  const card = { paymentMethod: PaymentMethod.CREDIT_CARD, createdAt: "2026-11-09" };
  assert.equal(withBackfilledPurchaseDate(card).purchaseDate, "2026-11-09");

  const cardWith = { ...card, purchaseDate: "2026-11-01" };
  assert.equal(withBackfilledPurchaseDate(cardWith).purchaseDate, "2026-11-01");

  const pix = { paymentMethod: PaymentMethod.PIX, createdAt: "2026-11-09" };
  assert.equal(withBackfilledPurchaseDate(pix).purchaseDate, undefined);
});

test("withBudgetGoalDefaults: opt-in desligado e override automático", () => {
  assert.deepEqual(withBudgetGoalDefaults({}), { reserveFromBudget: false, budgetReserveOverride: null });
  assert.deepEqual(withBudgetGoalDefaults({ reserveFromBudget: true, budgetReserveOverride: 250 }), {
    reserveFromBudget: true,
    budgetReserveOverride: 250,
  });
  assert.equal(withBudgetGoalDefaults({ budgetReserveOverride: undefined }).budgetReserveOverride, null);
});
