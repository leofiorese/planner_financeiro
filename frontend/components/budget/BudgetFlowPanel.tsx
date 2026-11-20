"use client";

import React from "react";
import { Callout } from "@/components/common/Callout";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import type { BudgetStatus, FeasibilityResult } from "@/utils/budget/budgetCalculator";

interface BudgetFlowPanelProps {
  status: BudgetStatus;
  feasibility: FeasibilityResult;
  /** Chamado ao aceitar o "Budget realista"; só oferecido no período atual */
  onAdjustBudget?: (amount: number) => void;
}

/** Receita × Despesas × Metas do período, com a economia inferida e o alerta de viabilidade. */
export default function BudgetFlowPanel({ status, feasibility, onAdjustBudget }: BudgetFlowPanelProps) {
  const rows = [
    { key: "income", label: "Receita do período", value: status.income, bar: "bg-income" },
    { key: "expenses", label: "Despesas (gasto + previsto)", value: status.projectedTotal, bar: "bg-expense" },
    { key: "goals", label: "Reservado para metas", value: status.reserveTotal, bar: "bg-primary" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const savings = status.inferredSavings;

  return (
    <SectionCard title="Receita × Despesas × Metas">
      <div className="space-y-4">
        {!feasibility.feasible && (
          <Callout tone="warning" role="alert">
            <p>
              Sua receita do período ({formatCurrency(status.income)}) menos as metas ({formatCurrency(status.reserveTotal)})
              não cobre o budget de {formatCurrency(status.budgetAmount)}. Budget realista:{" "}
              <strong>{formatCurrency(feasibility.suggestedBudget)}</strong>.
            </p>
            {onAdjustBudget && status.isCurrent && (
              <Button size="sm" onClick={() => onAdjustBudget(feasibility.suggestedBudget)}>
                Ajustar budget para {formatCurrency(feasibility.suggestedBudget)}
              </Button>
            )}
          </Callout>
        )}

        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(row.value)}</span>
              </div>
              <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", row.bar)} style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Economia inferida (receita − despesas)</span>
          <strong className={cn("tabular-nums", savings >= 0 ? "text-income" : "text-expense")}>
            {savings < 0 ? "−" : ""}
            {formatCurrency(Math.abs(savings))}
            <span className="sr-only">{savings >= 0 ? " (sobra)" : " (falta)"}</span>
          </strong>
        </div>

        {status.income <= 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma receita cadastrada neste período: cadastre sua renda para ver a economia e a viabilidade do budget.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
