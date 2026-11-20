/**
 * Smoke tests de renderização (SSR) dos componentes apresentacionais do budget.
 * Verificam estrutura/acessibilidade, não estilo.
 */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurrencyProvider } from "../../context/CurrencyContext";
import BudgetProgress from "../../components/budget/BudgetProgress";
import { computeBudgetStatus } from "../../utils/budget/budgetCalculator";
import { makeBudget, makeGoal, makePlan, oneOff } from "./helpers";

const TODAY = "2026-11-25";

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(<CurrencyProvider>{node}</CurrencyProvider>);
}

test("BudgetProgress lg: role=progressbar com aria e textos principais", () => {
  const plan = makePlan({
    goals: [makeGoal({ budgetReserveOverride: 800 })],
    expenses: [oneOff("2026-11-22", 3250), oneOff("2026-12-05", 600)],
  });
  const status = computeBudgetStatus(plan, TODAY); // Y efetivo 4200
  const html = render(<BudgetProgress status={status} size="lg" />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="100"/);
  assert.match(html, /aria-valuenow="77"/); // 3250 / 4200
  assert.match(html, /aria-label="Budget do período 20 nov – 19 dez/);
  assert.match(html, /previstos/);
  assert.match(html, /faltam 25 dias/);
});

test("BudgetProgress: estourado mostra o excesso", () => {
  const plan = makePlan({
    budget: makeBudget({ amountHistory: [{ amount: 1000, effectiveFrom: "2026-09-20" }] }),
    expenses: [oneOff("2026-11-22", 1350)],
  });
  const html = render(<BudgetProgress status={computeBudgetStatus(plan, TODAY)} size="md" />);
  assert.match(html, /acima/);
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /bg-rose-500/);
});

test("BudgetProgress sm: barra compacta com percentual", () => {
  const plan = makePlan({ expenses: [oneOff("2026-11-22", 2500)] });
  const html = render(<BudgetProgress status={computeBudgetStatus(plan, TODAY)} size="sm" />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /50%/);
  assert.doesNotMatch(html, /faltam/);
});
