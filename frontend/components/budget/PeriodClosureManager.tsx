"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFinancialContext } from "@/context";
import { formatCurrency } from "@/utils/format";
import { useTodayISO } from "@/hooks/useTodayISO";
import { getPendingClosure } from "@/utils/budget/budgetCalculator";
import type { BudgetPeriod } from "@/utils/budget/period";
import PeriodClosureModal, { type ClosureModalResult } from "./PeriodClosureModal";

const OPEN_EVENT = "budget:open-closure";

/** Abre o modal de fechamento para um período (ex.: botão "Registrar aporte" na /budget). */
export function openPeriodClosure(period: BudgetPeriod): void {
  window.dispatchEvent(new CustomEvent<BudgetPeriod>(OPEN_EVENT, { detail: period }));
}

interface ActiveClosure {
  period: BudgetPeriod;
  olderToSkip: BudgetPeriod[];
}

/**
 * Montado uma vez no layout. Depois que o plano termina de carregar, pergunta o
 * fechamento do período encerrado mais recente (os mais antigos viram "pulados" junto
 * com a resposta). Fechar no X não grava nada: só volta a perguntar no próximo load.
 */
export default function PeriodClosureManager() {
  const { state, closeBudgetPeriod } = useFinancialContext();
  const todayISO = useTodayISO();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [manual, setManual] = useState<ActiveClosure | null>(null);

  const plan = state.userPlan;
  const ready = !state.loading.isLoading && plan.id !== "default-plan";

  const pending = useMemo(() => (ready ? getPendingClosure(plan, todayISO) : null), [ready, plan, todayISO]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const period = (event as CustomEvent<BudgetPeriod>).detail;
      if (period?.start) setManual({ period, olderToSkip: [] });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const active: ActiveClosure | null =
    manual ?? (pending && !dismissed.includes(pending.period.start) ? pending : null);

  const handleDismiss = useCallback(() => {
    if (!active) return;
    setManual(null);
    setDismissed((prev) => (prev.includes(active.period.start) ? prev : [...prev, active.period.start]));
  }, [active]);

  const handleSubmit = useCallback(
    (result: ClosureModalResult) => {
      if (!active) return;
      closeBudgetPeriod(
        {
          periodStart: active.period.start,
          periodEnd: active.period.end,
          status: result.status,
          income: result.income,
          spent: result.spent,
          budgetAmount: result.budgetAmount,
          allocations: result.status === "confirmed" ? result.allocations : [],
          closedAt: new Date().toISOString(),
        },
        active.olderToSkip
      );
      setManual(null);
      if (result.status === "confirmed") {
        const total = result.allocations.reduce((sum, a) => sum + a.amount, 0);
        toast.success(total > 0 ? `Aporte de ${formatCurrency(total)} registrado nas metas.` : "Período fechado.");
      } else {
        toast.info("Período pulado.");
      }
    },
    [active, closeBudgetPeriod]
  );

  if (!active) return null;

  return (
    <PeriodClosureModal
      key={active.period.start}
      plan={plan}
      period={active.period}
      todayISO={todayISO}
      olderSkippedCount={active.olderToSkip.length}
      onDismiss={handleDismiss}
      onSubmit={handleSubmit}
    />
  );
}
