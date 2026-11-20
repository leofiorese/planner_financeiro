"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CreditCard, Plus, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ExpenseRow } from "@/components/expenses/ExpenseRow";
import { getGroupHeaderLabel } from "@/components/expenses/expense-labels";
import type { ExpenseFiltersState } from "@/components/expenses/hooks/useExpenseFilters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/context/CurrencyContext";
import type { CreditCardAccountInfo, Expense } from "@/types";
import { getCategoryInfo } from "@/utils/categoryRules";
import { ExpenseGroupBy } from "@/utils/expenseOperations";
import { useFinancialState } from "@/context";

interface ExpenseListProps {
  filtersState: ExpenseFiltersState;
  totalCount: number;
  totalMonthlyExpenses: number;
  creditCards: CreditCardAccountInfo[];
  editingId: string | null;
  lastInsertedId: string | null;
  currentMonthKey: string;
  currentInvoiceMonthKey: string;
  onCreate: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

/** Janela de páginas com reticências: 1 … 4 5 6 … 20 */
function getPageWindow(current: number, totalPages: number, maxButtons = 5): (number | "dots")[] {
  const pages: (number | "dots")[] = [];
  let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push("dots");
  }
  for (let p = startPage; p <= endPage; p++) pages.push(p);
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push("dots");
    pages.push(totalPages);
  }
  return pages;
}

export function ExpenseList({
  filtersState,
  totalCount,
  totalMonthlyExpenses,
  creditCards,
  editingId,
  lastInsertedId,
  currentMonthKey,
  currentInvoiceMonthKey,
  onCreate,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  const { formatCurrency } = useCurrency();
  const state = useFinancialState();
  const {
    groupBy,
    activeFiltersCount,
    clearFilters,
    pagination,
    setPage,
    setPageSize,
    pageItems,
    pageGroups,
  } = filtersState;
  const { page, pageSize, total, totalPages, startIndex, endIndex } = pagination;

  const renderRow = (expense: Expense) => (
    <ExpenseRow
      key={expense.id}
      expense={expense}
      creditCards={creditCards}
      isEditing={editingId === expense.id}
      isLastInserted={expense.id === lastInsertedId}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <section aria-label="Lista de despesas" className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
          Despesas
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? "item" : "itens"}
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-xs font-normal text-primary">(filtrado de {totalCount})</span>
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold tabular-nums text-expense">
            Total: {formatCurrency(totalMonthlyExpenses)} / mês
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span id="expense-page-size-label">Por página:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger aria-labelledby="expense-page-size-label" size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={ReceiptText}
            title="Nenhuma despesa encontrada"
            description={
              activeFiltersCount > 0
                ? "Nenhuma despesa corresponde aos filtros selecionados. Tente limpar os filtros."
                : "Adicione suas despesas para acompanhar seus padrões de gastos."
            }
            action={
              activeFiltersCount > 0 ? (
                <Button onClick={clearFilters}>Limpar filtros</Button>
              ) : (
                <Button onClick={onCreate}>
                  <Plus aria-hidden />
                  Nova despesa
                </Button>
              )
            }
          />
        </div>
      ) : groupBy !== ExpenseGroupBy.NONE ? (
        <div>
          {pageGroups.map((group) => (
            <div key={group.key} className="border-b last:border-b-0">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/60 px-5 py-2.5 text-sm font-semibold">
                <div className="flex flex-wrap items-center gap-2">
                  {groupBy !== ExpenseGroupBy.CATEGORY && <span aria-hidden>{group.icon}</span>}
                  <span>
                    {groupBy === ExpenseGroupBy.CATEGORY
                      ? getCategoryInfo(group.key, state.userPlan.expenseCategories).fullLabel
                      : getGroupHeaderLabel(group.key, groupBy, group.label)}
                  </span>
                  {groupBy === ExpenseGroupBy.MONTH && group.key === currentMonthKey && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Mês atual
                    </span>
                  )}
                  {groupBy === ExpenseGroupBy.MONTH && group.key === currentInvoiceMonthKey && (
                    <span className="flex items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                      <CreditCard className="size-3" aria-hidden />
                      Fatura atual
                    </span>
                  )}
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {group.count} {group.count === 1 ? "item" : "itens"}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-expense">
                  {formatCurrency(group.totalAmount)}
                </span>
              </div>
              <div className="divide-y">{group.expenses.map(renderRow)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y">{pageItems.map(renderRow)}</div>
      )}

      {total > 0 && (
        <div className="flex flex-col gap-4 border-t bg-muted/30 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Mostrando <strong className="font-semibold tabular-nums text-foreground">{startIndex + 1}</strong> a{" "}
            <strong className="font-semibold tabular-nums text-foreground">{endIndex}</strong> de{" "}
            <strong className="font-semibold tabular-nums text-foreground">{total}</strong> despesas
          </p>

          {totalPages > 1 && (
            <nav aria-label="Paginação" className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                aria-label="Primeira página"
              >
                <ChevronsLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft aria-hidden />
              </Button>
              {getPageWindow(page, totalPages).map((p, idx) =>
                p === "dots" ? (
                  <span key={`dots-${idx}`} className="px-1.5 text-muted-foreground" aria-hidden>
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(p)}
                    aria-label={`Página ${p}`}
                    aria-current={p === page ? "page" : undefined}
                    className="tabular-nums"
                  >
                    {p}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                aria-label="Próxima página"
              >
                <ChevronRight aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                aria-label="Última página"
              >
                <ChevronsRight aria-hidden />
              </Button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
