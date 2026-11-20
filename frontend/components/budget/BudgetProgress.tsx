"use client";

import React from "react";
import { useCurrency } from "@/context/CurrencyContext";
import type { BudgetStatus } from "@/utils/budget/budgetCalculator";
import { LEVEL_STYLES, getProgressSegments } from "@/utils/budget/display";

export interface BudgetProgressProps {
  status: BudgetStatus;
  size?: "lg" | "md" | "sm";
  className?: string;
}

const BAR_HEIGHT: Record<NonNullable<BudgetProgressProps["size"]>, string> = {
  lg: "h-4",
  md: "h-3",
  sm: "h-2",
};

/** Listrado diagonal na cor do nível, para o segmento "comprometido". */
const STRIPES =
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 4px, transparent 4px, transparent 8px)";

/**
 * Barra do budget: gasto (sólido) + comprometido (listrado). Apresentacional:
 * recebe o `BudgetStatus` pronto.
 */
export default function BudgetProgress({ status, size = "lg", className = "" }: BudgetProgressProps) {
  const { formatCurrency } = useCurrency();
  const seg = getProgressSegments(status);
  const styles = LEVEL_STYLES[seg.level];

  const label =
    `Budget do período ${status.label}: gasto ${formatCurrency(status.spent)} de ${formatCurrency(status.effectiveBudget)} ` +
    `(${seg.percentLabel})` +
    (status.committed > 0 ? `, mais ${formatCurrency(status.committed)} previstos` : "") +
    (seg.overBy > 0 ? `, ${formatCurrency(seg.overBy)} acima do limite` : "");

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={seg.ariaNow}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`relative w-full ${BAR_HEIGHT[size]} rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-slate-700/60`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${styles.bar} transition-all duration-300`}
        style={{ width: `${seg.spentPct}%` }}
      />
      {seg.committedPct > 0 && (
        <div
          className={`absolute inset-y-0 ${styles.bar} opacity-45 transition-all duration-300`}
          style={{ left: `${seg.spentPct}%`, width: `${seg.committedPct}%`, backgroundImage: STRIPES }}
        />
      )}
    </div>
  );

  if (size === "sm") {
    return (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        {bar}
        <span className={`text-[11px] font-bold tabular-nums shrink-0 ${styles.text}`}>{seg.percentLabel}</span>
      </div>
    );
  }

  const textSize = size === "lg" ? "text-sm" : "text-xs";
  const showDays = status.isCurrent && !status.isPast;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 ${textSize}`}>
        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          <span className={styles.text}>{formatCurrency(status.spent)}</span>{" "}
          <span className="font-normal text-slate-500 dark:text-slate-400">de {formatCurrency(status.effectiveBudget)}</span>
        </span>
        <span className={`font-bold tabular-nums ${styles.text}`}>{seg.percentLabel}</span>
      </div>

      {bar}

      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400`}>
        <span className="tabular-nums">
          {status.committed > 0 && <>+ {formatCurrency(status.committed)} previstos</>}
          {seg.overBy > 0 && (
            <span className="ml-2 font-semibold text-rose-600 dark:text-rose-400">+{formatCurrency(seg.overBy)} acima</span>
          )}
          {seg.overBy === 0 && seg.projectedOverBy > 0 && (
            <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
              previsto estoura em {formatCurrency(seg.projectedOverBy)}
            </span>
          )}
        </span>
        {showDays && (
          <span className="tabular-nums">
            {status.daysRemaining === 1 ? "falta 1 dia" : `faltam ${status.daysRemaining} dias`}
            {" · "}
            {formatCurrency(status.dailyAllowance)}/dia
          </span>
        )}
      </div>
    </div>
  );
}
