"use client";

import { useState } from "react";
import { CalendarRange, Plus, TrendingUp, Users } from "lucide-react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { IncomeFormModal } from "@/components/income/IncomeFormModal";
import { IncomeList } from "@/components/income/IncomeList";
import { Button } from "@/components/ui/button";
import { useFinancialActions, useFinancialState } from "@/context";
import { formatCurrency } from "@/utils/format";
import { withToast } from "@/lib/toast";
import type { CreateIncomeInput, Income } from "@/types";
import { calculateRecurringMonthlyAmount } from "@/utils/forecastCalculator";

export default function IncomePage() {
  const state = useFinancialState();
  const { addIncome, updateIncome, deleteIncome } = useFinancialActions();
  const confirm = useConfirm();

  const [modal, setModal] = useState<{ open: boolean; income: Income | null }>({ open: false, income: null });

  const incomes = state.userPlan.income;
  const activeIncomes = incomes.filter((i) => i.isActive);
  const totalMonthlyIncome = activeIncomes.reduce(
    (total, income) => total + calculateRecurringMonthlyAmount(income.amount, income.frequency),
    0,
  );

  const handleSubmit = async (values: CreateIncomeInput) => {
    const editing = modal.income;
    await withToast(editing ? updateIncome({ id: editing.id, ...values }) : addIncome(values), {
      loading: "Salvando renda...",
      success: editing ? "Renda atualizada" : "Renda adicionada",
      error: "Não foi possível salvar a renda",
    });
  };

  const handleDelete = async (income: Income) => {
    const ok = await confirm({
      title: "Excluir fonte de renda?",
      description: `A renda "${income.name}" será removida. Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(deleteIncome(income.id), {
        success: "Renda excluída",
        error: "Não foi possível excluir a renda",
      });
    } catch (error) {
      console.error("Failed to delete income:", error);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Receitas"
        description="Gerencie suas fontes de renda e acompanhe seu potencial de ganhos"
        actions={
          <Button onClick={() => setModal({ open: true, income: null })}>
            <Plus aria-hidden />
            Nova renda
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Renda mensal total"
            value={formatCurrency(totalMonthlyIncome)}
            icon={TrendingUp}
            tone="income"
          />
          <StatCard
            label="Anualizado"
            value={`~${formatCurrency(totalMonthlyIncome * 12)}`}
            hint="Renda mensal total × 12"
            icon={CalendarRange}
          />
          <StatCard
            label="Fontes ativas"
            value={activeIncomes.length}
            hint={`${incomes.length} ${incomes.length === 1 ? "fonte cadastrada" : "fontes cadastradas"}`}
            icon={Users}
          />
        </div>
      </PageHeader>

      <IncomeList
        incomes={incomes}
        editingId={modal.open ? (modal.income?.id ?? null) : null}
        onCreate={() => setModal({ open: true, income: null })}
        onEdit={(income) => setModal({ open: true, income })}
        onDelete={handleDelete}
      />

      <IncomeFormModal
        open={modal.open}
        onOpenChange={(open) => setModal((prev) => ({ ...prev, open }))}
        income={modal.income}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
