import test from "node:test";
import assert from "node:assert/strict";
import {
  checkFeasibility,
  computeBudgetStatus,
  computeCategoryBreakdown,
  computeClosureSummary,
  computePeriodHistory,
  getBudgetAmountForPeriod,
  getPendingClosure,
  suggestClosureAllocations,
} from "../../utils/budget/budgetCalculator";
import { Frequency } from "../../types";
import { makeBudget, makeExpense, makeGoal, makeIncome, makePlan, oneOff } from "./helpers";

const TODAY = "2026-11-25"; // período atual (D=20): 2026-11-20 .. 2026-12-19
const closeTo = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

// --- Y com histórico ----------------------------------------------------------

test("Y: histórico com troca no meio mantém o valor antigo nos períodos anteriores", () => {
  const history = [
    { amount: 4500, effectiveFrom: "2026-11-20" },
    { amount: 5000, effectiveFrom: "2026-10-20" },
  ];
  assert.equal(getBudgetAmountForPeriod(history, { start: "2026-11-20", end: "2026-12-19" }), 4500);
  assert.equal(getBudgetAmountForPeriod(history, { start: "2026-10-20", end: "2026-11-19" }), 5000);
  assert.equal(getBudgetAmountForPeriod(history, { start: "2026-12-20", end: "2027-01-19" }), 4500);
  assert.equal(getBudgetAmountForPeriod(history, { start: "2026-09-20", end: "2026-10-19" }), 0);
});

test("Y: sem histórico dá 0", () => {
  assert.equal(getBudgetAmountForPeriod([], { start: "2026-11-20", end: "2026-12-19" }), 0);
});

// --- Status -------------------------------------------------------------------

test("status: gasto (≤ hoje) vs comprometido (> hoje)", () => {
  const plan = makePlan({
    expenses: [oneOff("2026-11-22", 1000), oneOff("2026-11-25", 200), oneOff("2026-12-01", 500), oneOff("2026-11-10", 9999)],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.deepEqual(s.period, { start: "2026-11-20", end: "2026-12-19" });
  assert.equal(s.label, "20 nov – 19 dez");
  assert.equal(s.budgetAmount, 5000);
  assert.equal(s.reserveTotal, 0);
  assert.equal(s.effectiveBudget, 5000);
  assert.equal(s.spent, 1200); // inclui hoje
  assert.equal(s.committed, 500);
  assert.equal(s.projectedTotal, 1700);
  closeTo(s.percentSpent, 0.24);
  closeTo(s.percentProjected, 0.34);
  assert.equal(s.level, "ok");
  assert.equal(s.daysRemaining, 25);
  closeTo(s.dailyAllowance, (5000 - 1700) / 25);
  assert.equal(s.isCurrent, true);
  assert.equal(s.isPast, false);
  assert.equal(s.enabled, true);
});

test("status: limiares 79,9% / 80% / 100% / 100,1%", () => {
  const history = [{ amount: 1000, effectiveFrom: "2026-09-20" }];
  const levelFor = (amount: number) =>
    computeBudgetStatus(
      makePlan({ budget: makeBudget({ amountHistory: history }), expenses: [oneOff("2026-11-22", amount)] }),
      TODAY
    ).level;
  assert.equal(levelFor(799), "ok"); // 79,9%
  assert.equal(levelFor(800), "warning"); // 80%
  assert.equal(levelFor(999), "warning");
  assert.equal(levelFor(1000), "over"); // 100%
  assert.equal(levelFor(1001), "over"); // 100,1%
});

test("status: o nível usa o gasto, não o comprometido", () => {
  const plan = makePlan({
    budget: makeBudget({ amountHistory: [{ amount: 1000, effectiveFrom: "2026-09-20" }] }),
    expenses: [oneOff("2026-11-22", 100), oneOff("2026-12-05", 2000)],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.level, "ok");
  assert.ok(s.percentProjected > 1);
});

test("status: dailyAllowance nunca é negativa", () => {
  const plan = makePlan({
    budget: makeBudget({ amountHistory: [{ amount: 1000, effectiveFrom: "2026-09-20" }] }),
    expenses: [oneOff("2026-11-22", 3000)],
  });
  assert.equal(computeBudgetStatus(plan, TODAY).dailyAllowance, 0);
});

test("status: Y efetivo = Y − ΣZ e reservas por meta", () => {
  const plan = makePlan({
    goals: [
      makeGoal({ id: "g1", targetAmount: 4000, targetDate: "2027-02-25" }), // 1000
      makeGoal({ id: "g2", budgetReserveOverride: 500 }),
    ],
    expenses: [oneOff("2026-11-22", 1500)],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.reserveTotal, 1500);
  assert.equal(s.effectiveBudget, 3500);
  assert.deepEqual(s.reserves, [
    { goalId: "g1", amount: 1000, isManual: false },
    { goalId: "g2", amount: 500, isManual: true },
  ]);
  closeTo(s.percentSpent, 1500 / 3500);
});

test("status: ΣZ maior que Y zera o Y efetivo; gasto > 0 vira 'over'", () => {
  const plan = makePlan({
    goals: [makeGoal({ budgetReserveOverride: 9000 })],
    expenses: [oneOff("2026-11-22", 10)],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.effectiveBudget, 0);
  assert.equal(s.percentSpent, Infinity);
  assert.equal(s.level, "over");
  assert.equal(computeBudgetStatus(makePlan({ goals: [makeGoal({ budgetReserveOverride: 9000 })] }), TODAY).percentSpent, 0);
});

test("status: sem budget configurado (Y=0) e sem gasto fica 'ok'", () => {
  const s = computeBudgetStatus(makePlan({ budget: makeBudget({ amountHistory: [], enabled: false }) }), TODAY);
  assert.equal(s.budgetAmount, 0);
  assert.equal(s.percentSpent, 0);
  assert.equal(s.level, "ok");
  assert.equal(s.enabled, false);
});

test("status: plano sem a chave budget usa os defaults", () => {
  const plan = makePlan();
  delete plan.budget;
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.enabled, false);
  assert.equal(s.budgetAmount, 0);
  assert.deepEqual(s.period, { start: "2026-11-01", end: "2026-11-30" }); // D padrão = 1
});

test("status: período passado (offset -1) tem tudo como gasto e Y da época", () => {
  const plan = makePlan({
    budget: makeBudget({
      amountHistory: [
        { amount: 5000, effectiveFrom: "2026-09-20" },
        { amount: 4500, effectiveFrom: "2026-11-20" },
      ],
    }),
    expenses: [oneOff("2026-10-25", 700), oneOff("2026-11-19", 300), oneOff("2026-11-20", 50)],
  });
  const past = computeBudgetStatus(plan, TODAY, -1);
  assert.deepEqual(past.period, { start: "2026-10-20", end: "2026-11-19" });
  assert.equal(past.budgetAmount, 5000);
  assert.equal(past.spent, 1000);
  assert.equal(past.committed, 0);
  assert.equal(past.isPast, true);
  assert.equal(past.isCurrent, false);
  assert.equal(past.daysRemaining, 0);
  assert.equal(computeBudgetStatus(plan, TODAY, 0).budgetAmount, 4500);
});

test("status: período futuro (offset +1) tem tudo como comprometido", () => {
  const plan = makePlan({
    expenses: [oneOff("2026-12-25", 400), oneOff("2026-12-05", 100)],
    income: [makeIncome({ startDate: "2026-01-20" })],
  });
  const future = computeBudgetStatus(plan, TODAY, 1);
  assert.deepEqual(future.period, { start: "2026-12-20", end: "2027-01-19" });
  assert.equal(future.spent, 0);
  assert.equal(future.committed, 400);
  assert.equal(future.income, 6000);
  assert.equal(future.isPast, false);
  assert.equal(future.daysRemaining, 31);
});

test("status: receita e economia inferida", () => {
  const plan = makePlan({
    income: [makeIncome({ startDate: "2026-01-20", amount: 6000 })],
    expenses: [oneOff("2026-11-22", 1000), oneOff("2026-12-05", 500)],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.income, 6000);
  assert.equal(s.inferredSavings, 4500); // 6000 − (1000 + 500)
});

test("status: despesa de cartão conta na data da compra (período em que foi comprada)", () => {
  const plan = makePlan({
    expenses: [
      makeExpense({
        paymentMethod: "credit_card" as never,
        dueDate: "2027-01-17", // fatura só no mês seguinte
        purchaseDate: "2026-11-22",
        amount: 321,
      }),
    ],
  });
  const s = computeBudgetStatus(plan, TODAY);
  assert.equal(s.spent, 321);
});

// --- Viabilidade --------------------------------------------------------------

test("viabilidade: receita 6000, Y 5000, ΣZ 1500 é inviável com sugestão 4500", () => {
  const plan = makePlan({
    income: [makeIncome({ startDate: "2026-01-20", amount: 6000 })],
    goals: [makeGoal({ budgetReserveOverride: 1000 }), makeGoal({ budgetReserveOverride: 500 })],
  });
  const f = checkFeasibility(computeBudgetStatus(plan, TODAY));
  assert.deepEqual(f, { feasible: false, suggestedBudget: 4500, gap: 500, evaluable: true });
});

test("viabilidade: viável quando receita − ΣZ ≥ Y", () => {
  const plan = makePlan({
    income: [makeIncome({ startDate: "2026-01-20", amount: 8000 })],
    goals: [makeGoal({ budgetReserveOverride: 1500 })],
  });
  const f = checkFeasibility(computeBudgetStatus(plan, TODAY));
  assert.equal(f.feasible, true);
  assert.equal(f.gap, 0);
  assert.equal(f.suggestedBudget, 6500);
});

test("viabilidade: sem receita no período não é avaliável", () => {
  const f = checkFeasibility(computeBudgetStatus(makePlan(), TODAY));
  assert.equal(f.evaluable, false);
  assert.equal(f.feasible, true);
});

// --- Breakdown ----------------------------------------------------------------

test("breakdown por categoria: ordenado, com % do total", () => {
  const plan = makePlan({
    expenses: [
      oneOff("2026-11-22", 300, { category: "food" }),
      oneOff("2026-11-23", 100, { category: "food" }),
      oneOff("2026-12-02", 600, { category: "housing" }),
      oneOff("2026-10-01", 9999, { category: "leisure" }), // fora do período
    ],
  });
  const b = computeCategoryBreakdown(plan, { start: "2026-11-20", end: "2026-12-19" });
  assert.deepEqual(
    b.map((x) => [x.categoryId, x.amount]),
    [
      ["housing", 600],
      ["food", 400],
    ]
  );
  closeTo(b[0].share, 0.6);
  closeTo(b[1].share, 0.4);
});

// --- Histórico ----------------------------------------------------------------

test("histórico: períodos, Y da época e consistência com computeBudgetStatus", () => {
  const plan = makePlan({
    budget: makeBudget({
      enabledAt: "2026-09-20",
      amountHistory: [
        { amount: 5000, effectiveFrom: "2026-09-20" },
        { amount: 4500, effectiveFrom: "2026-11-20" },
      ],
      periodClosures: [
        {
          periodStart: "2026-09-20",
          periodEnd: "2026-10-19",
          status: "confirmed",
          income: 6000,
          spent: 100,
          budgetAmount: 5000,
          allocations: [],
          closedAt: "2026-10-20T10:00:00.000Z",
        },
      ],
    }),
    income: [makeIncome({ startDate: "2026-01-20", amount: 6000 })],
    expenses: [
      oneOff("2026-09-25", 100),
      oneOff("2026-10-25", 2000),
      oneOff("2026-11-22", 700),
      oneOff("2026-12-05", 300),
      makeExpense({ dueDate: "2026-01-25", purchaseDate: "2026-01-25", amount: 50, recurring: true, frequency: Frequency.MONTHLY }),
    ],
  });
  const history = computePeriodHistory(plan, TODAY, 3);
  assert.equal(history.length, 3);
  assert.deepEqual(
    history.map((h) => h.period.start),
    ["2026-09-20", "2026-10-20", "2026-11-20"]
  );
  assert.deepEqual(
    history.map((h) => h.budgetAmount),
    [5000, 5000, 4500]
  );
  assert.deepEqual(
    history.map((h) => h.isCurrent),
    [false, false, true]
  );
  assert.deepEqual(
    history.map((h) => h.closureState),
    ["confirmed", "pending", "none"]
  );

  // mensal de 50 no dia 25: uma vez em cada período
  assert.equal(history[0].spent, 150);
  assert.equal(history[1].spent, 2050);
  assert.equal(history[2].spent, 750);
  assert.equal(history[2].committed, 300);

  // consistência com o status individual
  [-2, -1, 0].forEach((offset, i) => {
    const s = computeBudgetStatus(plan, TODAY, offset);
    assert.equal(history[i].spent, s.spent);
    assert.equal(history[i].committed, s.committed);
    assert.equal(history[i].income, s.income);
    assert.equal(history[i].budgetAmount, s.budgetAmount);
  });
  assert.equal(history[1].withinBudget, true);
  assert.equal(history[1].overBy, 0);
});

test("histórico: período estourado informa overBy", () => {
  const plan = makePlan({
    budget: makeBudget({ amountHistory: [{ amount: 1000, effectiveFrom: "2026-01-20" }] }),
    expenses: [oneOff("2026-10-25", 1230)],
  });
  const h = computePeriodHistory(plan, TODAY, 2)[0];
  assert.equal(h.withinBudget, false);
  assert.equal(h.overBy, 230);
  assert.equal(h.level, "over");
});

test("histórico: count maior que o disponível e count 0", () => {
  assert.equal(computePeriodHistory(makePlan(), TODAY, 12).length, 12);
  assert.deepEqual(computePeriodHistory(makePlan(), TODAY, 0), []);
});

// --- Fechamento ---------------------------------------------------------------

test("fechamento: nenhum pendente antes/durante o período de enabledAt", () => {
  const plan = makePlan({ budget: makeBudget({ enabledAt: "2026-11-22" }) });
  assert.equal(getPendingClosure(plan, TODAY), null);
  // ativado hoje no último dia de um período: ainda não encerrou
  const lastDay = makePlan({ budget: makeBudget({ enabledAt: "2026-12-19" }) });
  assert.equal(getPendingClosure(lastDay, "2026-12-19"), null);
});

test("fechamento: budget desativado ou sem enabledAt não tem pendência", () => {
  assert.equal(getPendingClosure(makePlan({ budget: makeBudget({ enabled: false }) }), TODAY), null);
  assert.equal(getPendingClosure(makePlan({ budget: makeBudget({ enabledAt: "" }) }), TODAY), null);
  const plan = makePlan();
  delete plan.budget;
  assert.equal(getPendingClosure(plan, TODAY), null);
});

test("fechamento: um período pendente", () => {
  const plan = makePlan({ budget: makeBudget({ enabledAt: "2026-10-25" }) });
  assert.deepEqual(getPendingClosure(plan, TODAY), {
    period: { start: "2026-10-20", end: "2026-11-19" },
    olderToSkip: [],
  });
});

test("fechamento: o período de enabledAt também é perguntado (ativado no meio dele)", () => {
  const plan = makePlan({ budget: makeBudget({ enabledAt: "2026-11-05" }) }); // período 10/20–11/19
  assert.deepEqual(getPendingClosure(plan, "2026-11-20")?.period, { start: "2026-10-20", end: "2026-11-19" });
});

test("fechamento: três pendentes mostram só o mais recente; os outros vão para olderToSkip", () => {
  const plan = makePlan({ budget: makeBudget({ enabledAt: "2026-08-25" }) });
  const pending = getPendingClosure(plan, TODAY);
  assert.deepEqual(pending?.period, { start: "2026-10-20", end: "2026-11-19" });
  assert.deepEqual(pending?.olderToSkip, [
    { start: "2026-08-20", end: "2026-09-19" },
    { start: "2026-09-20", end: "2026-10-19" },
  ]);
});

test("fechamento: período já fechado não volta", () => {
  const closure = {
    periodStart: "2026-10-20",
    periodEnd: "2026-11-19",
    status: "confirmed" as const,
    income: 0,
    spent: 0,
    budgetAmount: 5000,
    allocations: [],
    closedAt: "2026-11-20T10:00:00.000Z",
  };
  const plan = makePlan({ budget: makeBudget({ enabledAt: "2026-10-25", periodClosures: [closure] }) });
  assert.equal(getPendingClosure(plan, TODAY), null);
});

test("fechamento: depois de fechar o mais recente, os mais antigos não são perguntados de novo", () => {
  const skipped = (start: string, end: string) => ({
    periodStart: start,
    periodEnd: end,
    status: "skipped" as const,
    income: 0,
    spent: 0,
    budgetAmount: 0,
    allocations: [],
    closedAt: "2026-11-20T10:00:00.000Z",
  });
  const plan = makePlan({
    budget: makeBudget({
      enabledAt: "2026-08-25",
      periodClosures: [
        skipped("2026-08-20", "2026-09-19"),
        skipped("2026-09-20", "2026-10-19"),
        { ...skipped("2026-10-20", "2026-11-19"), status: "confirmed" },
      ],
    }),
  });
  assert.equal(getPendingClosure(plan, TODAY), null);
  // próxima virada: só o período novo
  assert.deepEqual(getPendingClosure(plan, "2026-12-20")?.period, { start: "2026-11-20", end: "2026-12-19" });
});

// --- Sugestão de aporte ---------------------------------------------------------

function closurePlan(expenseTotal: number) {
  return makePlan({
    income: [makeIncome({ startDate: "2026-01-25", amount: 6000 })], // 25/out dentro do período 10/20–11/19
    goals: [
      makeGoal({ id: "g1", targetAmount: 10000, budgetReserveOverride: 1000 }),
      makeGoal({ id: "g2", targetAmount: 10000, budgetReserveOverride: 500 }),
      makeGoal({ id: "g3", reserveFromBudget: false }),
    ],
    expenses: [oneOff("2026-10-30", expenseTotal)],
  });
}
const PERIOD = { start: "2026-10-20", end: "2026-11-19" };

test("aporte: economia ≥ ΣZ sugere o Z de cada meta", () => {
  const { inferredSavings, allocations } = suggestClosureAllocations(closurePlan(4380), PERIOD);
  assert.equal(inferredSavings, 1620);
  assert.deepEqual(allocations, [
    { goalId: "g1", amount: 1000 },
    { goalId: "g2", amount: 500 },
  ]);
});

test("aporte: economia < ΣZ é distribuída proporcionalmente aos Z", () => {
  const { inferredSavings, allocations } = suggestClosureAllocations(closurePlan(5250), PERIOD);
  assert.equal(inferredSavings, 750);
  assert.deepEqual(allocations, [
    { goalId: "g1", amount: 500 },
    { goalId: "g2", amount: 250 },
  ]);
});

test("aporte: economia ≤ 0 dá todas as alocações 0", () => {
  const negative = suggestClosureAllocations(closurePlan(7000), PERIOD);
  assert.equal(negative.inferredSavings, -1000);
  assert.deepEqual(negative.allocations, [
    { goalId: "g1", amount: 0 },
    { goalId: "g2", amount: 0 },
  ]);
  const zero = suggestClosureAllocations(closurePlan(6000), PERIOD);
  assert.deepEqual(
    zero.allocations.map((a) => a.amount),
    [0, 0]
  );
});

test("aporte: sem metas com opt-in não há alocações", () => {
  const plan = makePlan({ income: [makeIncome({ startDate: "2026-01-25" })], goals: [makeGoal({ reserveFromBudget: false })] });
  assert.deepEqual(suggestClosureAllocations(plan, PERIOD).allocations, []);
});

test("aporte: arredonda em centavos", () => {
  const plan = makePlan({
    income: [makeIncome({ startDate: "2026-01-25", amount: 1000 })],
    goals: [
      makeGoal({ id: "a", targetAmount: 99999, budgetReserveOverride: 100 }),
      makeGoal({ id: "b", targetAmount: 99999, budgetReserveOverride: 100 }),
      makeGoal({ id: "c", targetAmount: 99999, budgetReserveOverride: 100 }),
    ],
    expenses: [oneOff("2026-10-30", 900)], // economia 100 para ΣZ 300
  });
  const { allocations } = suggestClosureAllocations(plan, PERIOD);
  assert.deepEqual(
    allocations.map((a) => a.amount),
    [33.33, 33.33, 33.33]
  );
});

test("resumo do fechamento: receita, gasto, economia e se ficou dentro", () => {
  const s = computeClosureSummary(closurePlan(4380), PERIOD, TODAY);
  assert.equal(s.income, 6000);
  assert.equal(s.spent, 4380);
  assert.equal(s.inferredSavings, 1620);
  assert.equal(s.budgetAmount, 5000);
  assert.equal(s.reserveTotal, 1500);
  assert.equal(s.effectiveBudget, 3500);
  assert.equal(s.withinBudget, false); // 4380 > 3500
  assert.equal(s.overBy, 880);
  assert.equal(s.label, "20 out – 19 nov");
});
