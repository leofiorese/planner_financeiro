"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import type { InvestmentClass, InvestmentSnapshot } from "@/types";
import { formatCurrency, formatMonth } from "@/utils/format";
import { formatPercent } from "@/utils/investments/series";
import { allocation, buildClassTree } from "@/utils/investments/totals";

interface AllocationChartProps {
  snapshot: InvestmentSnapshot | undefined;
  classes: InvestmentClass[];
}

const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** Distribuição do último lançamento por categoria. A cor segue a categoria (não o ranking). */
export function AllocationChart({ snapshot, classes }: AllocationChartProps) {
  const items = useMemo(() => {
    if (!snapshot) return [];
    const order = buildClassTree(classes, true).map((n) => n.cls.id);
    return allocation(snapshot, classes, "root").map((item) => {
      const idx = order.indexOf(item.classId);
      return { ...item, color: idx >= 0 && idx < SERIES_COLORS.length ? SERIES_COLORS[idx] : "var(--muted-foreground)" };
    });
  }, [snapshot, classes]);

  const summary = items.map((i) => `${i.name} ${formatPercent(i.share, 1)}`).join(", ");

  return (
    <SectionCard
      title="Alocação atual"
      description={snapshot ? `Distribuição por categoria em ${formatMonth(snapshot.month)}.` : "Distribuição por categoria."}
    >
      {items.length === 0 ? (
        <EmptyState title="Sem saldos" description="Faça um lançamento com saldo para ver a distribuição." />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-52 w-52 shrink-0" role="img" aria-label={`Alocação: ${summary}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="balance"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {items.map((i) => (
                    <Cell key={i.classId} fill={i.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof items)[number];
                    return (
                      <div className="rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                        <p className="mb-1 font-semibold">{p.name}</p>
                        <p className="tabular-nums">
                          {formatCurrency(p.balance)} · {formatPercent(p.share, 1)}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2.5">
            {items.map((i) => (
              <li key={i.classId} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-sm" style={{ background: i.color }} aria-hidden />
                  <span className="truncate">{i.name}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="font-semibold">{formatPercent(i.share, 1)}</span>
                  <span className="block text-xs text-muted-foreground">{formatCurrency(i.balance)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
