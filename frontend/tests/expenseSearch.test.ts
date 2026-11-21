import test from "node:test";
import assert from "node:assert/strict";
import { matchesSearch } from "../components/expenses/hooks/useExpenseFilters";
import { DEFAULT_EXPENSE_CATEGORIES } from "../utils/categoryRules";
import { PaymentMethod, type CreditCardAccountInfo, type Expense } from "../types";

const cards = [
  { id: "card-1", name: "Nubank", dueDay: 10, closingDay: 3, isActive: true },
] as CreditCardAccountInfo[];

const base = {
  id: "e1",
  name: "Mercado do Zé",
  amount: 1500.5,
  category: "food",
  paymentMethod: PaymentMethod.CREDIT_CARD,
  creditCardAccount: "card-1",
  description: "",
} as unknown as Expense;

const search = (q: string, e: Expense = base) => matchesSearch(e, q, cards, DEFAULT_EXPENSE_CATEGORIES);

test("busca vazia aceita tudo", () => {
  assert.equal(search(""), true);
  assert.equal(search("   "), true);
});

test("busca por nome ignora acentos e caixa", () => {
  assert.equal(search("mercado"), true);
  assert.equal(search("ZE"), true);
  assert.equal(search("padaria"), false);
});

test("busca pelo nome do cartão (não pelo id)", () => {
  assert.equal(search("nubank"), true);
  assert.equal(search("card-1"), false);
  assert.equal(search("inter"), false);
});

test("busca por categoria usa o nome exibido", () => {
  const cat = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === "food");
  assert.ok(cat, "categoria food existe nos defaults");
  assert.equal(search(cat.name.toLowerCase()), true);
});

test("busca por valor aceita vários formatos", () => {
  assert.equal(search("1500,50"), true);
  assert.equal(search("1.500,50"), true);
  assert.equal(search("R$ 1.500,50"), true);
  assert.equal(search("1500.50"), true);
  assert.equal(search("1500"), true);
  assert.equal(search("999"), false);
});
