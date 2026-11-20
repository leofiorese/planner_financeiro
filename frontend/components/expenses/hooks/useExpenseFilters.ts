"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PaymentMethod, type CreditCardAccountInfo, type Expense } from "@/types";
import { parseLocalDate } from "@/utils/dates";
import {
  ExpenseGroupBy,
  ExpenseSortBy,
  groupExpenses,
  sortExpenses,
} from "@/utils/expenseOperations";

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

function matchesFilters(
  expense: Expense,
  f: ExpenseFilterValues,
  creditCards: CreditCardAccountInfo[],
): boolean {
  // 1. Busca textual (nome, descrição, categoria)
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    const matchName = expense.name.toLowerCase().includes(q);
    const matchDesc = expense.description?.toLowerCase().includes(q) || false;
    const matchCat = expense.category.toLowerCase().includes(q);
    if (!matchName && !matchDesc && !matchCat) return false;
  }

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

/**
 * Filtros, ordenação, agrupamento e paginação da lista de despesas.
 * Regras idênticas às da página original.
 */
export function useExpenseFilters(expenses: Expense[], creditCards: CreditCardAccountInfo[]) {
  const [filters, setFilters] = useState<ExpenseFilterValues>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<ExpenseSortBy>(ExpenseSortBy.DATE_DESC);
  const [groupBy, setGroupBy] = useState<ExpenseGroupBy>(ExpenseGroupBy.NONE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(20);

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

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

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

  // Volta para a página 1 sempre que filtros, ordenação ou agrupamento mudam.
  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, groupBy]);

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => matchesFilters(expense, filters, creditCards)),
    [expenses, filters, creditCards],
  );

  const sortedExpenses = useMemo(
    () => sortExpenses(filteredExpenses, sortBy),
    [filteredExpenses, sortBy],
  );

  const total = sortedExpenses.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const pageItems = useMemo(
    () => sortedExpenses.slice(startIndex, endIndex),
    [sortedExpenses, startIndex, endIndex],
  );

  const pageGroups = useMemo(
    () => (groupBy === ExpenseGroupBy.NONE ? [] : groupExpenses(pageItems, groupBy)),
    [pageItems, groupBy],
  );

  return {
    filters,
    setFilter,
    clearFilters,
    activeFiltersCount,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
    filteredExpenses,
    pagination: { page: safePage, pageSize, total, totalPages, startIndex, endIndex },
    setPage,
    setPageSize,
    pageItems,
    pageGroups,
  };
}

export type ExpenseFiltersState = ReturnType<typeof useExpenseFilters>;
