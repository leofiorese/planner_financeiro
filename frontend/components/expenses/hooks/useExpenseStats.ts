"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CreditCardAccount,
  PaymentMethod,
  type CreditCardAccountInfo,
  type Expense,
} from "@/types";
import { calculateCreditCardBillingMonth } from "@/utils/creditCardRules";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";

const LAST_INSERTED_KEY = "lastInsertedExpenseId";

function newestByCreatedAt(expenses: Expense[]): Expense | undefined {
  return [...expenses].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  })[0];
}

/** Despesa inserida por último (destacada na lista), persistida na sessão. */
export function useLastInsertedExpense(expenses: Expense[]): string | null {
  const [lastInsertedId, setLastInsertedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(LAST_INSERTED_KEY);
    } catch {
      return null;
    }
  });
  const prevLength = useRef(expenses.length);

  useEffect(() => {
    if (expenses.length > prevLength.current) {
      const newest = newestByCreatedAt(expenses);
      if (newest) {
        setLastInsertedId(newest.id);
        try {
          sessionStorage.setItem(LAST_INSERTED_KEY, newest.id);
        } catch {
          /* sessionStorage indisponível */
        }
      }
    }
    prevLength.current = expenses.length;
  }, [expenses]);

  return useMemo(() => {
    if (lastInsertedId && expenses.some((e) => e.id === lastInsertedId)) return lastInsertedId;
    if (expenses.length === 0) return null;
    return newestByCreatedAt(expenses)?.id || null;
  }, [lastInsertedId, expenses]);
}

/** Totais do cabeçalho: gasto mensal, recorrentes ativas e fatura aberta do cartão. */
export function useExpenseStats(expenses: Expense[], creditCards: CreditCardAccountInfo[]) {
  const activeCards = useMemo(() => creditCards.filter((c) => c.isActive), [creditCards]);

  const activeCount = useMemo(() => expenses.filter((e) => e.isActive).length, [expenses]);

  const totalMonthlyExpenses = useMemo(
    () =>
      expenses
        .filter((e) => e.isActive)
        .reduce((total, e) => total + calculateMonthlyAmount(e), 0),
    [expenses],
  );

  const recurringCount = useMemo(
    () => expenses.filter((e) => e.recurring && e.isActive).length,
    [expenses],
  );

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const currentInvoiceMonthKey = useMemo(
    () =>
      calculateCreditCardBillingMonth(
        activeCards[0]?.id || CreditCardAccount.INTER,
        new Date(),
        creditCards,
      ),
    [activeCards, creditCards],
  );

  const { invoiceItemsCount, invoiceTotal } = useMemo(() => {
    const [invYear, invMonth] = currentInvoiceMonthKey.split("-").map(Number);
    const targetDate = new Date(invYear, invMonth - 1, 1);
    let count = 0;
    let total = 0;
    for (const expense of expenses) {
      if (!expense.isActive || expense.paymentMethod !== PaymentMethod.CREDIT_CARD) continue;
      const amount = calculateMonthlyAmount(expense, targetDate);
      if (amount > 0) {
        count++;
        total += amount;
      }
    }
    return { invoiceItemsCount: count, invoiceTotal: total };
  }, [expenses, currentInvoiceMonthKey]);

  return {
    activeCount,
    totalMonthlyExpenses,
    recurringCount,
    currentMonthKey,
    currentInvoiceMonthKey,
    invoiceItemsCount,
    invoiceTotal,
  };
}
