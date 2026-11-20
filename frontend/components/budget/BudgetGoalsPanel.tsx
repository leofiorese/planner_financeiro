"use client";

import React from "react";
import Link from "next/link";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFinancialState } from "@/context";
import { formatCurrency } from "@/utils/format";
import type { BudgetStatus } from "@/utils/budget/budgetCalculator";

/** Metas que reservam do budget: Z por período (automático/manual) e progresso da meta. */
export default function BudgetGoalsPanel({ status }: { status: BudgetStatus }) {
  const { userPlan } = useFinancialState();

  return (
    <SectionCard
      title="Metas que reservam"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/goals">Gerenciar metas →</Link>
        </Button>
      }
    >
      {status.reserves.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma meta reserva do budget. Ligue &ldquo;Reservar do budget mensal&rdquo; em uma meta para separar um valor por
          período.
        </p>
      ) : (
        <ul className="space-y-4">
          {status.reserves.map((reserve) => {
            const goal = userPlan.goals.find((g) => g.id === reserve.goalId);
            if (!goal) return null;
            const progress = Math.min(100, (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100);
            return (
              <li key={reserve.goalId}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold" title={goal.name}>
                    {goal.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <strong>{formatCurrency(reserve.amount)}</strong>
                    <span className="text-muted-foreground">/período · {reserve.isManual ? "manual" : "automático"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="h-1.5 flex-1" aria-label={`Progresso da meta ${goal.name}`} />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
