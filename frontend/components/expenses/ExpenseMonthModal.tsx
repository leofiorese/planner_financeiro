"use client";

import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import {
  formatMonthTitle,
  getCreditCardAccountBadge,
  getPaymentMethodBadge,
} from "@/components/expenses/expense-labels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  PaymentMethod,
  type CreditCardAccountInfo,
  type Expense,
  type ExpenseCategoryConfig,
} from "@/types";
import { getCategoryInfo } from "@/utils/categoryRules";
import { formatCurrency } from "@/utils/format";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";
import { getInstallmentProgressDisplay } from "@/utils/installmentCalculator";

interface ExpenseMonthModalProps {
  /** `YYYY-MM` do mês aberto; `null` mantém o modal fechado. */
  monthKey: string | null;
  /** Despesas já filtradas que se aplicam ao mês (mesma lista do bloco do calendário). */
  expenses: Expense[];
  categories: ExpenseCategoryConfig[];
  creditCards: CreditCardAccountInfo[];
  isCurrentInvoice: boolean;
  lastInsertedId: string | null;
  onEdit: (expense: Expense) => void;
  onClose: () => void;
}

function Kpi({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 px-3 py-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", className)}>{value}</span>
    </div>
  );
}

/** Mês do calendário em modal quase tela cheia, com todas as despesas do mês em linhas largas. */
export function ExpenseMonthModal({
  monthKey,
  expenses,
  categories,
  creditCards,
  isCurrentInvoice,
  lastInsertedId,
  onEdit,
  onClose,
}: ExpenseMonthModalProps) {
  const rows = useMemo(() => {
    if (!monthKey) return [];
    const [y, m] = monthKey.split("-").map(Number);
    const monthDate = new Date(y, m - 1, 1);
    return expenses
      .map((expense) => ({
        expense,
        amount: calculateMonthlyAmount(expense, monthDate),
        progress: getInstallmentProgressDisplay(expense, new Date(y, m - 1, 15)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, monthKey]);

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  const cardTotal = rows
    .filter((r) => r.expense.paymentMethod === PaymentMethod.CREDIT_CARD)
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <Dialog open={monthKey !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] flex-col gap-0 rounded-2xl p-0 sm:max-w-[min(1200px,96vw)]">
        <DialogHeader className="shrink-0 gap-3 border-b px-6 py-4 pr-14 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl">{monthKey ? formatMonthTitle(monthKey) : ""}</DialogTitle>
            {isCurrentInvoice && (
              <span className="flex items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                <CreditCard className="size-3" aria-hidden />
                Fatura atual
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">
            Todas as despesas do mês. Selecione uma despesa para editá-la.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Kpi label="Total do mês" value={formatCurrency(total)} className="text-expense" />
            <Kpi
              label="Fatura do cartão"
              value={formatCurrency(cardTotal)}
              className="text-purple-600 dark:text-purple-300"
            />
            <Kpi label="Itens" value={String(rows.length)} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm italic text-muted-foreground">Sem despesas neste mês</p>
          ) : (
            <ul className="space-y-2">
              {rows.map(({ expense, amount, progress }) => {
                const category = getCategoryInfo(expense.category, categories);
                const paymentBadge = getPaymentMethodBadge(expense.paymentMethod);
                const cardBadge =
                  expense.paymentMethod === PaymentMethod.CREDIT_CARD
                    ? getCreditCardAccountBadge(expense.creditCardAccount, creditCards)
                    : null;
                const isLast = expense.id === lastInsertedId;
                return (
                  <li key={expense.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(expense)}
                      aria-label={`Editar despesa ${expense.name}`}
                      className={cn(
                        "flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border p-3 text-left transition-colors hover:border-primary",
                        isLast ? "border-warning/50 bg-warning/10" : "bg-muted/40",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-muted-foreground">
                          <ExpenseCategoryIcon category={expense.category} className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{expense.name}</span>
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
                          <span className="block truncate text-xs text-muted-foreground">
                            {category.emoji} {category.name}
                            {expense.description ? ` · ${expense.description}` : ""}
                          </span>
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", paymentBadge.className)}>
                          {paymentBadge.label}
                        </span>
                        {cardBadge && (
                          <span
                            className={cn("rounded px-1.5 py-0.5 text-xs", cardBadge.className)}
                            style={cardBadge.style}
                          >
                            {cardBadge.label}
                          </span>
                        )}
                      </span>

                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
