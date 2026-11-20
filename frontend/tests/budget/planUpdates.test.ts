import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBudgetAmount,
  applyBudgetClosure,
  applyBudgetSettings,
} from "../../utils/budget/planUpdates";
import { getBudgetAmountForPeriod, getPendingClosure } from "../../utils/budget/budgetCalculator";
import { getPeriodForDate } from "../../utils/budget/period";
import { enhancedFinancialReducer } from "../../context/reducer";
import * as actions from "../../context/actions";
import { createFreshInitialState } from "../../context/initialState";
import { createDefaultBudget, normalizeBudget } from "../../utils/budget/normalize";
import { makeBudget, makeGoal, makePlan } from "./helpers";

const TODAY = "2026-11-25";

test("settings: primeira ativação grava enabledAt = hoje; reativar mantém o original", () => {
  const plan = makePlan({ budget: createDefaultBudget() });
  const on = applyBudgetSettings(plan, { enabled: true, rolloverDay: 20 }, TODAY);
  assert.equal(on.budget?.enabled, true);
  assert.equal(on.budget?.rolloverDay, 20);
  assert.equal(on.budget?.enabledAt, TODAY);

  const off = applyBudgetSettings(on, { enabled: false, rolloverDay: 20 }, "2026-12-01");
  assert.equal(off.budget?.enabled, false);
  assert.equal(off.budget?.enabledAt, TODAY);

  const again = applyBudgetSettings(off, { enabled: true, rolloverDay: 20 }, "2027-03-01");
  assert.equal(again.budget?.enabledAt, TODAY);
});

test("settings: desativado não define enabledAt; plano sem budget usa defaults", () => {
  const plan = makePlan();
  delete plan.budget;
  const out = applyBudgetSettings(plan, { enabled: false, rolloverDay: 5 }, TODAY);
  assert.equal(out.budget?.enabledAt, "");
  assert.equal(out.budget?.rolloverDay, 5);
});

test("settings: dia de virada é limitado a 1-31", () => {
  const plan = makePlan();
  assert.equal(applyBudgetSettings(plan, { enabled: true, rolloverDay: 99 }, TODAY).budget?.rolloverDay, 31);
  assert.equal(applyBudgetSettings(plan, { enabled: true, rolloverDay: 0 }, TODAY).budget?.rolloverDay, 1);
});

test("settings: trocar o dia de virada preserva o Y vigente no novo período atual", () => {
  const plan = makePlan({
    budget: makeBudget({
      rolloverDay: 20,
      amountHistory: [
        { amount: 5000, effectiveFrom: "2026-09-20" },
        { amount: 4500, effectiveFrom: "2026-11-20" },
      ],
    }),
  });
  const out = applyBudgetSettings(plan, { enabled: true, rolloverDay: 1 }, TODAY);
  const newPeriod = getPeriodForDate(TODAY, 1);
  assert.deepEqual(newPeriod, { start: "2026-11-01", end: "2026-11-30" });
  assert.equal(getBudgetAmountForPeriod(out.budget!.amountHistory, newPeriod), 4500);
  // entradas antigas intactas
  assert.equal(out.budget!.amountHistory.some((e) => e.effectiveFrom === "2026-09-20" && e.amount === 5000), true);
});

test("settings: sem mudar o dia, o histórico não é tocado", () => {
  const plan = makePlan();
  const out = applyBudgetSettings(plan, { enabled: true, rolloverDay: 20 }, TODAY);
  assert.deepEqual(out.budget?.amountHistory, plan.budget?.amountHistory);
});

test("amount: adiciona entrada no início do período atual", () => {
  const plan = makePlan({ budget: makeBudget({ amountHistory: [{ amount: 5000, effectiveFrom: "2026-09-20" }] }) });
  const out = applyBudgetAmount(plan, 4500, TODAY);
  assert.deepEqual(out.budget?.amountHistory, [
    { amount: 5000, effectiveFrom: "2026-09-20" },
    { amount: 4500, effectiveFrom: "2026-11-20" },
  ]);
  // período anterior mantém o Y antigo
  assert.equal(getBudgetAmountForPeriod(out.budget!.amountHistory, { start: "2026-10-20", end: "2026-11-19" }), 5000);
});

test("amount: substitui a entrada que já começa no período atual", () => {
  const plan = makePlan({
    budget: makeBudget({
      amountHistory: [
        { amount: 5000, effectiveFrom: "2026-09-20" },
        { amount: 4500, effectiveFrom: "2026-11-20" },
      ],
    }),
  });
  const out = applyBudgetAmount(plan, 4000, TODAY);
  assert.equal(out.budget?.amountHistory.length, 2);
  assert.equal(out.budget?.amountHistory[1].amount, 4000);
});

test("amount: valor inválido não altera nada", () => {
  const plan = makePlan();
  assert.equal(applyBudgetAmount(plan, Number.NaN, TODAY), plan);
  assert.equal(applyBudgetAmount(plan, -5, TODAY), plan);
});

const closure = (overrides = {}) => ({
  periodStart: "2026-10-20",
  periodEnd: "2026-11-19",
  status: "confirmed" as const,
  income: 6000,
  spent: 4380,
  budgetAmount: 5000,
  allocations: [
    { goalId: "g1", amount: 1000 },
    { goalId: "g2", amount: 500.5 },
  ],
  closedAt: "2026-11-20T12:00:00.000Z",
  ...overrides,
});

test("fechamento confirmado soma as alocações em goal.currentAmount e grava o closure", () => {
  const plan = makePlan({
    goals: [
      makeGoal({ id: "g1", currentAmount: 100 }),
      makeGoal({ id: "g2", currentAmount: 0 }),
      makeGoal({ id: "g3", currentAmount: 7 }),
    ],
  });
  const out = applyBudgetClosure(plan, closure(), [], "2026-11-25T10:00:00.000Z");
  assert.equal(out.goals.find((g) => g.id === "g1")?.currentAmount, 1100);
  assert.equal(out.goals.find((g) => g.id === "g2")?.currentAmount, 500.5);
  assert.equal(out.goals.find((g) => g.id === "g3")?.currentAmount, 7);
  assert.equal(out.goals.find((g) => g.id === "g1")?.updatedAt, "2026-11-25T10:00:00.000Z");
  assert.equal(out.goals.find((g) => g.id === "g3")?.updatedAt, "2026-01-01"); // intacta
  assert.equal(out.budget?.periodClosures.length, 1);
});

test("fechamento pulado não mexe nas metas e zera as alocações", () => {
  const plan = makePlan({ goals: [makeGoal({ id: "g1", currentAmount: 100 })] });
  const out = applyBudgetClosure(plan, closure({ status: "skipped" }), [], "2026-11-25T10:00:00.000Z");
  assert.equal(out.goals[0].currentAmount, 100);
  assert.deepEqual(out.budget?.periodClosures[0].allocations, []);
  assert.equal(out.budget?.periodClosures[0].status, "skipped");
});

test("fechamento registra os períodos mais antigos como skipped", () => {
  const plan = makePlan({ goals: [makeGoal({ id: "g1", currentAmount: 0 }), makeGoal({ id: "g2" })] });
  const older = [
    { start: "2026-08-20", end: "2026-09-19" },
    { start: "2026-09-20", end: "2026-10-19" },
  ];
  const out = applyBudgetClosure(plan, closure(), older, "2026-11-25T10:00:00.000Z");
  const closures = out.budget!.periodClosures;
  assert.deepEqual(
    closures.map((c) => [c.periodStart, c.status]),
    [
      ["2026-08-20", "skipped"],
      ["2026-09-20", "skipped"],
      ["2026-10-20", "confirmed"],
    ]
  );
  assert.ok(closures.slice(0, 2).every((c) => c.allocations.length === 0));
});

test("fechamento é idempotente: confirmar de novo o mesmo período não soma duas vezes", () => {
  const plan = makePlan({ goals: [makeGoal({ id: "g1", currentAmount: 0 }), makeGoal({ id: "g2" })] });
  const once = applyBudgetClosure(plan, closure(), [], "2026-11-25T10:00:00.000Z");
  const twice = applyBudgetClosure(once, closure(), [], "2026-11-25T10:05:00.000Z");
  assert.equal(twice, once);
  assert.equal(twice.goals.find((g) => g.id === "g1")?.currentAmount, 1000);
});

test("fechamento ignora alocação para meta inexistente", () => {
  const plan = makePlan({ goals: [makeGoal({ id: "g1", currentAmount: 0 })] });
  const out = applyBudgetClosure(plan, closure(), [], "2026-11-25T10:00:00.000Z");
  assert.equal(out.goals.length, 1);
  assert.equal(out.goals[0].currentAmount, 1000);
});

test("fluxo completo: três pendentes, confirma o mais recente, os outros ficam skipped e nada volta após o 'reload'", () => {
  const plan = makePlan({
    budget: makeBudget({ enabledAt: "2026-08-25" }),
    goals: [makeGoal({ id: "g1", currentAmount: 0 })],
  });
  const pending = getPendingClosure(plan, "2026-11-25");
  assert.ok(pending);
  assert.equal(pending.olderToSkip.length, 2);

  const confirmed = applyBudgetClosure(
    plan,
    closure({
      periodStart: pending.period.start,
      periodEnd: pending.period.end,
      allocations: [{ goalId: "g1", amount: 300 }],
    }),
    pending.olderToSkip,
    "2026-11-25T10:00:00.000Z"
  );
  assert.equal(confirmed.goals[0].currentAmount, 300);
  assert.deepEqual(
    confirmed.budget!.periodClosures.map((c) => c.status),
    ["skipped", "skipped", "confirmed"]
  );
  assert.equal(getPendingClosure(confirmed, "2026-11-25"), null);

  // "reload": o plano passa por JSON + normalização do carregamento
  const reloaded = { ...confirmed, budget: normalizeBudget(JSON.parse(JSON.stringify(confirmed.budget))) };
  assert.equal(getPendingClosure(reloaded, "2026-11-25"), null);
  assert.equal(reloaded.goals[0].currentAmount, 300);
});

// --- reducer -------------------------------------------------------------------

test("reducer: SET_BUDGET_SETTINGS + SET_BUDGET_AMOUNT + CLOSE_BUDGET_PERIOD", () => {
  let state = createFreshInitialState();
  state = { ...state, userPlan: { ...state.userPlan, goals: [makeGoal({ id: "g1", currentAmount: 10 })] } };

  state = enhancedFinancialReducer(state, actions.setBudgetSettings({ enabled: true, rolloverDay: 20 }, TODAY));
  assert.equal(state.userPlan.budget?.enabled, true);
  assert.equal(state.userPlan.budget?.enabledAt, TODAY);
  assert.equal(state.hasUnsavedChanges, true);

  state = enhancedFinancialReducer(state, actions.setBudgetAmount(5000, TODAY));
  assert.deepEqual(state.userPlan.budget?.amountHistory, [{ amount: 5000, effectiveFrom: "2026-11-20" }]);

  state = enhancedFinancialReducer(
    state,
    actions.closeBudgetPeriod(
      closure({ allocations: [{ goalId: "g1", amount: 250 }] }),
      [],
      "2026-12-21T09:00:00.000Z"
    )
  );
  assert.equal(state.userPlan.goals[0].currentAmount, 260);
  assert.equal(state.userPlan.budget?.periodClosures.length, 1);
});
