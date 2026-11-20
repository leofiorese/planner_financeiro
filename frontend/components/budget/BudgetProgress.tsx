"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import type { BudgetStatus } from "@/utils/budget/budgetCalculator";
import { LEVEL_LABELS, LEVEL_STYLES, getProgressSegments } from "@/utils/budget/display";

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
 * Barra do budget: gasto (sólido) + previsto (listrado). Apresentacional: recebe o `BudgetStatus`
 * pronto. O nível (dentro / perto / estourado) também aparece em texto, não só na cor.
 */
export default function BudgetProgress({ status, size = "lg", className }: BudgetProgressProps) {
  const seg = getProgressSegments(status);
  const styles = LEVEL_STYLES[seg.level];
  const levelLabel = LEVEL_LABELS[seg.level];

  const label =
    `Budget do período ${status.label}: gasto ${formatCurrency(status.spent)} de ${formatCurrency(status.effectiveBudget)} ` +
    `(${seg.percentLabel})` +
    (status.committed > 0 ? `, mais ${formatCurrency(status.committed)} previstos` : "") +
    (seg.overBy > 0 ? `, ${formatCurrency(seg.overBy)} acima do limite` : "") +
    `. ${levelLabel}`;

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={seg.ariaNow}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("relative w-full overflow-hidden rounded-full bg-muted ring-1 ring-border", BAR_HEIGHT[size])}
    >
      <div
        className={cn("absolute inset-y-0 left-0 transition-all duration-300", styles.bar)}
        style={{ width: `${seg.spentPct}%` }}
      />
      {seg.committedPct > 0 && (
        <div
          className={cn("absolute inset-y-0 opacity-45 transition-all duration-300", styles.bar)}
          style={{ left: `${seg.spentPct}%`, width: `${seg.committedPct}%`, backgroundImage: STRIPES }}
        />
      )}
    </div>
  );

  if (size === "sm") {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        {bar}
        <span className={cn("shrink-0 text-xs font-semibold tabular-nums", styles.text)}>{seg.percentLabel}</span>
      </div>
    );
  }

  const showDays = status.isCurrent && !status.isPast;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1",
          size === "lg" ? "text-base" : "text-sm",
        )}
      >
        <span className="font-semibold tabular-nums">
          <span className={styles.text}>{formatCurrency(status.spent)}</span>{" "}
          <span className="font-normal text-muted-foreground">de {formatCurrency(status.effectiveBudget)}</span>
        </span>
        <span className={cn("text-sm font-semibold tabular-nums", styles.text)}>
          {seg.percentLabel} · {levelLabel}
        </span>
      </div>

      {bar}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {status.committed > 0 && <>+ {formatCurrency(status.committed)} previstos</>}
          {seg.overBy > 0 && (
            <span className="ml-2 font-semibold text-danger">+{formatCurrency(seg.overBy)} acima</span>
          )}
          {seg.overBy === 0 && seg.projectedOverBy > 0 && (
            <span className="ml-2 font-semibold text-warning">
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
