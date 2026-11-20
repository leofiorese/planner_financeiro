"use client";

import { Banknote, Flag, Plus, Target, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/context/CurrencyContext";
import type { Goal } from "@/types";

interface GoalsHeaderProps {
  goals: Goal[];
  onCreate: () => void;
}

export function GoalsHeader({ goals, onCreate }: GoalsHeaderProps) {
  const { formatCurrency } = useCurrency();
  const totalGoalAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalGoalAmount > 0 ? (totalCurrentAmount / totalGoalAmount) * 100 : 0;
  const activeCount = goals.filter((g) => g.isActive).length;

  return (
    <PageHeader
      title="Metas"
      description="Defina, acompanhe e alcance seus objetivos financeiros"
      actions={
        <Button onClick={onCreate}>
          <Plus aria-hidden />
          Nova meta
        </Button>
      }
    >
      <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Progresso geral</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(totalCurrentAmount)} / {formatCurrency(totalGoalAmount)}
          </span>
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{overallProgress.toFixed(1)}%</div>
        <Progress
          value={Math.min(100, overallProgress)}
          className="mt-2 h-2"
          aria-label="Progresso geral das metas"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Valor alvo" value={formatCurrency(totalGoalAmount)} hint="Total planejado" icon={Target} />
        <StatCard
          label="Progresso atual"
          value={formatCurrency(totalCurrentAmount)}
          hint="Capital acumulado"
          icon={Wallet}
          tone="income"
        />
        <StatCard
          label="Restante"
          value={formatCurrency(Math.max(0, totalGoalAmount - totalCurrentAmount))}
          hint="Para a meta total"
          icon={Banknote}
        />
        <StatCard
          label="Total de objetivos"
          value={goals.length}
          hint={`${activeCount} ativas no plano`}
          icon={Flag}
          tone="primary"
        />
      </div>
    </PageHeader>
  );
}
