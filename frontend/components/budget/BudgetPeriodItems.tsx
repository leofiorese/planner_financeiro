"use client";

import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFinancialState } from "@/context";
import { formatCurrency } from "@/utils/format";
import { getPeriodExpenseOccurrences } from "@/utils/budget/budgetCalculator";
import { formatShortDate, type BudgetPeriod } from "@/utils/budget/period";

/** Lançamentos do período (as ocorrências que compõem o gasto), colapsável. */
export default function BudgetPeriodItems({ period, todayISO }: { period: BudgetPeriod; todayISO: string }) {
  const { userPlan } = useFinancialState();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const items = useMemo(() => {
    if (!open) return [];
    const names = new Map(userPlan.expenses.map((e) => [e.id, e.name]));
    return getPeriodExpenseOccurrences(userPlan, period).map((o, i) => ({
      key: `${o.sourceId}-${o.date}-${i}`,
      name: names.get(o.sourceId) ?? "Despesa",
      ...o,
    }));
  }, [open, userPlan, period]);

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <h2 className="text-base font-semibold">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <span>Lançamentos do período</span>
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            {open ? "Recolher" : "Expandir"}
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          </span>
        </button>
      </h2>

      <div id={panelId} hidden={!open}>
        {open && (
          <div className="border-t px-5 pb-4">
            {items.length === 0 ? (
              <p className="pt-3 text-sm text-muted-foreground">Nenhum lançamento neste período.</p>
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatShortDate(item.date, false)}</span>
                      <span className="truncate">
                        {item.name}
                        {item.installment && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({item.installment.index}/{item.installment.total})
                          </span>
                        )}
                      </span>
                      {item.date > todayISO && <Badge variant="secondary">previsto</Badge>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
