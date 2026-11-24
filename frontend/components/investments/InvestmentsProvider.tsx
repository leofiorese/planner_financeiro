"use client";

import { createContext, useContext } from "react";
import { useInvestments, type InvestmentsApi } from "@/components/investments/hooks/useInvestments";

const InvestmentsContext = createContext<InvestmentsApi | null>(null);

/**
 * Estado único de Investimentos para o app todo: a página `/investments`, a aba de Configurações,
 * o popup do dia X e o card do Dashboard compartilham o mesmo carregamento e se atualizam juntos
 * quando um lançamento é salvo em qualquer lugar.
 */
export function InvestmentsProvider({ children }: { children: React.ReactNode }) {
  const api = useInvestments();
  return <InvestmentsContext.Provider value={api}>{children}</InvestmentsContext.Provider>;
}

export function useInvestmentsContext(): InvestmentsApi {
  const ctx = useContext(InvestmentsContext);
  if (!ctx) throw new Error("useInvestmentsContext deve ser usado dentro de <InvestmentsProvider>");
  return ctx;
}
