"use client";

import Link from "next/link";
import { GoalCategoryIcon, PriorityBadge } from "@/components/CategoryIcon";
import { SectionCard } from "@/components/common/SectionCard";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";
import { formatDate, formatCurrency } from "@/utils/format";

interface UpcomingGoalsProps {
  goals: Goal[];
  totalActive: number;
}

export function UpcomingGoals({ goals, totalActive }: UpcomingGoalsProps) {

  return (
    <SectionCard
      title="Metas próximas (próximos 6 meses)"
      actions={
        <Link href="/goals" className="text-sm font-medium text-primary hover:underline">
          Ver todas ({totalActive})
        </Link>
      }
    >
      {goals.length > 0 ? (
        <ul className="space-y-2.5">
          {goals.map((goal) => {
            const daysUntilTarget = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const progress = (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100;
            const isOverdue = daysUntilTarget < 0;
            const isUrgent = daysUntilTarget <= 30 && daysUntilTarget >= 0;

            return (
              <li key={goal.id} className="rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/60">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 p-1 text-primary">
                      <GoalCategoryIcon category={goal.category} className="size-3.5" />
                    </span>
                    <span className="truncate text-sm font-semibold">{goal.name}</span>
                    <PriorityBadge priority={goal.priority} />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                      isOverdue
                        ? "border-expense/30 bg-expense/10 text-expense"
                        : isUrgent
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isOverdue ? `${Math.abs(daysUntilTarget)}d atrasado` : `${daysUntilTarget}d restantes`}
                  </span>
                </div>

                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    <span className="ml-2">(Prazo: {formatDate(goal.targetDate)})</span>
                  </span>
                  <span className="font-semibold tabular-nums text-primary">{progress.toFixed(0)}%</span>
                </div>

                <Progress
                  value={Math.min(100, Math.max(3, progress))}
                  className="h-1.5"
                  aria-label={`Progresso da meta ${goal.name}`}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma meta prevista para os próximos 6 meses.
          <div className="mt-2">
            <Link href="/goals" className="font-medium text-primary hover:underline">
              Criar um objetivo financeiro
            </Link>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
