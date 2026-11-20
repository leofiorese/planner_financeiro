"use client";

import React, { useMemo } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/utils/format";
import type { BudgetHistoryItem } from "@/utils/budget/budgetCalculator";
import type { BudgetPeriod } from "@/utils/budget/period";
import { formatShortDate } from "@/utils/budget/period";

interface BudgetHistoryProps {
  history: BudgetHistoryItem[];
  /** Abre o fluxo de fechamento de um período pendente */
  onRegisterClosure?: (period: BudgetPeriod) => void;
}

function closureText(item: BudgetHistoryItem): string | null {
  switch (item.closureState) {
    case "confirmed": {
      const total = (item.closure?.allocations ?? []).reduce((sum, a) => sum + a.amount, 0);
      return `Aporte confirmado ${formatCurrency(total)}`;
    }
    case "skipped":
      return "Pulado";
    case "pending":
      return "Pendente";
    default:
      return null;
  }
}

/** Gráfico (gasto por período × limite do budget) e lista dos últimos períodos. */
export default function BudgetHistory({ history, onRegisterClosure }: BudgetHistoryProps) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const data = useMemo(
    () =>
      history.map((h) => ({
        label: formatShortDate(h.period.start, false),
        gasto: Math.round(h.projectedTotal * 100) / 100,
        limite: Math.round(h.effectiveBudget * 100) / 100,
        over: !h.withinBudget && h.effectiveBudget > 0,
        period: h.label,
      })),
    [history],
  );

  const listItems = useMemo(() => [...history].reverse(), [history]);
  const overCount = data.filter((d) => d.over).length;

  return (
    <SectionCard title={`Histórico (${history.length} períodos)`}>
      <div className="space-y-4">
        <div
          className="h-56 w-full text-muted-foreground"
          role="img"
          aria-label={`Gráfico de barras com o gasto de cada um dos últimos ${history.length} períodos, comparado ao limite do budget. ${overCount} ${
            overCount === 1 ? "período estourou" : "períodos estouraram"
          } o limite. Os valores de cada período estão na lista abaixo.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "currentColor" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => formatCurrency(v, true)}
              />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value)), name === "gasto" ? "Gasto total" : "Limite"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.period ?? ""}
                contentStyle={{
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="gasto" radius={[4, 4, 0, 0]} isAnimationActive={!reduceMotion}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.over ? "var(--danger)" : "var(--primary)"} />
                ))}
              </Bar>
              <Line
                dataKey="limite"
                type="stepAfter"
                stroke="var(--success)"
                strokeWidth={2}
                dot={{ r: 2 }}
                isAnimationActive={!reduceMotion}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <ul className="divide-y">
          {listItems.map((item) => {
            const closure = closureText(item);
            return (
              <li
                key={item.period.start}
                className="grid grid-cols-1 gap-x-4 gap-y-1.5 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_13rem] sm:items-center"
              >
                <span className="flex items-center gap-2 font-semibold">
                  {item.label}
                  {item.isCurrent && <Badge variant="secondary">atual</Badge>}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 tabular-nums text-muted-foreground sm:justify-end">
                  {formatCurrency(item.projectedTotal)} de {formatCurrency(item.effectiveBudget)}
                  {item.budgetAmount > 0 ? (
                    item.withinBudget ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-success">
                        <CheckCircle2 className="size-4" aria-hidden /> dentro
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-danger">
                        <XCircle className="size-4" aria-hidden /> +{formatCurrency(item.overBy)}
                      </span>
                    )
                  ) : (
                    <span>sem budget</span>
                  )}
                </span>
                {closure ? (
                  <span className="flex flex-wrap items-center gap-2 text-muted-foreground sm:justify-end">
                    {closure}
                    {item.closureState === "pending" && onRegisterClosure && (
                      <Button size="sm" onClick={() => onRegisterClosure(item.period)}>
                        Registrar aporte
                      </Button>
                    )}
                  </span>
                ) : (
                  <span aria-hidden className="hidden sm:block" />
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          O histórico é calculado a partir das despesas atuais; editar uma despesa antiga altera os números. A reserva das metas
          usa o valor atual.
        </p>
      </div>
    </SectionCard>
  );
}
