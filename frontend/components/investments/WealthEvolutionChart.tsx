"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/common/SectionCard";
import { formatCurrency } from "@/utils/format";
import { formatMonthShort, type EvolutionPoint } from "@/utils/investments/series";

interface WealthEvolutionChartProps {
  evolution: EvolutionPoint[];
}

const TOTAL_COLOR = "var(--chart-1)";
const INVESTED_COLOR = "var(--chart-3)";

/** Patrimônio × total investido ao longo dos lançamentos. A distância entre as linhas é o ganho. */
export function WealthEvolutionChart({ evolution }: WealthEvolutionChartProps) {
  const data = useMemo(() => evolution.map((p) => ({ ...p, label: formatMonthShort(p.month) })), [evolution]);
  const last = evolution[evolution.length - 1];
  const showDots = data.length <= 12;

  const summary = last
    ? `Evolução do patrimônio de ${data[0].label} a ${data[data.length - 1].label}: ${formatCurrency(last.total)} no último lançamento, contra ${formatCurrency(last.invested)} investidos.`
    : "Sem lançamentos.";

  return (
    <SectionCard
      title="Evolução do patrimônio"
      description="O que você tem versus o que você colocou. A diferença entre as linhas é o ganho."
    >
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="1" y1="4" x2="21" y2="4" stroke={TOTAL_COLOR} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          Patrimônio
        </li>
        <li className="flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="1" y1="4" x2="21" y2="4" stroke={INVESTED_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 4" />
          </svg>
          Total investido
        </li>
      </ul>

      <div className="h-72 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickFormatter={(v: number) => formatCurrency(v, true)}
              // Linhas não precisam de base zero: uma folga em volta dos dados deixa a distância entre elas visível.
              domain={[(min: number) => Math.max(0, Math.floor(min * 0.95)), (max: number) => Math.ceil(max * 1.03)]}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as EvolutionPoint & { label: string };
                return (
                  <div className="min-w-[200px] rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                    <p className="mb-2 border-b pb-1.5 font-semibold">{p.label}</p>
                    <dl className="space-y-1.5 tabular-nums">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Patrimônio</dt>
                        <dd className="font-semibold">{formatCurrency(p.total)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Total investido</dt>
                        <dd className="font-semibold">{formatCurrency(p.invested)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t pt-1.5">
                        <dt className="text-muted-foreground">Ganho</dt>
                        <dd className="font-semibold">{formatCurrency(p.gain)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="invested"
              stroke={INVESTED_COLOR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={showDots ? { r: 3, strokeWidth: 2, stroke: "var(--card)", fill: INVESTED_COLOR } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={TOTAL_COLOR}
              strokeWidth={2.5}
              dot={showDots ? { r: 4, strokeWidth: 2, stroke: "var(--card)", fill: TOTAL_COLOR } : false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
