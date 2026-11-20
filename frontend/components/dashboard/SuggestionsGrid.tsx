"use client";

import { PriorityBadge } from "@/components/CategoryIcon";
import { SectionCard } from "@/components/common/SectionCard";
import { useCurrency } from "@/context/CurrencyContext";
import type { MonthlySuggestion } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  income: "Renda",
  expense: "Despesa",
  goal: "Meta",
  general: "Geral",
};

export function SuggestionsGrid({ suggestions }: { suggestions: MonthlySuggestion[] }) {
  const { formatCurrency } = useCurrency();

  if (suggestions.length === 0) return null;

  return (
    <SectionCard
      title="Insights e otimizações financeiras"
      description="Sugestões automáticas geradas a partir do seu fluxo de caixa e metas"
    >
      <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.slice(0, 6).map((suggestion) => (
          <li
            key={suggestion.id}
            className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABELS[suggestion.category] ?? suggestion.category}
                </span>
                <PriorityBadge priority={suggestion.priority} />
              </div>
              <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold">{suggestion.title}</h3>
              <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {suggestion.description}
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
              <span className="font-medium text-muted-foreground">Impacto estimado:</span>
              <span className="font-semibold tabular-nums text-income">
                +{formatCurrency(Math.abs(suggestion.estimatedImpact))}/mês
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
