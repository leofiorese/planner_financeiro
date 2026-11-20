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
import PeriodClosureModal from "../../components/budget/PeriodClosureModal";
import { computeBudgetStatus } from "../../utils/budget/budgetCalculator";
import { makeBudget, makeGoal, makeIncome, makePlan, oneOff } from "./helpers";

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

const noop = () => undefined;
const CLOSING_PERIOD = { start: "2026-10-20", end: "2026-11-19" };

function closurePlan(expenseTotal: number, withGoals = true) {
  return makePlan({
    income: [makeIncome({ startDate: "2026-01-25", amount: 6000 })],
    goals: withGoals
      ? [
          makeGoal({ id: "g1", name: "Viagem", targetAmount: 10000, budgetReserveOverride: 1000 }),
          makeGoal({ id: "g2", name: "Reserva", targetAmount: 10000, budgetReserveOverride: 500 }),
        ]
      : [],
    expenses: [oneOff("2026-10-30", expenseTotal)],
  });
}

test("PeriodClosureModal: dialog acessível com resumo e aporte sugerido por meta", () => {
  const html = render(
    <PeriodClosureModal
      plan={closurePlan(4380)}
      period={CLOSING_PERIOD}
      todayISO={TODAY}
      olderSkippedCount={0}
      onDismiss={noop}
      onSubmit={noop}
    />
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /Período 20 out – 19 nov encerrado/);
  assert.match(html, /Economia inferida/);
  assert.match(html, /Viagem/);
  assert.match(html, /Reserva/);
  assert.match(html, /value="1000"/);
  assert.match(html, /value="500"/);
  assert.match(html, /Confirmar aporte/);
  assert.match(html, /Pular este período/);
  assert.doesNotMatch(html, /distribuídos proporcionalmente/);
});

test("PeriodClosureModal: economia menor que ΣZ avisa que distribuiu proporcionalmente", () => {
  const html = render(
    <PeriodClosureModal
      plan={closurePlan(5250)}
      period={CLOSING_PERIOD}
      todayISO={TODAY}
      olderSkippedCount={2}
      onDismiss={noop}
      onSubmit={noop}
    />
  );
  assert.match(html, /A economia estimada não cobre todas as reservas; os valores foram distribuídos proporcionalmente\./);
  assert.match(html, /value="500"/);
  assert.match(html, /value="250"/);
  assert.match(html, /2 períodos mais antigos/);
});

test("PeriodClosureModal: sem metas com opt-in mostra só o resumo e o botão Ok", () => {
  const html = render(
    <PeriodClosureModal
      plan={closurePlan(4380, false)}
      period={CLOSING_PERIOD}
      todayISO={TODAY}
      olderSkippedCount={0}
      onDismiss={noop}
      onSubmit={noop}
    />
  );
  assert.match(html, />Ok</);
  assert.doesNotMatch(html, /Pular este período/);
  assert.match(html, /Nenhuma meta reserva do budget/);
});

test("BudgetProgress sm: barra compacta com percentual", () => {
  const plan = makePlan({ expenses: [oneOff("2026-11-22", 2500)] });
  const html = render(<BudgetProgress status={computeBudgetStatus(plan, TODAY)} size="sm" />);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /50%/);
  assert.doesNotMatch(html, /faltam/);
});
