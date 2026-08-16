"use client";

import { useState, useRef, useEffect } from "react";
import { useFinancialContext } from "@/context";
import {
  Goal,
  GoalCategory,
  GoalType,
  Priority,
  CreateGoalInput,
} from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { generateForecast } from "@/utils/forecastCalculator";
import { useLanguage } from "@/context/LanguageContext";
import {
  formatLocalizedMonth,
  formatLocalizedDate,
} from "@/utils/dateFormatting";
import { GoalCategoryIcon, PriorityBadge } from "@/components/CategoryIcon";
import DatePicker from "@/components/DatePicker";

export default function GoalsPage() {
  const { state, addGoal, updateGoal, deleteGoal } = useFinancialContext();
  const { language, t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    GoalCategory | "all"
  >("all");
  const [sortBy, setSortBy] = useState<
    "name" | "targetDate" | "progress" | "priority"
  >("targetDate");

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAddingGoal && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddingGoal]);

  const [formData, setFormData] = useState<CreateGoalInput>({
    name: "",
    targetAmount: 0,
    targetDate: "",
    currentAmount: 0,
    description: "",
    category: GoalCategory.OTHER,
    priority: Priority.MEDIUM,
    isActive: true,
    goalType: GoalType.FIXED_AMOUNT,
    priorityOrder: 1,
  });

  const goals = state.userPlan?.goals || [];

  const filteredGoals = goals
    .filter(
      (goal) => selectedCategory === "all" || goal.category === selectedCategory
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "targetDate":
          return (
            new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
          );
        case "progress": {
          const progressA = (a.currentAmount / Math.max(1, a.targetAmount)) * 100;
          const progressB = (b.currentAmount / Math.max(1, b.targetAmount)) * 100;
          return progressB - progressA;
        }
        case "priority": {
          const priorityOrder = {
            [Priority.CRITICAL]: 4,
            [Priority.HIGH]: 3,
            [Priority.MEDIUM]: 2,
            [Priority.LOW]: 1,
          };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        default:
          return 0;
      }
    });

  const totalGoalAmount = goals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );
  const totalCurrentAmount = goals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0
  );
  const overallProgress =
    totalGoalAmount > 0 ? (totalCurrentAmount / totalGoalAmount) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGoal) {
        await updateGoal({
          id: editingGoal.id,
          ...formData,
        });
      } else {
        await addGoal(formData);
      }

      setFormData({
        name: "",
        targetAmount: 0,
        targetDate: "",
        currentAmount: 0,
        description: "",
        category: GoalCategory.OTHER,
        priority: Priority.MEDIUM,
        isActive: true,
        goalType: GoalType.FIXED_AMOUNT,
        priorityOrder: 1,
      });
      setIsAddingGoal(false);
      setEditingGoal(null);
    } catch (error) {
      console.error("Failed to save goal:", error);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      currentAmount: goal.currentAmount,
      description: goal.description || "",
      category: goal.category,
      priority: goal.priority,
      isActive: goal.isActive,
      goalType: goal.goalType,
      priorityOrder: goal.priorityOrder,
    });
    setIsAddingGoal(true);
  };

  const handleDelete = async (goalId: string) => {
    const confirmMsg = t("goals.deleteConfirm") || "Tem certeza que deseja excluir esta meta?";
    if (confirm(confirmMsg)) {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.error("Failed to delete goal:", error);
      }
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / Math.max(1, target)) * 100, 100);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return formatLocalizedDate(dateString, language);
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getGoalForecast = (goal: Goal) => {
    const forecastResult = generateForecast(state.userPlan, { months: 12 });
    const goalProgress = forecastResult.goalProgress.find(
      (g) => g.id === goal.id
    );

    if (goalProgress) {
      return {
        estimatedCompletionMonth: goalProgress.estimatedCompletionMonth,
        onTrack: goalProgress.onTrack,
        averageMonthlyAllocation: goalProgress.averageMonthlyAllocation,
      };
    }

    return {
      estimatedCompletionMonth: undefined,
      onTrack: false,
      averageMonthlyAllocation: 0,
    };
  };

  const formatCompletionDate = (monthString?: string) => {
    if (!monthString) return "Não estimada";
    const formatted = formatLocalizedMonth(monthString, language);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getRequiredMonthlyAllocation = (goal: Goal) => {
    if (goal.goalType === GoalType.OPEN_ENDED) return 0;
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    if (remainingAmount <= 0) return 0;

    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const monthsUntilTarget = Math.max(
      1,
      Math.ceil(
        (targetDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24 * 30.44)
      )
    );

    return remainingAmount / monthsUntilTarget;
  };

  return (
    <div className="space-y-6">
      {/* ── Executive Header Banner ──────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>{t("goals.pageTitle")}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {goals.filter((g) => g.isActive).length} {t("goals.activeGoals") || "Objetivos Ativos"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("goals.pageSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-right">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t("goals.overallProgress")}
            </div>
            <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">
              {overallProgress.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {formatCurrency(totalCurrentAmount)} / {formatCurrency(totalGoalAmount)}
            </div>
          </div>

          <button
            onClick={() => {
              setEditingGoal(null);
              setFormData({
                name: "",
                targetAmount: 0,
                targetDate: "",
                currentAmount: 0,
                description: "",
                category: GoalCategory.OTHER,
                priority: Priority.MEDIUM,
                isActive: true,
                goalType: GoalType.FIXED_AMOUNT,
                priorityOrder: 1,
              });
              setIsAddingGoal(!isAddingGoal);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("goals.addGoal")}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("goals.targetAmount")}
          </span>
          <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalGoalAmount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total planejado</div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("goals.currentProgress")}
          </span>
          <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalCurrentAmount)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capital acumulado</div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("goals.remaining") || "Saldo Restante"}
          </span>
          <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(Math.max(0, totalGoalAmount - totalCurrentAmount))}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Para meta total</div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("goals.totalGoals")}
          </span>
          <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
            {goals.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {goals.filter((g) => g.isActive).length} ativas no plano
          </div>
        </div>
      </div>

      {/* ── Filter & Sort Bar ────────────────────────────────────────── */}
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as GoalCategory | "all")}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs"
          >
            <option value="all">Todas as Categorias</option>
            {Object.values(GoalCategory).map((cat) => (
              <option key={cat} value={cat}>
                {t(`goals.category.${cat}`)}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "name" | "targetDate" | "progress" | "priority"
              )
            }
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs"
          >
            <option value="targetDate">{t("goals.sort.targetDate")}</option>
            <option value="name">{t("goals.sort.name")}</option>
            <option value="progress">{t("goals.sort.progress")}</option>
            <option value="priority">{t("goals.sort.priority")}</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando <strong className="text-slate-700 dark:text-slate-200 font-semibold">{filteredGoals.length}</strong> de <strong className="text-slate-700 dark:text-slate-200 font-semibold">{goals.length}</strong> metas
        </div>
      </div>

      {/* ── Add / Edit Goal Panel ────────────────────────────────────── */}
      {isAddingGoal && (
        <div
          ref={formRef}
          className="surface-card p-6 border-2 border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900/95 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {editingGoal ? t("goals.form.editTitle") : t("goals.form.addTitle")}
            </h3>
            <button
              onClick={() => {
                setIsAddingGoal(false);
                setEditingGoal(null);
              }}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("goals.form.name")} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
                placeholder="Ex: Fundo de Emergência, Viagem..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("common.category")} *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
              >
                {Object.values(GoalCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`goals.category.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("goals.targetAmount")} *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.targetAmount || ""}
                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("goals.currentAmount")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.currentAmount || ""}
                onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("goals.targetDate")} *
              </label>
              <DatePicker
                required
                value={formData.targetDate}
                onChange={(val) => setFormData({ ...formData, targetDate: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("goals.form.priority")}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
              >
                {Object.values(Priority).map((p) => (
                  <option key={p} value={p}>
                    {t(`common.priority.${p}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("common.description")}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 shadow-xs transition-colors"
                placeholder="Detalhes ou observações sobre o objetivo..."
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {editingGoal ? t("goals.editGoal") : t("goals.addGoal")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingGoal(false);
                  setEditingGoal(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Goals Grid Ledger ────────────────────────────────────────── */}
      <div className="surface-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("goals.pageTitle")} ({filteredGoals.length})
          </h2>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("goals.noGoals")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              {t("goals.startHelper")}
            </p>
            <button
              onClick={() => setIsAddingGoal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              {t("goals.addGoal")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredGoals.map((goal) => {
              const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
              const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
              const isOverdue = daysUntilTarget < 0;
              const isCompleted = progress >= 100;
              const forecast = getGoalForecast(goal);
              const completionDate = formatCompletionDate(forecast.estimatedCompletionMonth);
              const requiredMonthly = getRequiredMonthlyAllocation(goal);

              return (
                <div
                  key={goal.id}
                  className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
                        <GoalCategoryIcon category={goal.category} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {goal.name}
                          </h3>
                          <PriorityBadge
                            priority={goal.priority}
                            label={t(`common.priority.${goal.priority}`)}
                          />
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {t(`goals.category.${goal.category}`)}
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 dark:hover:text-indigo-400 border border-transparent hover:border-indigo-200/60 dark:hover:border-indigo-800/60 transition-colors cursor-pointer"
                        title="Editar meta"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 dark:hover:text-rose-400 border border-transparent hover:border-rose-200/60 dark:hover:border-rose-800/60 transition-colors cursor-pointer"
                        title="Excluir meta"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(goal.currentAmount)}{" "}
                        <span className="text-slate-400 dark:text-slate-500 font-normal">
                          / {formatCurrency(goal.targetAmount)}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(progress > 0 ? 1.5 : 0, progress))}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                        Aporte Necessário
                      </span>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100 text-xs sm:text-[13px]">
                        {formatCurrency(requiredMonthly)}{" "}
                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">/ mês</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                        Data Alvo
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100 text-xs sm:text-[13px]">
                        {formatDate(goal.targetDate)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                        Previsão
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px]">
                        {completionDate}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                        Status
                      </span>
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs sm:text-[13px] ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : forecast.onTrack ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {isCompleted ? "Concluída" : forecast.onTrack ? "No Ritmo" : "Ajuste Necessário"}
                        </span>
                        <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                            : isOverdue
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60"
                        }`}>
                          {isCompleted ? "Meta Atingida" : isOverdue ? `${Math.abs(daysUntilTarget)}d atraso` : `${daysUntilTarget}d restantes`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
