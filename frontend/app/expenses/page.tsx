"use client";

import { useMemo, useState } from "react";
import { useFinancialActions, useFinancialState } from "@/context";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { ActiveFilterChips } from "@/components/expenses/ExpenseFilters";
import { ExpenseCalendar } from "@/components/expenses/ExpenseCalendar";
import { ExpenseFormModal } from "@/components/expenses/ExpenseFormModal";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { ExpensesHeader } from "@/components/expenses/ExpensesHeader";
import { ExpensesToolbar, type ExpenseViewMode } from "@/components/expenses/ExpensesToolbar";
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

  const [viewMode, setViewMode] = useState<ExpenseViewMode>("list");
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

  const filtersState = useExpenseFilters(expenses, creditCards);
  const form = useExpenseForm(creditCards);
  const stats = useExpenseStats(expenses, creditCards);
  const lastInsertedId = useLastInsertedExpense(expenses);

  const handleDelete = async (expense: Expense) => {
    const ok = await confirm({
      title: "Excluir despesa?",
      description: `A despesa "${expense.name}" será removida. Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(deleteExpense(expense.id), {
        loading: "Excluindo despesa...",
        success: "Despesa excluída",
        error: "Não foi possível excluir a despesa",
      });
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
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

      <ExpensesToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filtersState={filtersState}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />

      <ActiveFilterChips filters={filtersState.filters} setFilter={filtersState.setFilter} />

      {viewMode === "calendar" ? (
        <ExpenseCalendar
          expenses={filtersState.filteredExpenses}
          currentMonthKey={stats.currentMonthKey}
          currentInvoiceMonthKey={stats.currentInvoiceMonthKey}
          lastInsertedId={lastInsertedId}
          onEdit={form.openEdit}
        />
      ) : (
        <ExpenseList
          filtersState={filtersState}
          totalCount={expenses.length}
          totalMonthlyExpenses={stats.totalMonthlyExpenses}
          creditCards={creditCards}
          editingId={form.editingId}
          lastInsertedId={lastInsertedId}
          currentMonthKey={stats.currentMonthKey}
          currentInvoiceMonthKey={stats.currentInvoiceMonthKey}
          onCreate={form.openCreate}
          onEdit={form.openEdit}
          onDelete={handleDelete}
        />
      )}

      <ExpenseFormModal form={form} categories={categories} />
    </div>
  );
}
