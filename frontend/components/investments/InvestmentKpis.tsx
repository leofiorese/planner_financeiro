"use client";

import { Coins, PiggyBank, Target, TrendingUp } from "lucide-react";
import { StatCard, type StatTrend } from "@/components/common/StatCard";
import type { InvestmentSummary } from "@/components/investments/hooks/useInvestmentSummary";
import type { InvestmentSettings } from "@/types";
import { formatCurrency, formatMonth } from "@/utils/format";
import { formatPercent, formatPp } from "@/utils/investments/series";

interface InvestmentKpisProps {
  summary: InvestmentSummary;
  settings: InvestmentSettings;
}

export function InvestmentKpis({ summary, settings }: InvestmentKpisProps) {
  const { latest, total, mom, evolution, returns, comparison } = summary;
  const last = evolution[evolution.length - 1];

  const trend: StatTrend | undefined = mom
    ? {
        direction: mom.change > 0 ? "up" : mom.change < 0 ? "down" : "flat",
        label: `${mom.change > 0 ? "+" : mom.change < 0 ? "−" : ""}${formatCurrency(Math.abs(mom.change))}${
          mom.changePct !== null ? ` (${formatPercent(mom.changePct, 1)})` : ""
        } vs. anterior`,
      }
    : undefined;

  const needsSecond = "Disponível a partir do 2º lançamento";
  const target = settings.targetReturnAnnual;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard
        label="Patrimônio atual"
        value={formatCurrency(total)}
        hint={latest ? `Lançamento de ${formatMonth(latest.month)}` : undefined}
        trend={trend}
        icon={Coins}
        tone="primary"
        compact
      />
      <StatCard
        label="Total investido"
        value={formatCurrency(last?.invested ?? 0)}
        hint="1º lançamento + aportes líquidos"
        icon={PiggyBank}
        compact
      />
      <StatCard
        label="Ganho acumulado"
        value={returns.accumulated === null ? "—" : formatCurrency(returns.totalGain)}
        hint={returns.accumulated === null ? needsSecond : `Rentabilidade acumulada de ${formatPercent(returns.accumulated)}`}
        icon={TrendingUp}
        tone={returns.accumulated === null ? "default" : returns.totalGain >= 0 ? "income" : "expense"}
        compact
      />
      <StatCard
        label="Rentabilidade anualizada"
        value={returns.annualized === null ? "—" : `${formatPercent(returns.annualized)} a.a.`}
        hint={
          returns.annualized === null
            ? needsSecond
            : comparison
              ? `Meta de ${formatPercent(comparison.targetAnnualPct / 100, 1)} a.a.: ${
                  comparison.status === "on" ? "na meta" : `${formatPp(comparison.diffPp)} ${comparison.status === "above" ? "acima" : "abaixo"}`
                }`
              : target === null
                ? "Defina a meta em Configurações"
                : undefined
        }
        icon={Target}
        tone={comparison ? (comparison.status === "below" ? "warning" : "income") : "default"}
        compact
      />
    </div>
  );
}
