"use client";

import { Plus, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { RowActions } from "@/components/common/RowActions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Income } from "@/types";
import { calculateRecurringMonthlyAmount } from "@/utils/forecastCalculator";
import { formatDate, getFrequencyLabel, formatCurrency } from "@/utils/format";

interface IncomeListProps {
  incomes: Income[];
  editingId: string | null;
  onCreate: () => void;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

export function IncomeList({ incomes, editingId, onCreate, onEdit, onDelete }: IncomeListProps) {
  const activeCount = incomes.filter((i) => i.isActive).length;

  return (
    <section aria-label="Fontes de renda" className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          Fontes de renda
          <span className="text-sm font-normal text-muted-foreground">({incomes.length})</span>
        </h2>
        <span className="text-sm text-muted-foreground">
          {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
        </span>
      </div>

      {incomes.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={TrendingUp}
            title="Nenhuma renda encontrada"
            description="Comece adicionando suas fontes de renda para ver sua projeção anual."
            action={
              <Button onClick={onCreate}>
                <Plus aria-hidden />
                Nova renda
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y">
          {incomes.map((income) => {
            const monthly = calculateRecurringMonthlyAmount(income.amount, income.frequency);
            return (
              <li
                key={income.id}
                className={cn(
                  "flex flex-col justify-between gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:p-5",
                  editingId === income.id ? "border-l-4 border-l-income bg-income/5" : "hover:bg-accent/40",
                )}
              >
                <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-income/20 bg-income/10 text-income">
                    <TrendingUp className="size-4" aria-hidden />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{income.name}</h3>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          income.isActive
                            ? "border-income/30 bg-income/10 text-income"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {income.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Frequência:{" "}
                        <strong className="font-medium text-foreground">{getFrequencyLabel(income.frequency)}</strong>
                      </span>
                      {income.startDate && (
                        <span>
                          • Início:{" "}
                          <strong className="font-medium text-foreground">{formatDate(income.startDate)}</strong>
                        </span>
                      )}
                      {income.endDate && (
                        <span>
                          • Término:{" "}
                          <strong className="font-medium text-foreground">{formatDate(income.endDate)}</strong>
                        </span>
                      )}
                    </div>

                    {income.description && <p className="mt-1 text-xs text-muted-foreground">{income.description}</p>}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-5 pl-12 sm:justify-end sm:pl-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{formatCurrency(income.amount)}</div>
                    <div className="text-xs font-medium tabular-nums text-income">
                      {formatCurrency(monthly)} / mês
                    </div>
                  </div>
                  <RowActions
                    itemLabel={`renda ${income.name}`}
                    onEdit={() => onEdit(income)}
                    onDelete={() => onDelete(income)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
