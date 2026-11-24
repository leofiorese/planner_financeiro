"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Callout } from "@/components/common/Callout";
import { SectionCard } from "@/components/common/SectionCard";
import type { InvestmentSummary } from "@/components/investments/hooks/useInvestmentSummary";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { InvestmentSettings } from "@/types";
import { formatCurrency, formatMonth } from "@/utils/format";
import { averageMonthlyNetFlow } from "@/utils/investments/returns";
import { formatPercent } from "@/utils/investments/series";
import { projectWealthTarget } from "@/utils/investments/target";

interface WealthGoalCardProps {
  summary: InvestmentSummary;
  settings: InvestmentSettings;
}

/** Meta de patrimônio: progresso, projeção no ritmo atual e o aporte necessário para o prazo. */
export function WealthGoalCard({ summary, settings }: WealthGoalCardProps) {
  const { latest, total, returns } = summary;
  const { wealthTargetAmount: target, wealthTargetDate: targetMonth, targetReturnAnnual } = settings;

  const projection = useMemo(() => {
    if (!latest || target === null || !targetMonth) return null;
    // Rentabilidade da projeção: a meta definida; sem ela, a realizada; sem nenhuma, 0%.
    const annualReturnPct = targetReturnAnnual ?? (returns.annualized !== null ? returns.annualized * 100 : 0);
    const monthlyContribution = averageMonthlyNetFlow(returns);
    return {
      annualReturnPct,
      monthlyContribution,
      ...projectWealthTarget({
        currentBalance: total,
        currentMonth: latest.month,
        targetAmount: target,
        targetMonth,
        annualReturnPct,
        monthlyContribution,
      }),
    };
  }, [latest, target, targetMonth, targetReturnAnnual, returns, total]);

  if (target === null || !targetMonth) {
    return (
      <SectionCard title="Meta de patrimônio" description="Quanto você quer ter e até quando.">
        <Callout>
          <p>
            Nenhuma meta definida. Cadastre o valor e o mês-alvo em{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2">
              Configurações → Investimentos
            </Link>{" "}
            para acompanhar o progresso e a projeção.
          </p>
        </Callout>
      </SectionCard>
    );
  }

  const progress = Math.min(100, Math.max(0, (total / target) * 100));
  const remaining = Math.max(0, target - total);

  return (
    <SectionCard
      title="Meta de patrimônio"
      description={`${formatCurrency(target)} até ${formatMonth(targetMonth)}.`}
      actions={
        projection ? (
          <Badge variant={projection.onTrack ? "default" : "outline"}>
            {projection.monthsToDeadline <= 0 && total < target
              ? "Prazo vencido"
              : projection.onTrack
                ? "No caminho"
                : "Abaixo do ritmo"}
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
            <span className="text-muted-foreground tabular-nums">{formatPercent(total / target, 1)} da meta</span>
          </div>
          <Progress value={progress} aria-label="Progresso da meta de patrimônio" />
          <p className="text-xs text-muted-foreground">
            {remaining > 0 ? `Faltam ${formatCurrency(remaining)}.` : "Meta alcançada."}
          </p>
        </div>

        {projection && remaining > 0 && (
          <ul className="space-y-2 text-sm">
            <li>
              Com aportes de <strong className="tabular-nums">{formatCurrency(projection.monthlyContribution)}</strong> por mês
              (média recente) e rentabilidade de{" "}
              <strong className="tabular-nums">{formatPercent(projection.annualReturnPct / 100, 1)}</strong> a.a.,
              {projection.monthsToDeadline > 0 ? (
                <>
                  {" "}
                  você chega a <strong className="tabular-nums">{formatCurrency(projection.projectedAtTarget)}</strong> em{" "}
                  {formatMonth(targetMonth)}.
                </>
              ) : (
                " o prazo já passou."
              )}
            </li>
            {!projection.onTrack && (
              <li className="text-muted-foreground">
                {projection.reachedMonth
                  ? `Nesse ritmo, a meta é alcançada em ${formatMonth(projection.reachedMonth)}.`
                  : "Nesse ritmo, a meta não é alcançada nos próximos 100 anos."}
              </li>
            )}
            {projection.requiredMonthlyContribution !== null && !projection.onTrack && (
              <li>
                Para chegar no prazo, aporte cerca de{" "}
                <strong className="tabular-nums">{formatCurrency(projection.requiredMonthlyContribution)}</strong> por mês.
              </li>
            )}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
