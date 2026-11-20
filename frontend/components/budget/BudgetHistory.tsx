"use client";

import React, { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetHistoryItem } from "@/utils/budget/budgetCalculator";
import type { BudgetPeriod } from "@/utils/budget/period";
import { formatShortDate } from "@/utils/budget/period";

interface BudgetHistoryProps {
  history: BudgetHistoryItem[];
  /** Abre o fluxo de fechamento de um período pendente (fase 1.8) */
  onRegisterClosure?: (period: BudgetPeriod) => void;
}

function closureText(item: BudgetHistoryItem, formatCurrency: (n: number) => string): string | null {
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

/** Gráfico (gasto por período × Y efetivo) e lista dos últimos períodos. */
export default function BudgetHistory({ history, onRegisterClosure }: BudgetHistoryProps) {
  const { formatCurrency } = useCurrency();

  const data = useMemo(
    () =>
      history.map((h) => ({
        label: formatShortDate(h.period.start, false),
        gasto: Math.round(h.projectedTotal * 100) / 100,
        limite: Math.round(h.effectiveBudget * 100) / 100,
        over: !h.withinBudget && h.effectiveBudget > 0,
        period: h.label,
      })),
    [history]
  );

  const listItems = useMemo(() => [...history].reverse(), [history]);

  return (
    <section className="surface-card p-5 space-y-4" aria-labelledby="budget-history-title">
      <h2 id="budget-history-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Histórico ({history.length} períodos)
      </h2>

      <div className="h-56 w-full" role="img" aria-label="Gráfico de gasto por período comparado ao limite do budget">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value)), name === "gasto" ? "Gasto total" : "Y efetivo"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.period ?? ""}
            />
            <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.over ? "#f43f5e" : "#6366f1"} />
              ))}
            </Bar>
            <Line dataKey="limite" type="stepAfter" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {listItems.map((item) => {
          const closure = closureText(item, formatCurrency);
          return (
            <li key={item.period.start} className="py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {item.label}
                {item.isCurrent && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    atual
                  </span>
                )}
              </span>
              <span className="tabular-nums text-slate-600 dark:text-slate-400">
                {formatCurrency(item.projectedTotal)} de {formatCurrency(item.effectiveBudget)}{" "}
                {item.budgetAmount > 0 ? (
                  item.withinBudget ? (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">✅ dentro</span>
                  ) : (
                    <span className="font-semibold text-rose-600 dark:text-rose-400">❌ +{formatCurrency(item.overBy)}</span>
                  )
                ) : (
                  <span className="text-slate-400">sem budget</span>
                )}
              </span>
              {closure && (
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {closure}
                  {item.closureState === "pending" && onRegisterClosure && (
                    <button
                      type="button"
                      onClick={() => onRegisterClosure(item.period)}
                      className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Registrar aporte
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-400">
        O histórico é calculado a partir das despesas atuais; editar uma despesa antiga altera os números. A reserva das metas usa o valor atual.
      </p>
    </section>
  );
}
