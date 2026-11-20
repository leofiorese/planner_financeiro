"use client";

import React from "react";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";
import { useBudget } from "@/hooks/useBudget";
import { LEVEL_STYLES, getProgressSegments } from "@/utils/budget/display";

/**
 * Pill do header: mini barra + percentual. Clicável para /budget; escondido
 * quando o budget está desativado. No mobile mostra só o percentual.
 */
export default function BudgetHeaderIndicator() {
  const { formatCurrency } = useCurrency();
  const { enabled, status } = useBudget();

  if (!enabled || status.budgetAmount <= 0) return null;

  const seg = getProgressSegments(status);
  const styles = LEVEL_STYLES[seg.level];
  const title = `${formatCurrency(status.spent)} de ${formatCurrency(status.effectiveBudget)} · ${status.label}`;

  return (
    <Link
      href="/budget"
      title={title}
      aria-label={`Budget do período: ${title}`}
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-bold tabular-nums transition-colors no-underline ${styles.soft} ${styles.border} ${styles.text} hover:brightness-95`}
    >
      <span className="hidden sm:block w-10 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden">
        <span className={`block h-full ${styles.bar}`} style={{ width: `${seg.spentPct}%` }} />
      </span>
      <span>{seg.percentLabel}</span>
    </Link>
  );
}
