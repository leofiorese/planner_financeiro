import test from "node:test";
import assert from "node:assert/strict";
import {
  detectThresholdCrossing,
  evaluateExpenseChange,
  formatBudgetAlertMessage,
} from "../../utils/budget/alerts";
import { makeBudget, makePlan, oneOff } from "./helpers";

const TODAY = "2026-11-25";
const fmt = (n: number) => `R$ ${n}`;
const budget1000 = makeBudget({ amountHistory: [{ amount: 1000, effectiveFrom: "2026-09-20" }] });

test("cruzamento: 75% → 85% dispara só o aviso de 80%", () => {
  assert.equal(detectThresholdCrossing(0.75, 0.85), "warning");
  assert.equal(detectThresholdCrossing(0.79, 0.8), "warning");
});

test("cruzamento: 95% → 110% dispara o estouro", () => {
  assert.equal(detectThresholdCrossing(0.95, 1.1), "over");
  assert.equal(detectThresholdCrossing(0.99, 1), "over");
});

test("cruzamento: se cruza os dois limiares de uma vez vale o mais grave", () => {
  assert.equal(detectThresholdCrossing(0.5, 1.5), "over");
});

test("cruzamento: sem cruzar (ou descendo, ou já acima) não dispara", () => {
  assert.equal(detectThresholdCrossing(0.5, 0.6), null);
  assert.equal(detectThresholdCrossing(0.85, 0.95), null);
  assert.equal(detectThresholdCrossing(1.1, 1.3), null);
  assert.equal(detectThresholdCrossing(0.9, 0.5), null);
  assert.equal(detectThresholdCrossing(0.8, 0.8), null);
  assert.equal(detectThresholdCrossing(1.2, 0.7), null);
});

test("cruzamento: de 0 para Infinity (Y efetivo 0) conta como estouro", () => {
  assert.equal(detectThresholdCrossing(0, Infinity), "over");
});

function change(before: ReturnType<typeof makePlan>, add: ReturnType<typeof oneOff>) {
  const after = { ...before, expenses: [...before.expenses, add] };
  return evaluateExpenseChange(before, after, TODAY, [{ after: add }]);
}

test("despesa que leva de 75% a 85% dispara um único alerta de 80%", () => {
  const before = makePlan({ budget: budget1000, expenses: [oneOff("2026-11-22", 750)] });
  const fb = change(before, oneOff("2026-11-25", 100));
  assert.equal(fb?.alert?.level, "warning");
  assert.equal(fb?.alert?.metric, "spent");
  assert.equal(fb?.alert?.value, 850);
  assert.equal(fb?.alert?.effectiveBudget, 1000);
  assert.equal(formatBudgetAlertMessage(fb!.alert!, fmt), "Você atingiu 80% do budget: R$ 850 de R$ 1000");
});

test("de 95% a 110% dispara o estouro", () => {
  const before = makePlan({ budget: budget1000, expenses: [oneOff("2026-11-22", 950)] });
  const fb = change(before, oneOff("2026-11-24", 150));
  assert.equal(fb?.alert?.level, "over");
  assert.equal(formatBudgetAlertMessage(fb!.alert!, fmt), "Budget estourado: R$ 1100 de R$ 1000");
});

test("editar sem mudar o valor não dispara nada", () => {
  const exp = oneOff("2026-11-22", 850);
  const plan = makePlan({ budget: budget1000, expenses: [exp] });
  const edited = { ...exp, name: "Outro nome" };
  const after = { ...plan, expenses: [edited] };
  const fb = evaluateExpenseChange(plan, after, TODAY, [{ before: exp, after: edited }]);
  assert.equal(fb?.alert, null);
});

test("lançamento futuro usa o previsto (gasto + comprometido)", () => {
  const before = makePlan({ budget: budget1000, expenses: [oneOff("2026-11-22", 100)] });
  const fb = change(before, oneOff("2026-12-05", 800));
  assert.equal(fb?.alert?.metric, "projected");
  assert.equal(fb?.alert?.level, "warning"); // 100 → 900 previstos = 90%
  assert.equal(fb?.alert?.value, 900);
});

test("lançamento de hoje usa o gasto, mesmo que o previsto já estivesse alto", () => {
  const before = makePlan({ budget: budget1000, expenses: [oneOff("2026-12-05", 900), oneOff("2026-11-22", 100)] });
  // gasto 10% → 85% com +750 hoje; previsto já passou de 100% antes (1000 → 1750)
  const fb = change(before, oneOff("2026-11-25", 750));
  assert.equal(fb?.alert?.metric, "spent");
  assert.equal(fb?.alert?.level, "warning");
});

test("lançamento fora do período atual não dispara nem informa nada", () => {
  const before = makePlan({ budget: budget1000, expenses: [oneOff("2026-11-22", 700)] });
  assert.equal(change(before, oneOff("2027-03-01", 5000)), null);
  assert.equal(change(before, oneOff("2026-10-01", 5000)), null);
});

test("budget desativado ou sem valor não avalia", () => {
  const disabled = makePlan({ budget: makeBudget({ enabled: false, amountHistory: budget1000.amountHistory }) });
  assert.equal(change(disabled, oneOff("2026-11-25", 5000)), null);
  const noAmount = makePlan({ budget: makeBudget({ amountHistory: [] }) });
  assert.equal(change(noAmount, oneOff("2026-11-25", 5000)), null);
});

test("sem cruzar limiar devolve o percentual para o toast de sucesso", () => {
  const before = makePlan({ budget: budget1000, expenses: [] });
  const fb = change(before, oneOff("2026-11-25", 250));
  assert.equal(fb?.alert, null);
  assert.equal(fb?.percentSpentAfter, 0.25);
});

test("excluir uma despesa nunca dispara alerta", () => {
  const exp = oneOff("2026-11-22", 900);
  const before = makePlan({ budget: budget1000, expenses: [exp] });
  const after = { ...before, expenses: [] };
  const fb = evaluateExpenseChange(before, after, TODAY, [{ before: exp }]);
  assert.equal(fb?.alert, null);
});
