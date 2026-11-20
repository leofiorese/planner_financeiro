"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { Callout } from "@/components/common/Callout";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { useFinancialActions } from "@/context";
import { useBudget } from "@/hooks/useBudget";
import { formatCurrency } from "@/utils/format";
import BudgetProgress from "@/components/budget/BudgetProgress";
import BudgetFlowPanel from "@/components/budget/BudgetFlowPanel";
import BudgetCategoryBreakdown from "@/components/budget/BudgetCategoryBreakdown";
import BudgetGoalsPanel from "@/components/budget/BudgetGoalsPanel";
import BudgetHistory from "@/components/budget/BudgetHistory";
import BudgetPeriodItems from "@/components/budget/BudgetPeriodItems";
import { openPeriodClosure } from "@/components/budget/PeriodClosureManager";

/** Quantos períodos para trás / para frente a navegação permite. */
const MIN_OFFSET = -11;
const MAX_OFFSET = 1;

export default function BudgetPage() {
  const { setBudgetAmount } = useFinancialActions();
  const [offset, setOffset] = useState(0);
  const { enabled, todayISO, status, history, feasibility, breakdown } = useBudget(offset, { historyCount: 12 });

  const periodKind = status.isCurrent ? "atual" : status.isPast ? "encerrado" : "próximo";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Budget Mensal"
        description={
          <>
            Período <strong className="text-foreground">{status.label}</strong> ({periodKind})
          </>
        }
        actions={
          enabled && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setOffset((o) => Math.max(MIN_OFFSET, o - 1))}
                disabled={offset <= MIN_OFFSET}
                aria-label="Período anterior"
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button variant="outline" onClick={() => setOffset(0)} disabled={offset === 0}>
                Período atual
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setOffset((o) => Math.min(MAX_OFFSET, o + 1))}
                disabled={offset >= MAX_OFFSET}
                aria-label="Próximo período"
              >
                <ChevronRight aria-hidden />
              </Button>
            </>
          )
        }
      />

      {!enabled ? (
        <EmptyState
          icon={Wallet}
          headingLevel={2}
          title="O budget mensal está desativado"
          description="Defina quanto pode gastar por período e o dia em que ele vira. O app acompanha o gasto, o que já está previsto e quanto reservar para as suas metas."
          action={
            <Button asChild>
              <Link href="/settings">Configurar budget</Link>
            </Button>
          }
        />
      ) : (
        <>
          <SectionCard title="Resumo do período">
            <div className="space-y-5">
              {status.budgetAmount <= 0 && (
                <Callout tone="warning" role="status">
                  <p>Não há budget definido para este período (o valor passou a valer depois dele).</p>
                </Callout>
              )}
              <BudgetProgress status={status} size="lg" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard compact label="Budget" value={formatCurrency(status.budgetAmount)} />
                <StatCard compact label="Para metas" value={formatCurrency(status.reserveTotal)} hint="reservado" />
                <StatCard compact tone="primary" label="Disponível" value={formatCurrency(status.effectiveBudget)} />
                <StatCard compact label="Gasto" value={formatCurrency(status.spent)} />
                <StatCard compact label="Previsto" value={formatCurrency(status.committed)} />
                <StatCard
                  compact
                  label="Por dia"
                  value={status.isPast ? "—" : formatCurrency(status.dailyAllowance)}
                  hint={status.isPast ? undefined : "ainda disponível"}
                />
              </div>
            </div>
          </SectionCard>

          <BudgetFlowPanel status={status} feasibility={feasibility} onAdjustBudget={(amount) => setBudgetAmount(amount)} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BudgetCategoryBreakdown breakdown={breakdown} />
            <BudgetGoalsPanel status={status} />
          </div>

          <BudgetHistory history={history} onRegisterClosure={openPeriodClosure} />

          <BudgetPeriodItems period={status.period} todayISO={todayISO} />
        </>
      )}
    </div>
  );
}
