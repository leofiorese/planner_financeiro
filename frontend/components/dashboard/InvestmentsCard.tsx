"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { useInvestmentSummary } from "@/components/investments/hooks/useInvestmentSummary";
import { useInvestmentsContext } from "@/components/investments/InvestmentsProvider";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMonth } from "@/utils/format";
import { formatPercent, formatPp } from "@/utils/investments/series";

/** Resumo do patrimônio investido para o Dashboard. Some enquanto carrega ou se a API falhar. */
export function InvestmentsCard() {
  const { data } = useInvestmentsContext();
  const { hasData, latest, total, mom, returns, comparison } = useInvestmentSummary(data);

  if (!data) return null;

  const link = (
    <Link href="/investments" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      {hasData ? "Ver detalhes" : "Fazer o primeiro lançamento"}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );

  return (
    <SectionCard title="Investimentos" description={latest ? `Lançamento de ${formatMonth(latest.month)}` : "Evolução da sua carteira"} actions={link}>
      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          Lance o saldo de cada classe de ativo para acompanhar a evolução do patrimônio e a rentabilidade contra a meta.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Patrimônio</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</dd>
            {mom && (
              <dd className={cn("text-xs font-medium tabular-nums", mom.change > 0 && "text-income", mom.change < 0 && "text-expense")}>
                {mom.change > 0 ? "+" : mom.change < 0 ? "−" : ""}
                {formatCurrency(Math.abs(mom.change))}
                {mom.changePct !== null && ` (${formatPercent(mom.changePct, 1)})`} vs. anterior
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rentabilidade anualizada</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {returns.annualized === null ? "—" : `${formatPercent(returns.annualized)} a.a.`}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {returns.annualized === null ? "A partir do 2º lançamento" : `Acumulada: ${formatPercent(returns.accumulated)}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Contra a meta</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {comparison ? (comparison.status === "on" ? "Na meta" : formatPp(comparison.diffPp)) : "—"}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {comparison
                ? `Meta de ${formatPercent(comparison.targetAnnualPct / 100, 1)} a.a.`
                : data.settings.targetReturnAnnual === null
                  ? "Sem meta definida"
                  : "A partir do 2º lançamento"}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}
