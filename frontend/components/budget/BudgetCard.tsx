"use client";

import React from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBudget } from "@/hooks/useBudget";
import { formatCurrency } from "@/utils/format";
import BudgetProgress from "./BudgetProgress";

/** Card do Dashboard: progresso do período atual ou convite para configurar. */
export default function BudgetCard() {
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card/50 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Wallet className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Defina um budget mensal</p>
            <p className="text-sm text-muted-foreground">
              Acompanhe quanto já gastou no período e reserve parte para suas metas.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/settings">Configurar budget</Link>
        </Button>
      </div>
    );
  }

  return (
    <SectionCard
      title="Budget do período"
      description={<Badge variant="outline">{status.label}</Badge>}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/budget">Ver detalhes →</Link>
        </Button>
      }
    >
      <div className="space-y-3">
        <BudgetProgress status={status} size="lg" />
        <p className="text-sm tabular-nums text-muted-foreground">
          Budget {formatCurrency(status.budgetAmount)}
          {status.reserveTotal > 0 && <> − Metas {formatCurrency(status.reserveTotal)}</>}
          {" = "}
          <strong className="text-foreground">{formatCurrency(status.effectiveBudget)}</strong> para gastar
        </p>
      </div>
    </SectionCard>
  );
}
