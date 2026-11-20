"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import { formatMonthTitle } from "@/components/expenses/expense-labels";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";
import { PaymentMethod, type Expense } from "@/types";
import { aggregateExpensesByMonth, calculateMonthlyAmount } from "@/utils/expenseOperations";
import { getInstallmentProgressDisplay } from "@/utils/installmentCalculator";

interface ExpenseCalendarProps {
  expenses: Expense[];
  currentMonthKey: string;
  currentInvoiceMonthKey: string;
  lastInsertedId: string | null;
  onEdit: (expense: Expense) => void;
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-3 py-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", className)}>{value}</span>
    </div>
  );
}

export function ExpenseCalendar({
  expenses,
  currentMonthKey,
  currentInvoiceMonthKey,
  lastInsertedId,
  onEdit,
}: ExpenseCalendarProps) {
  const currentRealYear = new Date().getFullYear();
  const [year, setYear] = useState(currentRealYear);

  const monthlyData = useMemo(
    () => aggregateExpensesByMonth(expenses, new Date(year, 0, 1), 12),
    [expenses, year],
  );

  const summary = useMemo(() => {
    const totalAnnual = monthlyData.reduce((sum, m) => sum + m.totalAmount, 0);
    const totalCardsAnnual = monthlyData.reduce((sum, m) => {
      const [y, mon] = m.month.split("-").map(Number);
      const target = new Date(y, mon - 1, 1);
      return (
        sum +
        m.expenses
          .filter((e) => e.paymentMethod === PaymentMethod.CREDIT_CARD)
          .reduce((s, e) => s + calculateMonthlyAmount(e, target), 0)
      );
    }, 0);
    return { totalAnnual, totalCardsAnnual, monthlyAvg: totalAnnual / 12 };
  }, [monthlyData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setYear((y) => y - 1)} aria-label={`Ir para ${year - 1}`}>
            <ChevronLeft aria-hidden />
            <span className="tabular-nums">{year - 1}</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums">{year}</span>
            {year === currentRealYear ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Ano atual
              </span>
            ) : (
              <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setYear(currentRealYear)}>
                Ir para {currentRealYear}
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={() => setYear((y) => y + 1)} aria-label={`Ir para ${year + 1}`}>
            <span className="tabular-nums">{year + 1}</span>
            <ChevronRight aria-hidden />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Kpi label="Total anual" value={formatCurrency(summary.totalAnnual)} className="text-expense" />
          <Kpi label="Faturas de cartão" value={formatCurrency(summary.totalCardsAnnual)} className="text-purple-600 dark:text-purple-300" />
          <Kpi label="Média mensal" value={formatCurrency(summary.monthlyAvg)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {monthlyData.map((monthData) => {
          const isCurrentMonth = monthData.month === currentMonthKey;
          const isCurrentInvoice = monthData.month === currentInvoiceMonthKey;
          const [mYear, mMonth] = monthData.month.split("-").map(Number);
          const mDate = new Date(mYear, mMonth - 1, 1);
          const cardTotal = monthData.expenses
            .filter((e) => e.paymentMethod === PaymentMethod.CREDIT_CARD)
            .reduce((sum, e) => sum + calculateMonthlyAmount(e, mDate), 0);

          return (
            <section
              key={monthData.month}
              aria-label={formatMonthTitle(monthData.month)}
              className={cn(
                "flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors",
                isCurrentMonth && "bg-primary/5 ring-2 ring-primary",
                !isCurrentMonth && isCurrentInvoice && "bg-purple-500/5 ring-2 ring-purple-500",
              )}
            >
              <div>
                <div className="mb-2.5 flex items-center justify-between gap-2 border-b pb-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-semibold">{formatMonthTitle(monthData.month)}</h3>
                    {isCurrentMonth && (
                      <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        Mês atual
                      </span>
                    )}
                    {isCurrentInvoice && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                        <CreditCard className="size-3" aria-hidden />
                        Fatura atual
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-expense">
                    {formatCurrency(monthData.totalAmount)}
                  </span>
                </div>

                {cardTotal > 0 && (
                  <div className="mb-2 flex items-center justify-between rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                    <span className="flex items-center gap-1">
                      <CreditCard className="size-3" aria-hidden />
                      Fatura do cartão:
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(cardTotal)}</span>
                  </div>
                )}

                <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {monthData.expenses.length > 0 ? (
                    monthData.expenses.map((expense) => {
                      const progress = getInstallmentProgressDisplay(
                        expense,
                        new Date(monthData.month + "-01T12:00:00"),
                      );
                      const isLast = expense.id === lastInsertedId;
                      return (
                        <li key={expense.id}>
                          <button
                            type="button"
                            onClick={() => onEdit(expense)}
                            aria-label={`Editar despesa ${expense.name}`}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left text-xs transition-colors hover:border-primary",
                              isLast ? "border-warning/50 bg-warning/10" : "bg-muted/40",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="shrink-0 text-muted-foreground">
                                <ExpenseCategoryIcon category={expense.category} className="size-3.5" />
                              </span>
                              <span className="truncate font-medium">{expense.name}</span>
                              {isLast && (
                                <span className="shrink-0 rounded border border-warning/40 bg-warning/15 px-1 py-0.5 text-xs font-semibold text-warning">
                                  Último
                                </span>
                              )}
                              {progress && (
                                <span className="shrink-0 rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning">
                                  {progress}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatCurrency(
                                calculateMonthlyAmount(expense, new Date(monthData.month + "-01T00:00:00Z")),
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-6 text-center text-xs italic text-muted-foreground">Sem despesas neste mês</li>
                  )}
                </ul>
              </div>

              <div className="mt-2 border-t pt-2 text-right text-xs font-medium text-muted-foreground">
                {monthData.expenses.length} {monthData.expenses.length === 1 ? "item" : "itens"}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
