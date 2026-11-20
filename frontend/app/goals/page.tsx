"use client";

import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { GoalsBudgetSummary } from "@/components/budget/GoalBudgetFields";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { GoalCard, type GoalForecastInfo } from "@/components/goals/GoalCard";
import { GoalFilters, type GoalSortBy } from "@/components/goals/GoalFilters";
import { GoalFormModal } from "@/components/goals/GoalFormModal";
import { GoalsHeader } from "@/components/goals/GoalsHeader";
import { Button } from "@/components/ui/button";
import { useFinancialContext } from "@/context";
import { withToast } from "@/lib/toast";
import { Priority, type CreateGoalInput, type Goal, type GoalCategory } from "@/types";
import { generateForecast } from "@/utils/forecastCalculator";

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.CRITICAL]: 4,
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
};

const NO_FORECAST: GoalForecastInfo = {
  estimatedCompletionMonth: undefined,
  onTrack: false,
  averageMonthlyAllocation: 0,
};

export default function GoalsPage() {
  const { state, addGoal, updateGoal, deleteGoal } = useFinancialContext();
  const confirm = useConfirm();

  const [modal, setModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [category, setCategory] = useState<GoalCategory | "all">("all");
  const [sortBy, setSortBy] = useState<GoalSortBy>("targetDate");

  const goals = useMemo(() => state.userPlan?.goals || [], [state.userPlan?.goals]);

  // O forecast é calculado uma única vez por mudança de plano (antes rodava 1x por meta a cada render).
  const forecastByGoal = useMemo(() => {
    const map = new Map<string, GoalForecastInfo>();
    if (goals.length === 0) return map;
    const result = generateForecast(state.userPlan, { months: 12 });
    for (const g of result.goalProgress) {
      map.set(g.id, {
        estimatedCompletionMonth: g.estimatedCompletionMonth,
        onTrack: g.onTrack,
        averageMonthlyAllocation: g.averageMonthlyAllocation,
      });
    }
    return map;
  }, [state.userPlan, goals.length]);

  const filteredGoals = useMemo(
    () =>
      goals
        .filter((goal) => category === "all" || goal.category === category)
        .sort((a, b) => {
          switch (sortBy) {
            case "name":
              return a.name.localeCompare(b.name);
            case "targetDate":
              return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
            case "progress": {
              const pa = (a.currentAmount / Math.max(1, a.targetAmount)) * 100;
              const pb = (b.currentAmount / Math.max(1, b.targetAmount)) * 100;
              return pb - pa;
            }
            case "priority":
              return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
            default:
              return 0;
          }
        }),
    [goals, category, sortBy],
  );

  const handleSubmit = async (values: CreateGoalInput) => {
    const editing = modal.goal;
    await withToast(editing ? updateGoal({ id: editing.id, ...values }) : addGoal(values), {
      loading: "Salvando meta...",
      success: editing ? "Meta atualizada" : "Meta adicionada",
      error: "Não foi possível salvar a meta",
    });
  };

  const handleDelete = async (goal: Goal) => {
    const ok = await confirm({
      title: "Excluir meta?",
      description: `A meta "${goal.name}" será removida. Essa ação não pode ser desfeita.`,
      confirmText: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await withToast(deleteGoal(goal.id), {
        success: "Meta excluída",
        error: "Não foi possível excluir a meta",
      });
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const openCreate = () => setModal({ open: true, goal: null });

  return (
    <div className="space-y-6 pb-12">
      <GoalsHeader goals={goals} onCreate={openCreate} />

      <GoalsBudgetSummary goals={goals} />

      <GoalFilters
        category={category}
        onCategoryChange={setCategory}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        shown={filteredGoals.length}
        total={goals.length}
      />

      <section aria-label="Lista de metas" className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Objetivos financeiros ({filteredGoals.length})</h2>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Target}
              title="Nenhuma meta encontrada"
              description="Comece adicionando seu primeiro objetivo financeiro para acompanhar seu progresso."
              action={
                <Button onClick={openCreate}>
                  <Plus aria-hidden />
                  Nova meta
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                forecast={forecastByGoal.get(goal.id) ?? NO_FORECAST}
                onEdit={(g) => setModal({ open: true, goal: g })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>

      <GoalFormModal
        open={modal.open}
        onOpenChange={(open) => setModal((prev) => ({ ...prev, open }))}
        goal={modal.goal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
