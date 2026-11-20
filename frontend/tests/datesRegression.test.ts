/**
 * Regressões de fuso (UTC-3): `new Date("YYYY-MM-DD")` é meia-noite UTC e,
 * lido com getters locais, vira o dia anterior.
 * Rode com TZ=America/Sao_Paulo para exercitar o cenário do usuário.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { getExpensesForMonth } from "../utils/expenseOperations";
import {
  calculateCreditCardBillingMonth,
  calculateCreditCardDueDate,
  getEffectiveBillingMonth,
} from "../utils/creditCardRules";
import { isIncomeActiveInMonth } from "../utils/forecastCalculator";
import { parseLocalDate } from "../utils/dates";
import { formatDateDDMMYYYY } from "../utils/dateFormatting";
import { Expense, Income, Frequency, PaymentMethod, Priority } from "../types";

const baseExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "e1",
  name: "Teste",
  amount: 100,
  category: "miscellaneous",
  dueDate: "2026-12-01",
  paymentMethod: PaymentMethod.PIX,
  recurring: false,
  priority: Priority.MEDIUM,
  isActive: true,
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
  ...overrides,
});

const cards = [
  { id: "c1", name: "Cartão", closingDay: 10, dueDay: 17, isActive: true },
] as never;

test("despesa avulsa com vencimento no dia 1 aparece no próprio mês (não no anterior)", () => {
  const exp = baseExpense({ dueDate: "2026-12-01" });
  assert.equal(getExpensesForMonth([exp], parseLocalDate("2026-12-01")).length, 1);
  assert.equal(getExpensesForMonth([exp], parseLocalDate("2026-11-01")).length, 0);
});

test("compra no cartão no dia closingDay + 1 vai para a fatura do mês seguinte", () => {
  // closingDay = 10: dia 10 ainda fecha neste mês, dia 11 rola para o próximo
  assert.equal(calculateCreditCardBillingMonth("c1", parseLocalDate("2026-11-10"), cards), "2026-11");
  assert.equal(calculateCreditCardBillingMonth("c1", parseLocalDate("2026-11-11"), cards), "2026-12");
  assert.equal(calculateCreditCardDueDate("c1", parseLocalDate("2026-11-10"), cards), "2026-11-17");
  assert.equal(calculateCreditCardDueDate("c1", parseLocalDate("2026-11-11"), cards), "2026-12-17");
});

test("getEffectiveBillingMonth usa o dia local da data", () => {
  const exp = baseExpense({
    paymentMethod: PaymentMethod.CREDIT_CARD,
    creditCardAccount: "c1",
    dueDate: "2026-11-11",
  });
  const m = getEffectiveBillingMonth(exp, cards);
  assert.equal(m.getMonth(), 11); // dezembro
  assert.equal(m.getFullYear(), 2026);
});

test("parcelas: mês inicial e final inclusivos", () => {
  const exp = baseExpense({
    isInstallment: true,
    installmentMonths: 3,
    installmentStartMonth: "2026-12",
  });
  const naoVe = (d: string) => getExpensesForMonth([exp], parseLocalDate(d)).length === 0;
  assert.equal(naoVe("2026-11-01"), true);
  assert.equal(naoVe("2026-12-01"), false);
  assert.equal(naoVe("2027-02-01"), false);
  assert.equal(naoVe("2027-03-01"), true);
});

test("renda mensal com endDate no dia 1 do último mês ainda conta nesse mês", () => {
  const income = {
    id: "i1",
    name: "Salário",
    amount: 1000,
    frequency: Frequency.MONTHLY,
    startDate: "2026-01-01",
    endDate: "2026-12-01",
    isActive: true,
    createdAt: "",
    updatedAt: "",
  } as Income;
  assert.equal(isIncomeActiveInMonth(income, parseLocalDate("2026-12-01")), true);
  assert.equal(isIncomeActiveInMonth(income, parseLocalDate("2027-01-01")), false);
});

test("formatDateDDMMYYYY não desloca YYYY-MM-DD", () => {
  assert.equal(formatDateDDMMYYYY("2026-12-01"), "01/12/2026");
});
