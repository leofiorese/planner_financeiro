"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import { SectionCard } from "@/components/common/SectionCard";
import type { RecentTransaction } from "@/components/dashboard/useDashboardData";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { getCategoryInfo } from "@/utils/categoryRules";
import { formatDate } from "@/utils/format";

export function RecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  const { formatCurrency } = useCurrency();
  const state = useFinancialState();

  if (transactions.length === 0) return null;

  return (
    <SectionCard
      title="Lançamentos recentes (despesas e rendas)"
      actions={
        <div className="flex items-center gap-3 text-sm">
          <Link href="/expenses" className="font-medium text-expense hover:underline">
            Ver despesas
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            |
          </span>
          <Link href="/income" className="font-medium text-income hover:underline">
            Ver rendas
          </Link>
        </div>
      }
    >
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {transactions.map((tx) => (
          <li
            key={tx.id}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/40"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                  tx.type === "income"
                    ? "border-income/30 bg-income/10 text-income"
                    : "border-expense/30 bg-expense/10 text-expense",
                )}
              >
                {tx.type === "income" ? (
                  <Plus className="size-4" aria-hidden />
                ) : tx.category ? (
                  <ExpenseCategoryIcon category={tx.category} className="size-4" />
                ) : (
                  <Minus className="size-4" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{tx.name}</h3>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatDate(tx.date)}</span>
                  {tx.isRecurring && (
                    <>
                      <span aria-hidden>•</span>
                      <span className="rounded border bg-muted px-1.5 py-0.5 text-xs">Recorrente</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  tx.type === "income" ? "text-income" : "text-expense",
                )}
              >
                {tx.type === "income" ? "+" : "-"} {formatCurrency(tx.amount)}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {tx.type === "income"
                  ? "Renda"
                  : getCategoryInfo(tx.category, state.userPlan?.expenseCategories).fullLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
