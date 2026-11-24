"use client";

import { Callout } from "@/components/common/Callout";
import { LoadingState } from "@/components/common/LoadingState";
import { useInvestmentsContext } from "@/components/investments/InvestmentsProvider";
import { InvestmentClassesCard } from "@/components/settings/InvestmentClassesCard";
import { InvestmentGoalsCard } from "@/components/settings/InvestmentGoalsCard";
import { Button } from "@/components/ui/button";

/** Aba "Investimentos" das Configurações: lembrete e metas, e as classes de ativos. */
export function InvestmentsSection() {
  const api = useInvestmentsContext();
  const { data, loading, error, retry } = api;

  if (loading && !data) return <LoadingState label="Carregando investimentos..." />;

  if (!data) {
    return (
      <Callout tone="danger" role="alert">
        <p>{error ?? "Não foi possível carregar os investimentos."}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Tentar novamente
        </Button>
      </Callout>
    );
  }

  return (
    <div className="space-y-6">
      <InvestmentGoalsCard settings={data.settings} saveSettings={api.saveSettings} />
      <InvestmentClassesCard data={data} api={api} />
    </div>
  );
}
