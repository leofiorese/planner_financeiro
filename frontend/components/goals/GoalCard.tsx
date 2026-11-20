"use client";

import { GoalCategoryIcon, PriorityBadge } from "@/components/CategoryIcon";
import { RowActions } from "@/components/common/RowActions";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { GoalType, type Goal } from "@/types";
import { formatLocalizedMonth } from "@/utils/dateFormatting";
import { formatDate } from "@/utils/format";
import { getGoalCategoryLabel, getPriorityLabel } from "@/utils/labels";

export interface GoalForecastInfo {
  estimatedCompletionMonth?: string;
  onTrack: boolean;
  averageMonthlyAllocation: number;
}

interface GoalCardProps {
  goal: Goal;
  forecast: GoalForecastInfo;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

function getDaysUntilTarget(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRequiredMonthlyAllocation(goal: Goal) {
  if (goal.goalType === GoalType.OPEN_ENDED) return 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 0;
  const monthsUntilTarget = Math.max(
    1,
    Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  return remaining / monthsUntilTarget;
}

function formatCompletionDate(monthString?: string) {
  if (!monthString) return "Não estimada";
  const formatted = formatLocalizedMonth(monthString);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border bg-muted/40 p-2.5">
      <dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{children}</dd>
    </div>
  );
}

export function GoalCard({ goal, forecast, onEdit, onDelete }: GoalCardProps) {
  const { formatCurrency } = useCurrency();
  const progress = Math.min((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100, 100);
  const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
  const isOverdue = daysUntilTarget < 0;
  const isCompleted = progress >= 100;

  return (
    <article className="space-y-3.5 p-5 transition-colors hover:bg-accent/30">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <GoalCategoryIcon category={goal.category} className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{goal.name}</h3>
              <PriorityBadge priority={goal.priority} label={getPriorityLabel(goal.priority)} />
              <span className="text-xs font-medium text-muted-foreground">{getGoalCategoryLabel(goal.category)}</span>
            </div>
            {goal.description && <p className="mt-0.5 text-xs text-muted-foreground">{goal.description}</p>}
          </div>
        </div>

        <RowActions
          className="shrink-0 self-end sm:self-auto"
          itemLabel={`meta ${goal.name}`}
          onEdit={() => onEdit(goal)}
          onDelete={() => onDelete(goal)}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold tabular-nums">
            {formatCurrency(goal.currentAmount)}{" "}
            <span className="font-normal text-muted-foreground">/ {formatCurrency(goal.targetAmount)}</span>
          </span>
          <span className="font-semibold tabular-nums text-primary">{progress.toFixed(1)}%</span>
        </div>
        <Progress value={progress} className="h-2" aria-label={`Progresso da meta ${goal.name}`} />
      </div>

      <dl className="grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4">
        <Metric label="Aporte necessário">
          <span className="tabular-nums">{formatCurrency(getRequiredMonthlyAllocation(goal))}</span>{" "}
          <span className="text-xs font-normal text-muted-foreground">/ mês</span>
        </Metric>
        <Metric label="Data alvo">
          <span className="tabular-nums">{goal.targetDate ? formatDate(goal.targetDate) : "-"}</span>
        </Metric>
        <Metric label="Previsão">{formatCompletionDate(forecast.estimatedCompletionMonth)}</Metric>
        <Metric label="Status">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className={cn(isCompleted ? "text-income" : forecast.onTrack ? "text-primary" : "text-warning")}>
              {isCompleted ? "Concluída" : forecast.onTrack ? "No ritmo" : "Ajuste necessário"}
            </span>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-xs font-medium tabular-nums",
                isCompleted
                  ? "border-income/30 bg-income/10 text-income"
                  : isOverdue
                    ? "border-expense/30 bg-expense/10 text-expense"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isCompleted
                ? "Meta atingida"
                : isOverdue
                  ? `${Math.abs(daysUntilTarget)}d atraso`
                  : `${daysUntilTarget}d restantes`}
            </span>
          </div>
        </Metric>
      </dl>
    </article>
  );
}
