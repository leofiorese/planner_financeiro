"use client";

import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

interface MoneyTextProps {
  value: number;
  /** `income`/`expense` fixam a cor; `auto` usa o sinal do valor; `neutral` não colore. */
  tone?: "income" | "expense" | "auto" | "neutral";
  /** Formato compacto (ex.: "R$ 12 mil"). */
  compact?: boolean;
  /** Mostra "+" em valores positivos (útil com `tone="auto"`). */
  showPlus?: boolean;
  className?: string;
}

/** Valor monetário formatado na moeda atual, com números tabulares e cor semântica opcional. */
export function MoneyText({ value, tone = "neutral", compact = false, showPlus = false, className }: MoneyTextProps) {
  const { formatCurrency } = useCurrency();
  const resolved = tone === "auto" ? (value > 0 ? "income" : value < 0 ? "expense" : "neutral") : tone;

  return (
    <span
      className={cn(
        "tabular-nums",
        resolved === "income" && "text-income",
        resolved === "expense" && "text-expense",
        className,
      )}
    >
      {showPlus && value > 0 ? "+" : ""}
      {formatCurrency(value, compact)}
    </span>
  );
}
