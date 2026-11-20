"use client";

import { RowActions } from "@/components/common/RowActions";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import {
  getCreditCardAccountBadge,
  getPaymentMethodBadge,
} from "@/components/expenses/expense-labels";
import { useCurrency } from "@/context/CurrencyContext";
import type { CreditCardAccountInfo, Expense } from "@/types";
import { cn } from "@/lib/utils";
import { formatLocalizedDate } from "@/utils/dateFormatting";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";
import { getInstallmentProgressDisplay } from "@/utils/installmentCalculator";
import { getCategoryInfo } from "@/utils/categoryRules";
import { useFinancialState } from "@/context";

const PILL = "rounded-full border px-2 py-0.5 text-xs font-medium";

interface ExpenseRowProps {
  expense: Expense;
  creditCards: CreditCardAccountInfo[];
  isEditing: boolean;
  isLastInserted: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseRow({ expense, creditCards, isEditing, isLastInserted, onEdit, onDelete }: ExpenseRowProps) {
  const { formatCurrency } = useCurrency();
  const state = useFinancialState();
  const monthlyEq = calculateMonthlyAmount(expense, new Date());
  const paymentBadge = getPaymentMethodBadge(expense.paymentMethod);
  const cardBadge = getCreditCardAccountBadge(expense.creditCardAccount, creditCards);
  const installmentProgress = expense.isInstallment && getInstallmentProgressDisplay(expense, new Date());
  const categoryLabel = getCategoryInfo(expense.category, state.userPlan.expenseCategories).fullLabel;

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:p-5",
        isEditing
          ? "bg-primary/5 ring-1 ring-inset ring-primary/40"
          : isLastInserted
            ? "bg-warning/5 ring-1 ring-inset ring-warning/30 hover:bg-warning/10"
            : "hover:bg-accent/40",
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-expense/20 bg-expense/10 text-expense">
          <ExpenseCategoryIcon category={expense.category} className="size-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{expense.name}</h3>
            {isLastInserted && (
              <span className={cn(PILL, "flex items-center gap-1 border-warning/40 bg-warning/10 text-warning")}>
                <span className="size-1.5 animate-pulse rounded-full bg-warning" aria-hidden />
                Última inserção
              </span>
            )}
            <span className={cn(PILL, "bg-muted text-muted-foreground")}>{categoryLabel}</span>
            {expense.recurring && (
              <span className={cn(PILL, "border-income/30 bg-card text-income")}>Recorrente</span>
            )}
            {expense.isInstallment && (
              <span className={cn(PILL, "border-warning/30 bg-warning/10 text-warning")}>
                {expense.installmentMonths ? `${expense.installmentMonths}x parcelas` : "Parcelado"}
              </span>
            )}
            {installmentProgress && (
              <span className="rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning">
                {installmentProgress}
              </span>
            )}
            {!expense.isActive && <span className={cn(PILL, "bg-muted text-muted-foreground")}>Inativo</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Método:</span>
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", paymentBadge.className)}>
                {paymentBadge.label}
              </span>
            </div>
            {cardBadge && (
              <div className="flex items-center gap-1.5">
                <span>Cartão:</span>
                <span className={cn("rounded px-1.5 py-0.5 text-xs", cardBadge.className)} style={cardBadge.style}>
                  {cardBadge.label}
                </span>
              </div>
            )}
            {expense.dueDate && (
              <span>
                Vencimento:{" "}
                <strong className="font-medium text-foreground">{formatLocalizedDate(expense.dueDate)}</strong>
              </span>
            )}
          </div>

          {expense.description && <p className="mt-1 text-xs text-muted-foreground">{expense.description}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-5 pl-12 sm:justify-end sm:pl-0">
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{formatCurrency(expense.amount)}</div>
          <div className="text-xs font-medium tabular-nums text-expense">{formatCurrency(monthlyEq)} / mês</div>
        </div>
        <RowActions
          itemLabel={`despesa ${expense.name}`}
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense)}
        />
      </div>
    </div>
  );
}
