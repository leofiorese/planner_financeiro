/**
 * Roteiro de QA da Sprint 1 (fase 1.9) executado contra a engine e o reducer, sem navegador.
 * Cobre os passos 2 a 9 do roteiro de docs/sprints/SPRINT_01_BUDGET.md que não dependem de tela.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { enhancedFinancialReducer } from "../../context/reducer";
import * as actions from "../../context/actions";
import { createFreshInitialState } from "../../context/initialState";
import {
  checkFeasibility,
  computeBudgetStatus,
  getPendingClosure,
  suggestClosureAllocations,
} from "../../utils/budget/budgetCalculator";
import { evaluateExpenseChange } from "../../utils/budget/alerts";
import { serializeToJSON } from "../../utils/dataExport";
import { importFinancialData } from "../../utils/dataImport";
import { Frequency, GoalType, PaymentMethod, type Expense, type UserPlan } from "../../types";
import { makeExpense, makeGoal, makeIncome, oneOff } from "./helpers";

const TODAY = "2026-11-25"; // período atual com D=20: 2026-11-20 .. 2026-12-19

test("roteiro de QA: ativar, lançar, conferir X, cruzar limiares, mudar Y, reservas, virada e export/import", () => {
  let state = createFreshInitialState();
  state = { ...state, userPlan: { ...state.userPlan, id: "qa-plan", income: [makeIncome({ startDate: "2026-01-20", amount: 6000 })] } };

  // 2. Ativar o budget com R$ 5.000, dia 20
  state = enhancedFinancialReducer(state, actions.setBudgetSettings({ enabled: true, rolloverDay: 20 }, TODAY));
  state = enhancedFinancialReducer(state, actions.setBudgetAmount(5000, TODAY));
  assert.equal(state.userPlan.budget?.enabledAt, TODAY);

  // 3. Lançamentos
  const expenses: Expense[] = [
    oneOff(TODAY, 100, { name: "avulsa pix hoje" }),
    oneOff("2026-12-05", 200, { name: "avulsa futura no período" }),
    makeExpense({
      name: "cartão hoje",
      paymentMethod: PaymentMethod.CREDIT_CARD,
      purchaseDate: TODAY,
      dueDate: "2027-01-17", // fatura só em janeiro
      amount: 300,
    }),
    makeExpense({
      name: "parcelada 6x no cartão",
      paymentMethod: PaymentMethod.CREDIT_CARD,
      amount: 600,
      purchaseDate: "2026-10-22",
      dueDate: "2026-12-17",
      isInstallment: true,
      installmentMonths: 6,
      installmentStartMonth: "2026-12",
    }),
    oneOff("2026-01-28", 50, { name: "recorrente mensal", recurring: true, frequency: Frequency.MONTHLY }),
    oneOff("2026-11-02", 10, {
      name: "semanal a cada 2 semanas",
      recurring: true,
      frequency: Frequency.WEEKLY,
      recurringWeeksInterval: 2,
    }),
    oneOff("2025-12-10", 1200, { name: "anual", recurring: true, frequency: Frequency.YEARLY }),
  ];
  state = { ...state, userPlan: { ...state.userPlan, expenses } };

  // 4. X gasto e X comprometido batem com a soma manual (período 20/nov – 19/dez, hoje 25/nov)
  //  gasto (data ≤ 25/nov): avulsa de hoje 100 + cartão de hoje 300 + parcela 2/6 em 22/nov (100) = 500
  //  comprometido (data > 25/nov): avulsa 05/dez 200 + mensal 28/nov 50 + quinzenal (semanal x2) 30/nov e 14/dez 10+10
  //                                + anual 10/dez 1200 = 1470. A parcela 3/6 (22/dez) e a mensal de 28/dez caem no próximo período.
  const status = computeBudgetStatus(state.userPlan, TODAY);
  assert.equal(status.spent, 100 + 300 + 100);
  assert.equal(status.committed, 200 + 50 + 10 + 10 + 1200);
  assert.equal(status.projectedTotal, status.spent + status.committed);
  assert.equal(status.effectiveBudget, 5000);

  // 5. Cruzar 80% e 100% com lançamentos
  const wasPlan = state.userPlan;
  const big = oneOff(TODAY, 3600, { name: "grande" }); // gasto 500 -> 4100 = 82%
  const afterBig: UserPlan = { ...wasPlan, expenses: [...wasPlan.expenses, big] };
  const fb80 = evaluateExpenseChange(wasPlan, afterBig, TODAY, [{ after: big }]);
  assert.equal(fb80?.alert?.level, "warning");
  state = { ...state, userPlan: afterBig };

  const more = oneOff(TODAY, 1000, { name: "estoura" }); // 4100 -> 5100 = 102%
  const afterMore: UserPlan = { ...afterBig, expenses: [...afterBig.expenses, more] };
  const fb100 = evaluateExpenseChange(afterBig, afterMore, TODAY, [{ after: more }]);
  assert.equal(fb100?.alert?.level, "over");
  // sem repetir o aviso quando já está acima
  const again = oneOff(TODAY, 10);
  assert.equal(
    evaluateExpenseChange(afterMore, { ...afterMore, expenses: [...afterMore.expenses, again] }, TODAY, [{ after: again }])?.alert,
    null
  );
  // desfaz os lançamentos grandes para seguir o roteiro
  state = { ...state, userPlan: { ...state.userPlan, expenses } };

  // 6. Mudar Y para R$ 4.500: o período anterior continua mostrando R$ 5.000
  state = enhancedFinancialReducer(state, actions.setBudgetAmount(4500, TODAY));
  assert.equal(computeBudgetStatus(state.userPlan, TODAY).budgetAmount, 4500);
  assert.equal(computeBudgetStatus(state.userPlan, TODAY, -1).budgetAmount, 0); // antes da 1ª entrada
  // com um Y antigo no histórico, o período anterior mantém o valor da época
  const withOld = {
    ...state.userPlan,
    budget: {
      ...state.userPlan.budget!,
      amountHistory: [{ amount: 5000, effectiveFrom: "2026-10-20" }, ...state.userPlan.budget!.amountHistory],
    },
  };
  assert.equal(computeBudgetStatus(withOld, TODAY, -1).budgetAmount, 5000);
  assert.equal(computeBudgetStatus(withOld, TODAY, 0).budgetAmount, 4500);

  // 7. Reserva em meta com prazo e em open-ended (manual): Y efetivo e viabilidade
  const goalFixed = makeGoal({ id: "g-fixed", targetAmount: 4000, targetDate: "2027-02-25" }); // Z = 1000
  const goalOpen = makeGoal({ id: "g-open", goalType: GoalType.OPEN_ENDED, targetAmount: 0, budgetReserveOverride: 500 });
  state = { ...state, userPlan: { ...state.userPlan, goals: [goalFixed, goalOpen] } };
  const reserved = computeBudgetStatus(state.userPlan, TODAY);
  assert.equal(reserved.reserveTotal, 1500);
  assert.equal(reserved.effectiveBudget, 3000);
  assert.equal(reserved.income, 6000);
  const feasibility = checkFeasibility(reserved);
  assert.equal(feasibility.feasible, true); // 6000 - 1500 >= 4500

  const tight = enhancedFinancialReducer(state, actions.setBudgetAmount(5500, TODAY));
  const tightFeasibility = checkFeasibility(computeBudgetStatus(tight.userPlan, TODAY));
  assert.equal(tightFeasibility.feasible, false);
  assert.equal(tightFeasibility.suggestedBudget, 4500);

  // 8. Simular a virada: o período 20/nov – 19/dez encerrou
  const NEXT = "2026-12-21";
  const pending = getPendingClosure(state.userPlan, NEXT);
  assert.deepEqual(pending?.period, { start: "2026-11-20", end: "2026-12-19" });
  const suggestion = suggestClosureAllocations(state.userPlan, pending!.period);
  assert.equal(suggestion.allocations.length, 2);

  const before = state.userPlan.goals.find((g) => g.id === "g-fixed")!.currentAmount;
  const amountToGoal = suggestion.allocations.find((a) => a.goalId === "g-fixed")!.amount;
  state = enhancedFinancialReducer(
    state,
    actions.closeBudgetPeriod(
      {
        periodStart: pending!.period.start,
        periodEnd: pending!.period.end,
        status: "confirmed",
        income: 6000,
        spent: 1970,
        budgetAmount: 4500,
        allocations: suggestion.allocations,
        closedAt: "2026-12-21T10:00:00.000Z",
      },
      pending!.olderToSkip,
      "2026-12-21T10:00:00.000Z"
    )
  );
  assert.equal(state.userPlan.goals.find((g) => g.id === "g-fixed")!.currentAmount, before + amountToGoal);
  assert.equal(getPendingClosure(state.userPlan, NEXT), null);

  // 9. Export JSON -> import: o budget é preservado
  const json = serializeToJSON(state.userPlan);
  const imported = importFinancialData(json);
  assert.equal(imported.success, true, imported.errors.join("; "));
  assert.deepEqual(imported.userPlan?.budget, state.userPlan.budget);
  assert.equal(imported.userPlan?.goals.find((g) => g.id === "g-open")?.budgetReserveOverride, 500);
  assert.equal(imported.userPlan?.goals.find((g) => g.id === "g-fixed")?.reserveFromBudget, true);
  const cardExpense = imported.userPlan?.expenses.find((e) => e.name === "cartão hoje");
  assert.equal(cardExpense?.purchaseDate, TODAY);
});
