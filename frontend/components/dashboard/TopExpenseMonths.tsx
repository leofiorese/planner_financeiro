"use client";

import { SectionCard } from "@/components/common/SectionCard";
import { useCurrency } from "@/context/CurrencyContext";

interface TopExpenseMonthsProps {
  months: { month: string; amount: number; monthName: string }[];
}

export function TopExpenseMonths({ months }: TopExpenseMonthsProps) {
  const { formatCurrency } = useCurrency();
  const maxAmount = Math.max(...months.map((m) => m.amount), 1);

  return (
    <SectionCard title="Meses com maior volume de despesas (12M)" description="Calculado pelo motor de projeção">
      {months.length > 0 ? (
        <ol className="space-y-3">
          {months.map((m, idx) => (
            <li key={m.month} className="space-y-1.5 rounded-lg p-2 transition-colors hover:bg-accent/40">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  #{idx + 1} {m.monthName}
                </span>
                <span className="font-semibold tabular-nums text-expense">{formatCurrency(m.amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="presentation">
                <div
                  className="h-full rounded-full bg-expense transition-all duration-300"
                  style={{ width: `${Math.max(4, (m.amount / maxAmount) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro de despesa para analisar.</p>
      )}
    </SectionCard>
  );
}
