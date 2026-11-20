"use client";

import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { useCurrency } from "@/context/CurrencyContext";

interface DashboardKpisProps {
  annualIncome: number;
  annualExpenses: number;
  annualNet: number;
  savingsRate: number;
}

export function DashboardKpis({ annualIncome, annualExpenses, annualNet, savingsRate }: DashboardKpisProps) {
  const { formatCurrency } = useCurrency();
  const monthlyNet = annualNet / 12;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Renda anual"
        value={formatCurrency(annualIncome)}
        hint={`~${formatCurrency(annualIncome / 12)} / mês`}
        icon={ArrowUpRight}
        tone="income"
      />
      <StatCard
        label="Despesas anuais"
        value={formatCurrency(annualExpenses)}
        hint={`~${formatCurrency(annualExpenses / 12)} / mês`}
        icon={ArrowDownRight}
        tone="expense"
      />
      <StatCard
        label="Saldo anual"
        value={formatCurrency(annualNet)}
        hint={`Taxa de poupança: ${savingsRate.toFixed(1)}%`}
        icon={annualNet >= 0 ? TrendingUp : TrendingDown}
        tone={annualNet >= 0 ? "default" : "expense"}
      />
      <StatCard
        label="Fluxo mensal"
        value={formatCurrency(monthlyNet)}
        hint={
          monthlyNet >= 0
            ? "Fluxo de caixa positivo"
            : monthlyNet >= -500
              ? "Fluxo de caixa apertado"
              : "Fluxo de caixa negativo"
        }
        icon={Wallet}
        tone={monthlyNet >= 0 ? "income" : monthlyNet >= -500 ? "warning" : "expense"}
      />
    </div>
  );
}
