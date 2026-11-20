"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useBudget } from "@/hooks/useBudget";
import { formatCurrency } from "@/utils/format";
import { LEVEL_LABELS, LEVEL_STYLES, getProgressSegments } from "@/utils/budget/display";

/**
 * Pill do topo: mini barra + percentual. Clicável para /budget; escondido quando o budget está
 * desativado. Em telas estreitas mostra só o percentual.
 */
export default function BudgetHeaderIndicator() {
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) return null;

  const seg = getProgressSegments(status);
  const styles = LEVEL_STYLES[seg.level];
  const title = `${formatCurrency(status.spent)} de ${formatCurrency(status.effectiveBudget)} · ${status.label}`;

  return (
    <Link
      href="/budget"
      title={title}
      aria-label={`${seg.percentLabel} do budget do período · ${title}. ${LEVEL_LABELS[seg.level]}`}
      className={cn(
        "flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold tabular-nums transition-colors pointer-coarse:min-h-11",
        "hover:brightness-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        styles.soft,
        styles.border,
        styles.text,
      )}
    >
      <span aria-hidden className="hidden h-1.5 w-10 overflow-hidden rounded-full bg-muted sm:block">
        <span className={cn("block h-full", styles.bar)} style={{ width: `${seg.spentPct}%` }} />
      </span>
      <span>{seg.percentLabel}</span>
    </Link>
  );
}
