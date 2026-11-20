"use client";

import { Check } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { SUPPORTED_CURRENCIES, useCurrency, type CurrencyCode } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

export function CurrencySection() {
  const { currency, setCurrency } = useCurrency();

  return (
    <SectionCard
      title="Moeda"
      description="Defina a moeda e a formatação monetária exibidas nos saldos, receitas, despesas e gráficos."
    >
      <div role="radiogroup" aria-label="Moeda" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => {
          const selected = currency === code;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setCurrency(code as CurrencyCode)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "bg-card hover:bg-accent/50",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl font-mono text-sm font-semibold",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {info.symbol}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {info.code} — {info.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Formato: {info.locale}</span>
                </span>
              </span>
              {selected && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  <Check className="size-3" aria-hidden />
                  Ativa
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
