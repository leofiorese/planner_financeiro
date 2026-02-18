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
  formatDateWithTranslations,
  formatLocalizedMonth,
  formatLocalizedDate,
} from "@/utils/dateFormatting";

// Goal category icons mapping
const goalCategoryIcons = {
  [GoalCategory.EMERGENCY_FUND]: "🛡️",
  [GoalCategory.RETIREMENT]: "🏖️",
  [GoalCategory.EDUCATION]: "🎓",
  [GoalCategory.HOME_PURCHASE]: "🏠",
  [GoalCategory.VACATION]: "✈️",
  [GoalCategory.DEBT_PAYOFF]: "💳",
  [GoalCategory.MAJOR_PURCHASE]: "🛒",
  [GoalCategory.INVESTMENT]: "📈",
  [GoalCategory.OTHER]: "🎯",
};



// Priority colors and display names
const priorityConfig = {
  [Priority.LOW]: { color: "text-gray-600", bg: "bg-gray-100" },
  [Priority.MEDIUM]: {
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  [Priority.HIGH]: {
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  [Priority.CRITICAL]: {
    color: "text-red-600",
    bg: "bg-red-100",
  },
};

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

  // Form ref for auto-scroll
  const formRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to form when editing starts
  useEffect(() => {
    if (isAddingGoal && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddingGoal]);

  // Form state
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

  // Get goals from state
  const goals = state.userPlan?.goals || [];

  // Filter and sort goals
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
        case "progress":
          const progressA = (a.currentAmount / a.targetAmount) * 100;
          const progressB = (b.currentAmount / b.targetAmount) * 100;
          return progressB - progressA;
        case "priority":
          const priorityOrder = {
            [Priority.CRITICAL]: 4,
            [Priority.HIGH]: 3,
            [Priority.MEDIUM]: 2,
            [Priority.LOW]: 1,
          };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return 0;
      }
    });

  // Calculate total progress
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

  // Handle form submission
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

      // Reset form
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

  // Handle edit goal
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

  // Handle delete goal
  const handleDelete = async (goalId: string) => {
    if (confirm(t("goals.deleteConfirm"))) {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        console.error("Failed to delete goal:", error);
      }
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  // Get progress color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  // Format date
  const formatDate = (dateString: string) => {
    return formatLocalizedDate(dateString, language);
  };

  // Get days until target
  const getDaysUntilTarget = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate goal completion forecast
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

  // Format completion date
  const formatCompletionDate = (monthString?: string) => {
    if (!monthString) return t("goals.completionForecast") + ": N/A";

    return formatLocalizedMonth(monthString, language);
  };

  // Get goal type label
  const getGoalTypeLabel = (goalType: GoalType) => {
    return goalType === GoalType.FIXED_AMOUNT ? t("goals.form.goalTypeFixed") : t("goals.form.goalTypeOpen");
  };

  // Calculate required monthly allocation
  const getRequiredMonthlyAllocation = (goal: Goal) => {
    if (goal.goalType === GoalType.OPEN_ENDED) return 0;

    const remainingAmount = goal.targetAmount - goal.currentAmount;
    if (remainingAmount <= 0) return 0;

    const targetDate = new Date(goal.targetDate);
    const today = new Date();

    // Calculate months until target
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              🎯 {t("goals.pageTitle")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {t("goals.pageSubtitle")}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("goals.overallProgress")}
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallProgress.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(totalCurrentAmount)} {t("goals.progressText", { current: "", target: "" }).replace("{current}", "").replace("{target}", "").replace("  ", " ")}
              {formatCurrency(totalGoalAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goals.totalGoals")}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {goals.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goals.targetAmount")}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalGoalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goals.currentProgress")}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(totalCurrentAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goals.activeGoals")}
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {goals.filter((g) => g.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("goals.pageTitle")}
          </h2>
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as GoalCategory | "all")
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">{t("expenses.controls.filter.all")}</option>
              {Object.keys(goalCategoryIcons).map((key) => (
                <option key={key} value={key}>
                  {goalCategoryIcons[key as GoalCategory]} {t(`goals.category.${key}`)}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                  | "name"
                  | "targetDate"
                  | "progress"
                  | "priority"
                )
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="targetDate">{t("goals.sort.targetDate")}</option>
              <option value="name">{t("goals.sort.name")}</option>
              <option value="progress">{t("goals.sort.progress")}</option>
              <option value="priority">{t("goals.sort.priority")}</option>
            </select>
          </div>
        </div>

        {/* Add Goal Button */}
        <button
          onClick={() => setIsAddingGoal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t("goals.addGoal")}
        </button>
      </div>

      {/* Add/Edit Goal Form */}
      {isAddingGoal && (
        <div
          ref={formRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingGoal ? t("goals.form.editTitle") : t("goals.form.addTitle")}
            </h3>
            {editingGoal && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                📝 {editingGoal.name}
              </div>
            )}
          </div>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.name")} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("common.category")} *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as GoalCategory,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
              >
                {Object.keys(goalCategoryIcons).map((key) => (
                  <option key={key} value={key}>
                    {goalCategoryIcons[key as GoalCategory]} {t(`goals.category.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.targetAmount")} *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.targetAmount || ""}
                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.currentAmount")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.currentAmount || ""}
                onFocus={(e) => e.target.value === "0" && (e.target.value = "")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.targetDate")} *
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.priority")}
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as Priority,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {t(`common.priority.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.goalType")}
              </label>
              <select
                value={formData.goalType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalType: e.target.value as GoalType,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={GoalType.FIXED_AMOUNT}>{t("goals.form.goalTypeFixed")}</option>
                <option value={GoalType.OPEN_ENDED}>{t("goals.form.goalTypeOpen")}</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("goals.form.goalTypeHelp")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("goals.form.priorityOrder")}
              </label>
              <input
                type="number"
                min="1"
                value={formData.priorityOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priorityOrder: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("goals.form.priorityOrderHelp")}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("common.description")}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder={t("income.form.placeholder.description")}
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingGoal(false);
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
                }}
                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingGoal ? t("goals.editGoal") : t("goals.addGoal")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {filteredGoals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("goals.noGoals")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t("goals.startHelper")}
            </p>
            <button
              onClick={() => setIsAddingGoal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("goals.addGoal")}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredGoals.map((goal) => {
              const progress = getProgressPercentage(
                goal.currentAmount,
                goal.targetAmount
              );
              const daysUntilTarget = getDaysUntilTarget(goal.targetDate);
              const isOverdue = daysUntilTarget < 0;
              const isCompleted = progress >= 100;

              const forecast = getGoalForecast(goal);
              const completionDate = formatCompletionDate(
                forecast.estimatedCompletionMonth
              );
              const goalTypeLabel = getGoalTypeLabel(goal.goalType);

              return (
                <div
                  key={goal.id}
                  className={`p-6 transition-all duration-300 ${editingGoal?.id === goal.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg"
                    : ""
                    }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Editing indicator */}
                    {editingGoal?.id === goal.id && (
                      <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        {t("income.editing")}
                      </div>
                    )}

                    {/* Goal Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {goalCategoryIcons[goal.category]}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {goal.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${priorityConfig[goal.priority].bg
                                } ${priorityConfig[goal.priority].color}`}
                            >
                              {t(`common.priority.${goal.priority}`)}
                            </span>
                            <span>{t(`goals.category.${goal.category}`)}</span>
                          </div>
                        </div>
                      </div>

                      {goal.description && (
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {goal.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>{t("goals.progress")}</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                              progress
                            )}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Goal Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {t("goals.current")}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(goal.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {t("goals.target")}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {t("goals.card.remaining")}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(
                              goal.targetAmount - goal.currentAmount
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">
                            {t("goals.card.targetDate")}
                          </p>
                          <p
                            className={`font-semibold ${isOverdue
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-900 dark:text-gray-100"
                              }`}
                          >
                            {formatDate(goal.targetDate)}
                          </p>
                          {!isCompleted && (
                            <p
                              className={`text-xs ${isOverdue
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                                }`}
                            >
                              {isOverdue
                                ? t("goals.card.overdue", { days: Math.abs(daysUntilTarget) })
                                : t("goals.card.daysLeft", { days: daysUntilTarget })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Forecast Information */}
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          {t("goals.card.forecastTitle")}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {t("goals.card.goalType")}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {goalTypeLabel}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {t("goals.card.priorityOrder")}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              #{goal.priorityOrder}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {t("goals.card.monthlyAllocation")}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                getRequiredMonthlyAllocation(goal)
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {t("goals.card.estCompletion")}
                            </p>
                            <p
                              className={`font-semibold ${forecast.onTrack
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                                }`}
                            >
                              {completionDate}
                            </p>
                            {!isCompleted && (
                              <p
                                className={`text-xs ${forecast.onTrack
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                                  }`}
                              >
                                {forecast.onTrack
                                  ? t("goals.card.onTrack")
                                  : t("goals.card.behindSchedule")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="text-green-600 text-2xl">✅</span>
                      )}
                      <button
                        onClick={() => handleEdit(goal)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={t("goals.card.edit")}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title={t("goals.card.delete")}
                      >
                        🗑️
                      </button>
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
