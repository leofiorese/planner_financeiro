"use client";

import { useMemo } from "react";
import type { InvestmentsData, InvestmentSnapshot } from "@/types";
import { portfolioReturns, type ReturnSeries } from "@/utils/investments/returns";
import { evolutionSeries, monthOverMonth, type EvolutionPoint, type MonthOverMonth } from "@/utils/investments/series";
import { compareToTarget, type ReturnComparison } from "@/utils/investments/target";
import { latestSnapshot, snapshotTotal } from "@/utils/investments/totals";

export interface InvestmentSummary {
  hasData: boolean;
  latest: InvestmentSnapshot | undefined;
  total: number;
  mom: MonthOverMonth | null;
  evolution: EvolutionPoint[];
  returns: ReturnSeries;
  /** Preenchido quando há meta de rentabilidade e retorno anualizado calculável. */
  comparison: ReturnComparison | null;
}

/** Números derivados dos lançamentos, compartilhados pela página e pelo card do Dashboard. */
export function useInvestmentSummary(data: InvestmentsData | null): InvestmentSummary {
  return useMemo(() => {
    const snapshots = data?.snapshots ?? [];
    const latest = latestSnapshot(snapshots);
    const returns = portfolioReturns(snapshots);
    const target = data?.settings.targetReturnAnnual ?? null;
    return {
      hasData: snapshots.length > 0,
      latest,
      total: latest ? snapshotTotal(latest) : 0,
      mom: monthOverMonth(snapshots),
      evolution: evolutionSeries(snapshots),
      returns,
      comparison: target !== null && returns.annualized !== null ? compareToTarget(returns.annualized, target) : null,
    };
  }, [data]);
}
