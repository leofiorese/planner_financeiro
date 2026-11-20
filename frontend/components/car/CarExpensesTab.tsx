"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import type { CarStatsData } from "@/components/car/hooks/useCarStats";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";
import { ExpenseCategory } from "@/types";
import { calculateMonthlyAmount } from "@/utils/expenseOperations";

export function CarExpensesTab({ stats }: { stats: CarStatsData }) {
  const { transportExpenses, totalTransportMonthly } = stats;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Despesas de transporte vinculadas ao plano</h2>
          <p className="text-sm text-muted-foreground">
            Todas as despesas da categoria Transporte registradas em Despesas
          </p>
        </div>
        <Link href="/expenses" className={cn(buttonVariants({ variant: "outline" }))}>
          Gerenciar em Despesas
          <ArrowRight aria-hidden />
        </Link>
      </div>

      {transportExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa de transporte ativa encontrada"
          description="Cadastre despesas como Seguro, IPVA, Estacionamento ou Financiamento na página de Despesas."
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {transportExpenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3.5 text-sm hover:bg-accent/40">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ExpenseCategoryIcon category={ExpenseCategory.TRANSPORTATION} className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.recurring ? "Recorrente mensal" : "Despesa pontual"} • Vencimento dia{" "}
                    {e.dueDate?.slice(8, 10) || "—"}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-semibold tabular-nums">{formatCurrency(calculateMonthlyAmount(e))}</span>
                <span className="block text-xs text-muted-foreground">/ mês</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-muted/50 p-3.5 text-sm font-semibold">
            <span>Total mensal em transporte:</span>
            <span className="tabular-nums text-primary">{formatCurrency(totalTransportMonthly)} / mês</span>
          </div>
        </div>
      )}
    </div>
  );
}
