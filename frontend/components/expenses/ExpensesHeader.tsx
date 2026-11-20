"use client";

import { CreditCard, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";
import { formatLocalizedMonth } from "@/utils/dateFormatting";

interface ExpensesHeaderProps {
  activeCount: number;
  totalMonthlyExpenses: number;
  recurringCount: number;
  invoiceTotal: number;
  invoiceItemsCount: number;
  invoiceMonthKey: string;
  onCreate: () => void;
}

export function ExpensesHeader({
  activeCount,
  totalMonthlyExpenses,
  recurringCount,
  invoiceTotal,
  invoiceItemsCount,
  invoiceMonthKey,
  onCreate,
}: ExpensesHeaderProps) {

  return (
    <PageHeader
      title="Despesas"
      description={`Acompanhe seus gastos, categorize despesas e gerencie seu orçamento. ${activeCount} ${
        activeCount === 1 ? "saída ativa" : "saídas ativas"
      }.`}
      actions={
        <Button onClick={onCreate}>
          <Plus aria-hidden />
          Nova despesa
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Despesas mensais totais"
          value={formatCurrency(totalMonthlyExpenses)}
          hint={`${recurringCount} ${recurringCount === 1 ? "obrigação recorrente" : "obrigações recorrentes"}`}
          icon={Receipt}
          tone="expense"
        />
        <StatCard
          label="Fatura atual"
          value={formatCurrency(invoiceTotal)}
          hint={`${invoiceItemsCount} ${
            invoiceItemsCount === 1 ? "item" : "itens"
          } na fatura aberta (${formatLocalizedMonth(invoiceMonthKey, { month: "short", year: "2-digit" })})`}
          icon={CreditCard}
          tone="primary"
        />
      </div>
    </PageHeader>
  );
}
