"use client";

import { useCallback, useMemo, useState } from "react";
import {
  PaymentMethod,
  type CreditCardAccountInfo,
  type Expense,
  type ExpenseCategoryConfig,
} from "@/types";
import { getCategoryInfo } from "@/utils/categoryRules";
import { parseLocalDate } from "@/utils/dates";

export type ScheduleTypeFilter = "all" | "one_time" | "recurring" | "installment";
export type StatusFilter = "all" | "active" | "inactive";

export interface ExpenseFilterValues {
  search: string;
  category: string;
  scheduleType: ScheduleTypeFilter;
  paymentMethod: PaymentMethod | "all";
  cardAccount: string;
  startDate: string;
  endDate: string;
  status: StatusFilter;
}

export const EMPTY_FILTERS: ExpenseFilterValues = {
  search: "",
  category: "all",
  scheduleType: "all",
  paymentMethod: "all",
  cardAccount: "all",
  startDate: "",
  endDate: "",
  status: "all",
};

/** Minúsculas e sem acentos, para a busca ignorar "Alimentação" x "alimentacao". */
function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Representações do valor que o usuário pode digitar: 1500.5 -> "1500,50", "1.500,50", "1500.50", "1500". */
function amountSearchForms(amount: number): string[] {
  const fixed = amount.toFixed(2);
  const [int, cents] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const forms = [`${int},${cents}`, `${grouped},${cents}`, fixed, `${int}`, `${grouped}`];
  // "150,5" também encontra 150,50
  if (cents.endsWith("0")) forms.push(`${int},${cents[0]}`, `${grouped},${cents[0]}`);
  return forms;
}

function resolveCardName(expense: Expense, creditCards: CreditCardAccountInfo[]): string {
  const account = expense.creditCardAccount;
  if (!account) return "";
  const card = creditCards.find(
    (c) => c.id === account || c.name.toLowerCase() === account.toLowerCase(),
  );
  return card ? card.name : account;
}

/** Busca textual: nome, valor, cartão e categoria (e a descrição, quando houver). */
export function matchesSearch(
  expense: Expense,
  rawQuery: string,
  creditCards: CreditCardAccountInfo[],
  categories: ExpenseCategoryConfig[],
): boolean {
  const query = rawQuery.trim();
  if (!query) return true;

  const q = normalizeText(query);
  const category = getCategoryInfo(expense.category, categories);
  const textFields = [
    expense.name,
    expense.description ?? "",
    category.name,
    expense.category,
    resolveCardName(expense, creditCards),
  ];
  if (textFields.some((field) => normalizeText(field).includes(q))) return true;

  // Valor: aceita "R$ 1.500,50", "1500", "150,5"...
  const numeric = query.replace(/^r\$\s*/i, "").replace(/\s+/g, "");
  if (/^[\d.,]+$/.test(numeric)) {
    return amountSearchForms(expense.amount).some((form) => form.includes(numeric));
  }
  return false;
}

function matchesFilters(
  expense: Expense,
  f: ExpenseFilterValues,
  creditCards: CreditCardAccountInfo[],
  categories: ExpenseCategoryConfig[],
): boolean {
  // 1. Busca textual (nome, valor, cartão, categoria)
  if (!matchesSearch(expense, f.search, creditCards, categories)) return false;

  // 2. Categoria
  if (f.category !== "all" && expense.category !== f.category) return false;

  // 3. Tipo (única, recorrente ou parcelada)
  if (f.scheduleType !== "all") {
    if (f.scheduleType === "one_time" && (expense.recurring || expense.isInstallment)) return false;
    if (f.scheduleType === "recurring" && !expense.recurring) return false;
    if (f.scheduleType === "installment" && !expense.isInstallment) return false;
  }

  // 4. Forma de pagamento
  if (f.paymentMethod !== "all" && expense.paymentMethod !== f.paymentMethod) return false;

  // 5. Cartão
  if (f.cardAccount !== "all") {
    if (expense.paymentMethod !== PaymentMethod.CREDIT_CARD) return false;
    const expCard = expense.creditCardAccount || "";
    const matches =
      expCard.toLowerCase() === f.cardAccount.toLowerCase() ||
      creditCards.some(
        (c) =>
          c.id === f.cardAccount &&
          (c.id === expCard || c.name.toLowerCase() === expCard.toLowerCase()),
      );
    if (!matches) return false;
  }

  // 6. Data início
  if (f.startDate) {
    if (expense.isInstallment && expense.installmentStartMonth && expense.installmentMonths) {
      const [sYear, sMonth] = expense.installmentStartMonth.split("-").map(Number);
      const endInstallmentDate = new Date(sYear, sMonth - 1 + expense.installmentMonths - 1, 31);
      if (endInstallmentDate < parseLocalDate(f.startDate)) return false;
    } else if (expense.recurring) {
      // Recorrentes seguem no futuro
    } else if (parseLocalDate(expense.dueDate) < parseLocalDate(f.startDate)) {
      return false;
    }
  }

  // 7. Data fim
  if (f.endDate) {
    if (expense.isInstallment && expense.installmentStartMonth) {
      const [sYear, sMonth] = expense.installmentStartMonth.split("-").map(Number);
      const startInstallmentDate = new Date(sYear, sMonth - 1, 1);
      if (startInstallmentDate > parseLocalDate(f.endDate)) return false;
    } else if (parseLocalDate(expense.dueDate) > parseLocalDate(f.endDate)) {
      return false;
    }
  }

  // 8. Status
  if (f.status === "active" && !expense.isActive) return false;
  if (f.status === "inactive" && expense.isActive) return false;

  return true;
}

/** Filtros e busca das despesas exibidas no calendário. */
export function useExpenseFilters(
  expenses: Expense[],
  creditCards: CreditCardAccountInfo[],
  categories: ExpenseCategoryConfig[],
) {
  const [filters, setFilters] = useState<ExpenseFilterValues>(EMPTY_FILTERS);

  const setFilter = useCallback(
    <K extends keyof ExpenseFilterValues>(key: K, value: ExpenseFilterValues[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        // Trocar para uma forma de pagamento que não é cartão limpa o filtro de cartão.
        if (key === "paymentMethod" && value !== PaymentMethod.CREDIT_CARD && value !== "all") {
          next.cardAccount = "all";
        }
        return next;
      });
    },
    [],
  );

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.category !== "all") count++;
    if (filters.scheduleType !== "all") count++;
    if (filters.paymentMethod !== "all") count++;
    if (filters.cardAccount !== "all") count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.status !== "all") count++;
    return count;
  }, [filters]);

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => matchesFilters(expense, filters, creditCards, categories)),
    [expenses, filters, creditCards, categories],
  );

  return { filters, setFilter, clearFilters, activeFiltersCount, filteredExpenses };
}

export type ExpenseFiltersState = ReturnType<typeof useExpenseFilters>;
