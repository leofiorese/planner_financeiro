"use client";

import { useMemo, useState } from "react";
import { useFinancialActions, useFinancialState } from "@/context";
import BudgetBanner from "@/components/budget/BudgetBanner";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { ActiveFilterChips } from "@/components/expenses/ExpenseFilters";
import { ExpenseCalendar } from "@/components/expenses/ExpenseCalendar";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { ExpensesHeader } from "@/components/expenses/ExpensesHeader";
import { ExpensesToolbar } from "@/components/expenses/ExpensesToolbar";
import { useExpenseFilters } from "@/components/expenses/hooks/useExpenseFilters";
import { useExpenseForm } from "@/components/expenses/hooks/useExpenseForm";
import { useExpenseStats, useLastInsertedExpense } from "@/components/expenses/hooks/useExpenseStats";
import { withToast } from "@/lib/toast";
import type { Expense } from "@/types";
import { getOrderedCategories } from "@/utils/categoryRules";

export default function ExpensesPage() {
  const state = useFinancialState();
  const { deleteExpense } = useFinancialActions();
  const confirm = useConfirm();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const expenses = state.userPlan.expenses;
  const creditCards = useMemo(
    () => state.userPlan.creditCardAccounts || [],
    [state.userPlan.creditCardAccounts],
  );
  const categories = useMemo(
    () => getOrderedCategories(state.userPlan.expenseCategories),
    [state.userPlan.expenseCategories],
  );

  const filtersState = useExpenseFilters(expenses, creditCards, categories);
  const form = useExpenseForm(creditCards);
  const stats = useExpenseStats(expenses, creditCards);
  const lastInsertedId = useLastInsertedExpense(expenses);

  const handleDelete = async (expense: Expense): Promise<boolean> => {
    const ok = await confirm({
      title: "Excluir despesa?",
      description: `A despesa "${expense.name}" será removida. Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return false;
    try {
      await withToast(deleteExpense(expense.id), {
        loading: "Excluindo despesa...",
        success: "Despesa excluída",
        error: "Não foi possível excluir a despesa",
      });
      return true;
    } catch (error) {
      console.error("Failed to delete expense:", error);
      return false;
    }
  };

  /** Botão "Excluir" do modal de edição: confirma, exclui e fecha o modal. */
  const handleDeleteFromModal = async (expenseId: string) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    if (await handleDelete(expense)) form.close();
  };

  return (
    <div className="space-y-6 pb-12">
      <ExpensesHeader
        activeCount={stats.activeCount}
        totalMonthlyExpenses={stats.totalMonthlyExpenses}
        recurringCount={stats.recurringCount}
        invoiceTotal={stats.invoiceTotal}
        invoiceItemsCount={stats.invoiceItemsCount}
        invoiceMonthKey={stats.currentInvoiceMonthKey}
        onCreate={form.openCreate}
      />

      <BudgetBanner />

      <ExpensesToolbar
        filtersState={filtersState}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />

      <ActiveFilterChips filters={filtersState.filters} setFilter={filtersState.setFilter} />

      <ExpenseCalendar
        expenses={filtersState.filteredExpenses}
        categories={categories}
        creditCards={creditCards}
        currentMonthKey={stats.currentMonthKey}
        currentInvoiceMonthKey={stats.currentInvoiceMonthKey}
        lastInsertedId={lastInsertedId}
        onEdit={form.openEdit}
      />

      <ExpenseFormModal form={form} categories={categories} onDelete={handleDeleteFromModal} />
    </div>
  );
}
