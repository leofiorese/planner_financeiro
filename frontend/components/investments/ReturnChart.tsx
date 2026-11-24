"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import type { ReturnSeries } from "@/utils/investments/returns";
import { formatMonthShort, formatPercent } from "@/utils/investments/series";
import { monthlyEquivalent } from "@/utils/investments/target";

interface ReturnChartProps {
  returns: ReturnSeries;
  /** Meta de rentabilidade em % a.a. (ou `null`). */
  targetAnnualPct: number | null;
}

interface Row {
  label: string;
  /** % do período; `null` quando não calculável. */
  value: number | null;
  /** Meta equivalente ao período, em %. */
  target: number | null;
  months: number;
}

// Verde/vermelho do app para ganho/perda (as cores de categoria são usadas na alocação) e uma linha neutra para a meta.
const POSITIVE = "var(--income)";
const NEGATIVE = "var(--expense)";
const TARGET = "var(--foreground)";

/** Rentabilidade de cada período contra a meta equivalente. */
export function ReturnChart({ returns, targetAnnualPct }: ReturnChartProps) {
  const data = useMemo<Row[]>(
    () =>
      returns.points.map((p) => ({
        label: formatMonthShort(p.month),
        value: p.periodReturn === null ? null : p.periodReturn * 100,
        // Se passaram meses sem lançamento, a meta acumula pelo mesmo número de meses.
        target:
          targetAnnualPct === null ? null : (Math.pow(1 + monthlyEquivalent(targetAnnualPct), p.periodMonths) - 1) * 100,
        months: p.periodMonths,
      })),
    [returns.points, targetAnnualPct],
  );

  const summary = `Rentabilidade por período, de ${data[0]?.label ?? ""} a ${data[data.length - 1]?.label ?? ""}.`;

  return (
    <SectionCard
      title="Rentabilidade por período"
      description="Quanto a carteira rendeu em cada mês, já descontando os aportes e resgates."
    >
      {data.length === 0 ? (
        <EmptyState title="Ainda sem rentabilidade" description="O primeiro lançamento é a base. Faça o próximo para ver o retorno." />
      ) : (
        <>
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: POSITIVE }} aria-hidden />
              Rendeu
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: NEGATIVE }} aria-hidden />
              Perdeu
            </li>
            {targetAnnualPct !== null && (
              <li className="flex items-center gap-2">
                <svg width="22" height="8" aria-hidden>
                  <line x1="1" y1="4" x2="21" y2="4" stroke={TARGET} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 4" />
                </svg>
                Meta do período
              </li>
            )}
          </ul>

          <div className="h-72 w-full" role="img" aria-label={summary}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => formatPercent(v / 100, 1)}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as Row;
                    return (
                      <div className="min-w-[190px] rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                        <p className="mb-2 border-b pb-1.5 font-semibold">
                          {r.label}
                          {r.months > 1 && <span className="font-normal text-muted-foreground"> · {r.months} meses</span>}
                        </p>
                        <dl className="space-y-1.5 tabular-nums">
                          <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Rentabilidade</dt>
                            <dd className="font-semibold">{r.value === null ? "—" : formatPercent(r.value / 100)}</dd>
                          </div>
                          {r.target !== null && (
                            <div className="flex justify-between gap-4">
                              <dt className="text-muted-foreground">Meta do período</dt>
                              <dd className="font-semibold">{formatPercent(r.target / 100)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {data.map((row) => (
                    <Cell key={row.label} fill={(row.value ?? 0) >= 0 ? POSITIVE : NEGATIVE} />
                  ))}
                </Bar>
                {targetAnnualPct !== null && (
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke={TARGET}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </SectionCard>
  );
}
