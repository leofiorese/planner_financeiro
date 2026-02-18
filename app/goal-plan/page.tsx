"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import {
  generateSuggestions,
  DEFAULT_SUGGESTION_CONFIG,
} from "@/utils/suggestionGenerator";
import {
  generateForecast,
  ForecastResult,
  ForecastConfig as UtilsForecastConfig,
} from "@/utils/forecastCalculator";
import { ForecastConfig } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatLocalizedMonth } from "@/utils/dateFormatting";

export default function SuggestionsPage() {
  const state = useFinancialState();
  const { language, t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const [showGoalAllocation, setShowGoalAllocation] = useState(true);
  const [allocationViewMode, setAllocationViewMode] = useState<
    "calendar" | "table" | "chart"
  >("calendar");

  // Generate suggestions based on current filters
  const suggestions = useMemo(() => {
    if (!state.userPlan) return [];
    return generateSuggestions(state.userPlan, DEFAULT_SUGGESTION_CONFIG);
  }, [state.userPlan]);

  // Convert persistent config to utils config
  const convertToUtilsConfig = (
    config: ForecastConfig
  ): UtilsForecastConfig => {
    return {
      months: config.months,
      startingBalance: config.startingBalance,
      startDate: config.startDate
        ? new Date(config.startDate + "-01T12:00:00")
        : undefined,
      includeGoalContributions: config.includeGoalContributions,
      conservativeMode: config.conservativeMode,
    };
  };

  // Generate forecast for goal allocation breakdown using the same config as forecast page
  const forecastResult: ForecastResult | null = useMemo(() => {
    if (!state.userPlan) return null;

    // Use the same forecast configuration as the forecast page
    const forecastConfig = state.userPlan.forecastConfig || {
      startingBalance: state.userPlan.currentBalance || 0,
      startDate: new Date().toISOString().slice(0, 7),
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: new Date().toISOString(),
    };

    return generateForecast(
      state.userPlan,
      convertToUtilsConfig(forecastConfig)
    );
  }, [state.userPlan]);

  // Format month for display
  const formatMonth = (monthKey: string) => {
    return formatLocalizedMonth(monthKey, language);
  };

  // Get goal allocation data for calendar view with percentage progress
  const getGoalAllocationData = () => {
    if (!forecastResult || !state.userPlan?.goals) return [];

    // Create a map to track cumulative allocations for each goal
    const goalTracker = new Map<string, number>();
    state.userPlan.goals.forEach((goal) => {
      goalTracker.set(goal.id, goal.currentAmount);
    });

    return forecastResult.monthlyForecasts.map((month) => {
      // Calculate percentage progress for each goal allocation in this month
      const enhancedGoalBreakdown = month.goalBreakdown.map(
        (goalAllocation) => {
          // Find the corresponding goal
          const goal = state.userPlan!.goals.find(
            (g) => g.id === goalAllocation.id
          );
          if (!goal)
            return {
              ...goalAllocation,
              progressPercent: 0,
              newTotal: 0,
              targetAmount: 0,
              goalType: "fixed_amount" as const,
              isCompleted: false,
            };

          // Update the tracker with this month's allocation
          const currentAmount = goalTracker.get(goal.id) || 0;
          const newTotal = currentAmount + goalAllocation.amount;
          goalTracker.set(goal.id, newTotal);

          // Calculate percentage progress
          const progressPercent =
            goal.goalType === "fixed_amount"
              ? Math.min(100, (newTotal / goal.targetAmount) * 100)
              : 0; // Open-ended goals don't have a percentage

          return {
            ...goalAllocation,
            progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
            newTotal: newTotal,
            targetAmount: goal.targetAmount,
            goalType: goal.goalType,
            isCompleted:
              goal.goalType === "fixed_amount" && newTotal >= goal.targetAmount,
          };
        }
      );

      return {
        month: month.month,
        monthLabel: formatMonth(month.month),
        goalBreakdown: enhancedGoalBreakdown,
        totalAllocation: month.goalContributions,
        surplus: month.income - month.expenses,
      };
    });
  };

  if (state.loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading suggestions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t("goalPlan.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {t("goalPlan.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goalPlan.summary.totalSuggestions")}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {suggestions.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goalPlan.summary.potentialImpact")}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(
                  suggestions.reduce(
                    (sum, s) => sum + Math.abs(s.estimatedImpact),
                    0
                  )
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("goalPlan.summary.perMonth")}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("goalPlan.summary.actionableItems")}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {suggestions.filter((s) => s.actionable).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Goal Allocation Breakdown */}
      {showGoalAllocation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📅 {t("goalPlan.schedule.title")}
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t("goalPlan.schedule.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("goalPlan.schedule.showAllocation")}
                </label>
                <input
                  type="checkbox"
                  checked={showGoalAllocation}
                  onChange={(e) => setShowGoalAllocation(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Export Button */}
              <button
                onClick={() => {
                  const data = getGoalAllocationData();
                  const csvContent = [
                    [
                      "Month",
                      "Goal",
                      "Allocation",
                      "Progress %",
                      "Target",
                      "Status",
                    ],
                    ...data.flatMap((month) =>
                      month.goalBreakdown.length > 0
                        ? month.goalBreakdown.map((goal) => [
                          month.monthLabel,
                          goal.name,
                          goal.amount.toString(),
                          goal.progressPercent?.toString() || "N/A",
                          goal.targetAmount.toString(),
                          goal.isCompleted ? "Completed" : "In Progress",
                        ])
                        : [
                          [
                            month.monthLabel,
                            "No allocations",
                            "0",
                            "N/A",
                            "N/A",
                            "N/A",
                          ],
                        ]
                    ),
                  ]
                    .map((row) => row.join(","))
                    .join("\\n");

                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `goal-allocation-schedule-${new Date().toISOString().split("T")[0]
                    }.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                title={t("goalPlan.schedule.export")}
              >
                📊 {t("goalPlan.schedule.export")}
              </button>

              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setAllocationViewMode("calendar")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${allocationViewMode === "calendar"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                >
                  📅 {t("goalPlan.schedule.view.calendar")}
                </button>
                <button
                  onClick={() => setAllocationViewMode("table")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${allocationViewMode === "table"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                >
                  📊 {t("goalPlan.schedule.view.table")}
                </button>
                <button
                  onClick={() => setAllocationViewMode("chart")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${allocationViewMode === "chart"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                >
                  📈 {t("goalPlan.schedule.view.chart")}
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Summary Statistics */}
          {forecastResult &&
            state.userPlan?.goals &&
            state.userPlan.goals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {t("goalPlan.stats.monthlyAvg")}
                      </p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatCurrency(
                          getGoalAllocationData().reduce(
                            (sum, month) => sum + month.totalAllocation,
                            0
                          ) / Math.max(getGoalAllocationData().length, 1)
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        {t("goalPlan.stats.onTrack")}
                      </p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {
                          forecastResult.goalProgress.filter((g) => g.onTrack)
                            .length
                        }{" "}
                        / {forecastResult.goalProgress.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        {t("goalPlan.stats.surplusMonths")}
                      </p>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {
                          getGoalAllocationData().filter(
                            (m) => m.surplus > m.totalAllocation
                          ).length
                        }
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💡</span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        {t("goalPlan.stats.peakAllocation")}
                      </p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {formatCurrency(
                          Math.max(
                            ...getGoalAllocationData().map(
                              (m) => m.totalAllocation
                            ),
                            0
                          )
                        )}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Content */}
          {!forecastResult ||
            !state.userPlan?.goals ||
            state.userPlan.goals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("goalPlan.empty.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("goalPlan.empty.desc")}
              </p>
              <a
                href="/goals"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🎯 {t("goalPlan.empty.button")}
              </a>
            </div>
          ) : (
            <>
              {/* Calendar View */}
              {allocationViewMode === "calendar" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {getGoalAllocationData().map((monthData) => (
                    <div
                      key={monthData.month}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="text-center mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {monthData.monthLabel}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t("goalPlan.calendar.total", { amount: formatCurrency(monthData.totalAllocation) })}
                        </p>
                      </div>

                      {monthData.goalBreakdown.length > 0 ? (
                        <div className="space-y-2">
                          {monthData.goalBreakdown.map((goal) => (
                            <div
                              key={goal.id}
                              className={`bg-white dark:bg-gray-800 rounded p-2 border ${goal.isCompleted
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-200 dark:border-gray-600"
                                }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {goal.name}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold ml-2">
                                  {formatCurrency(goal.amount)}
                                </span>
                              </div>

                              {/* Progress information */}
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                {goal.goalType === "fixed_amount" ? (
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {formatCurrency(goal.newTotal)} /{" "}
                                      {formatCurrency(goal.targetAmount)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={`font-semibold ${goal.isCompleted
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-blue-600 dark:text-blue-400"
                                          }`}
                                      >
                                        {goal.progressPercent}%
                                      </span>
                                      {goal.isCompleted && (
                                        <span className="text-green-600 dark:text-green-400">
                                          ✅
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span>Open-ended goal</span>
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {formatCurrency(goal.newTotal)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {monthData.surplus > monthData.totalAllocation && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                              💡{" "}
                              {t("goalPlan.calendar.surplusRemaining", { amount: formatCurrency(monthData.surplus - monthData.totalAllocation) })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t("goalPlan.calendar.noAllocations")}
                          </span>
                          {monthData.surplus > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {t("goalPlan.calendar.surplusAvailable", { amount: formatCurrency(monthData.surplus) })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Table View */}
              {allocationViewMode === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("goalPlan.table.month")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("goalPlan.table.allocations")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("goalPlan.table.total")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("goalPlan.table.surplus")}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t("goalPlan.table.guidance")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {getGoalAllocationData().map((monthData, index) => (
                        <tr
                          key={monthData.month}
                          className={
                            index % 2 === 0
                              ? "bg-white dark:bg-gray-800"
                              : "bg-gray-50 dark:bg-gray-700"
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {monthData.monthLabel}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {monthData.goalBreakdown.length > 0 ? (
                              <div className="space-y-2">
                                {monthData.goalBreakdown.map((goal) => (
                                  <div
                                    key={goal.id}
                                    className={`text-sm p-2 rounded ${goal.isCompleted
                                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                                      : "bg-gray-50 dark:bg-gray-700"
                                      }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                                        {goal.name}
                                      </span>
                                      <span className="text-green-600 dark:text-green-400 font-semibold">
                                        {formatCurrency(goal.amount)}
                                      </span>
                                    </div>

                                    {/* Progress information */}
                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                      {goal.goalType === "fixed_amount" ? (
                                        <div className="flex items-center justify-between">
                                          <span>
                                            {formatCurrency(goal.newTotal)} /{" "}
                                            {formatCurrency(goal.targetAmount)}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <span
                                              className={`font-semibold ${goal.isCompleted
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-blue-600 dark:text-blue-400"
                                                }`}
                                            >
                                              {goal.progressPercent}%
                                            </span>
                                            {goal.isCompleted && (
                                              <span className="text-green-600 dark:text-green-400">
                                                ✅
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <span>Open-ended</span>
                                          <span className="text-blue-600 dark:text-blue-400">
                                            Total:{" "}
                                            {formatCurrency(goal.newTotal)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t("goalPlan.calendar.noAllocations")}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {formatCurrency(monthData.totalAllocation)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {formatCurrency(
                                Math.max(
                                  0,
                                  monthData.surplus - monthData.totalAllocation
                                )
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {monthData.goalBreakdown.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-green-600 dark:text-green-400">
                                    ✅
                                  </span>
                                  <span>{t("goalPlan.table.goalsFunded")}</span>
                                </div>
                              ) : monthData.surplus > 0 ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 dark:text-blue-400">
                                    💡
                                  </span>
                                  <span>{t("goalPlan.table.surplusAvailable")}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-red-600 dark:text-red-400">
                                    ⚠️
                                  </span>
                                  <span>{t("goalPlan.table.noSurplus")}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Chart View */}
              {allocationViewMode === "chart" && (
                <div className="space-y-6">
                  {/* Monthly Allocation Trend Chart */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      📈 {t("goalPlan.chart.trends")}
                    </h3>
                    <div className="h-64 relative">
                      <div className="absolute inset-0 flex items-end justify-between">
                        {getGoalAllocationData().map((monthData) => {
                          const maxAllocation = Math.max(
                            ...getGoalAllocationData().map(
                              (m) => m.totalAllocation
                            ),
                            1
                          );
                          const heightPercent =
                            (monthData.totalAllocation / maxAllocation) * 100;
                          const surplusPercent =
                            monthData.surplus > 0
                              ? ((monthData.surplus -
                                monthData.totalAllocation) /
                                maxAllocation) *
                              100
                              : 0;

                          return (
                            <div
                              key={monthData.month}
                              className="flex flex-col items-center flex-1 group"
                            >
                              {/* Bar */}
                              <div className="w-full max-w-12 flex flex-col justify-end h-full relative">
                                {/* Surplus bar */}
                                {surplusPercent > 0 && (
                                  <div
                                    className="w-full bg-blue-200 dark:bg-blue-600 opacity-50 rounded-t transition-all duration-300 group-hover:opacity-75"
                                    style={{ height: `${surplusPercent}%` }}
                                    title={`Surplus: ${formatCurrency(
                                      monthData.surplus -
                                      monthData.totalAllocation
                                    )}`}
                                  />
                                )}

                                {/* Allocation bar */}
                                <div
                                  className="w-full bg-gradient-to-t from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-700 rounded-t"
                                  style={{ height: `${heightPercent}%` }}
                                  title={`Total Allocation: ${formatCurrency(
                                    monthData.totalAllocation
                                  )}`}
                                />

                                {/* Value label on hover */}
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {formatCurrency(monthData.totalAllocation)}
                                </div>
                              </div>

                              {/* Month label */}
                              <div className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                                {monthData.monthLabel
                                  .split(" ")[0]
                                  .substring(0, 3)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gradient-to-t from-blue-500 to-blue-600 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t("goalPlan.chart.legend.allocations")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-200 dark:bg-blue-600 opacity-50 rounded"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {t("goalPlan.chart.legend.surplus")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Goal Progress Distribution */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      🎯 {t("goalPlan.chart.distribution")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {state.userPlan?.goals?.map((goal) => {
                        const goalProgress = forecastResult?.goalProgress.find(
                          (g) => g.id === goal.id
                        );
                        const progressPercent =
                          goalProgress?.projectedProgress || 0;

                        return (
                          <div
                            key={goal.id}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                                {goal.name}
                              </h4>
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded ${progressPercent >= 100
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : progressPercent >= 75
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    : progressPercent >= 50
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  }`}
                              >
                                {progressPercent.toFixed(1)}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${progressPercent >= 100
                                  ? "bg-green-500"
                                  : progressPercent >= 75
                                    ? "bg-blue-500"
                                    : progressPercent >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                style={{
                                  width: `${Math.min(progressPercent, 100)}%`,
                                }}
                              />
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {goal.goalType === "fixed_amount" ? (
                                <span>
                                  {formatCurrency(goal.currentAmount)} /{" "}
                                  {formatCurrency(goal.targetAmount)}
                                </span>
                              ) : (
                                <span>
                                  {t("goalPlan.chart.openEnded", { amount: formatCurrency(goal.currentAmount) })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Goal Progress Projections */}
      {forecastResult && forecastResult.goalProgress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🎯 {t("goalPlan.projections.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("goalPlan.projections.subtitle")}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("goalPlan.projections.forecastPeriod")}
              </div>
              <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {t("goalPlan.projections.months", { count: state.userPlan?.forecastConfig?.months || 12 })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {forecastResult.goalProgress.map((goal) => (
              <div
                key={goal.id}
                className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                      {goal.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{t("goalPlan.projections.current")}</span>{" "}
                        {formatCurrency(goal.currentAmount)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{t("goalPlan.projections.projected")}</span>{" "}
                        {formatCurrency(goal.projectedAmount)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{t("goalPlan.projections.target")}</span>{" "}
                        {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {goal.projectedProgress.toFixed(1)}%
                    </div>
                    <div
                      className={`text-sm font-medium ${goal.projectedProgress >= 100
                        ? "text-green-600 dark:text-green-400"
                        : goal.onTrack
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                        }`}
                    >
                      {goal.projectedProgress >= 100
                        ? t("goalPlan.projections.willComplete")
                        : goal.onTrack
                          ? t("goalPlan.projections.onTrack")
                          : t("goalPlan.projections.behind")}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${goal.projectedProgress >= 100
                        ? "bg-green-600 dark:bg-green-400"
                        : goal.onTrack
                          ? "bg-green-600 dark:bg-green-400"
                          : "bg-red-600 dark:bg-red-400"
                        }`}
                      style={{
                        width: `${Math.min(goal.projectedProgress, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0%</span>
                    <span className="font-medium">
                      {t("goalPlan.projections.projectedLabel", { percent: goal.projectedProgress.toFixed(1) })}
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Goal Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.projections.monthlyAllocation")}
                    </div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(goal.averageMonthlyAllocation)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.projections.estimatedCompletion")}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {goal.estimatedCompletionMonth
                        ? formatMonth(goal.estimatedCompletionMonth)
                        : t("goalPlan.projections.notDetermined")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.projections.remainingAmount")}
                    </div>
                    <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(
                        Math.max(0, goal.targetAmount - goal.projectedAmount)
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Insights */}
                {goal.projectedProgress < 100 && !goal.onTrack && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">⚠️</span>
                      <span className="text-sm text-red-800 dark:text-red-200 font-medium">
                        {t("goalPlan.projections.warning")}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 ml-6">
                      {t("goalPlan.projections.warningDesc")}
                    </p>
                  </div>
                )}

                {goal.projectedProgress >= 100 && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">
                        ✅
                      </span>
                      <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                        {t("goalPlan.projections.success")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {forecastResult.goalProgress.filter((g) => g.onTrack).length}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {t("goalPlan.projections.summary.onTrack")}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {
                  forecastResult.goalProgress.filter(
                    (g) => g.projectedProgress >= 100
                  ).length
                }
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                {t("goalPlan.projections.summary.willComplete")}
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(
                  forecastResult.goalProgress.reduce(
                    (sum, goal) => sum + goal.averageMonthlyAllocation,
                    0
                  )
                )}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                {t("goalPlan.projections.summary.totalAllocation")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Planning Tools & What-If Scenarios */}
      {forecastResult && forecastResult.goalProgress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              🛠️ {t("goalPlan.tools.title")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {t("goalPlan.tools.subtitle")}
            </p>
          </div>

          <div className="space-y-8">
            {/* Allocation Optimizer */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                🎯 {t("goalPlan.optimizer.title")}
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current vs Optimized Comparison */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">
                    {t("goalPlan.optimizer.current")}
                  </h5>
                  {forecastResult.goalProgress.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {goal.name}
                        </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(goal.averageMonthlyAllocation)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Progress: {goal.projectedProgress.toFixed(1)}% •
                        {goal.estimatedCompletionMonth
                          ? ` Completes ${formatMonth(
                            goal.estimatedCompletionMonth
                          )}`
                          : " Timeline unclear"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optimization Suggestions */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">
                    {t("goalPlan.optimizer.suggestions")}
                  </h5>

                  {(() => {
                    const behindScheduleGoals =
                      forecastResult.goalProgress.filter(
                        (g) => !g.onTrack && g.projectedProgress < 100
                      );
                    const completingEarlyGoals =
                      forecastResult.goalProgress.filter(
                        (g) => g.projectedProgress > 100
                      );

                    const suggestions = [];

                    // Suggest reallocating from over-funded to under-funded goals
                    if (
                      behindScheduleGoals.length > 0 &&
                      completingEarlyGoals.length > 0
                    ) {
                      suggestions.push({
                        type: "reallocation",
                        title: t("goalPlan.optimizer.rebalance.title"),
                        description: t("goalPlan.optimizer.rebalance.desc", { early: completingEarlyGoals[0].name, late: behindScheduleGoals[0].name }),
                        impact: t("goalPlan.optimizer.rebalance.impact"),
                        icon: "⚖️",
                      });
                    }

                    // Suggest increasing allocation for behind goals
                    if (behindScheduleGoals.length > 0) {
                      const totalSurplus = getGoalAllocationData().reduce(
                        (sum, month) =>
                          sum +
                          Math.max(0, month.surplus - month.totalAllocation),
                        0
                      );
                      if (totalSurplus > 0) {
                        suggestions.push({
                          type: "increase",
                          title: t("goalPlan.optimizer.surplus.title"),
                          description: t("goalPlan.optimizer.surplus.desc", { amount: formatCurrency(totalSurplus) }),
                          impact: t("goalPlan.optimizer.surplus.impact"),
                          icon: "💡",
                        });
                      }
                    }

                    // Timeline optimization suggestion
                    suggestions.push({
                      type: "timeline",
                      title: t("goalPlan.optimizer.timeline.title"),
                      description: t("goalPlan.optimizer.timeline.desc"),
                      impact: t("goalPlan.optimizer.timeline.impact"),
                      icon: "📅",
                    });

                    return suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{suggestion.icon}</span>
                          <div className="flex-1">
                            <h6 className="font-medium text-green-800 dark:text-green-200 text-sm">
                              {suggestion.title}
                            </h6>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              {suggestion.description}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                              💡 {suggestion.impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* What-If Scenario Tools */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                🔮 {t("goalPlan.scenarios.title")}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Scenario 1: Increase Budget */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl">💰</span>
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                      {t("goalPlan.scenarios.budget.title")}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.scenarios.budget.desc")}
                    </p>
                  </div>

                  {(() => {
                    const currentAvg =
                      getGoalAllocationData().reduce(
                        (sum, month) => sum + month.totalAllocation,
                        0
                      ) / Math.max(getGoalAllocationData().length, 1);
                    const increasedBudget = currentAvg * 1.2;
                    const timeReduction = Math.round((1 - 1 / 1.2) * 100);

                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.budget.newAvg")}
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                            {formatCurrency(increasedBudget)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.budget.reduction")}
                          </span>
                          <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                            ~{timeReduction}%
                          </span>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-xs text-green-700 dark:text-green-300">
                          {t("goalPlan.scenarios.budget.impact", { speed: timeReduction > 15 ? t("goalPlan.scenarios.budget.impactHigh") : t("goalPlan.scenarios.budget.impactMod") })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Scenario 2: Extended Timeline */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl">📅</span>
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                      {t("goalPlan.scenarios.extension.title")}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.scenarios.extension.desc")}
                    </p>
                  </div>

                  {(() => {
                    const currentAvg =
                      getGoalAllocationData().reduce(
                        (sum, month) => sum + month.totalAllocation,
                        0
                      ) / Math.max(getGoalAllocationData().length, 1);
                    const extendedAllocation = currentAvg * 0.75; // Rough estimate of reduction

                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.extension.reduced")}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">
                            {formatCurrency(extendedAllocation)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.extension.savings")}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">
                            {formatCurrency(currentAvg - extendedAllocation)}
                          </span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-xs text-blue-700 dark:text-blue-300">
                          {t("goalPlan.scenarios.extension.impact")}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Scenario 3: Priority Reorder */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="text-center mb-3">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-2xl">🔄</span>
                    </div>
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                      {t("goalPlan.scenarios.priority.title")}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("goalPlan.scenarios.priority.desc")}
                    </p>
                  </div>

                  {(() => {
                    const highPriorityGoals =
                      forecastResult.goalProgress.filter((g) => {
                        const goal = state.userPlan?.goals?.find(
                          (ug) => ug.id === g.id
                        );
                        return goal?.priority === "high";
                      }).length;

                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.priority.highGoals")}
                          </span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">
                            {highPriorityGoals}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("goalPlan.scenarios.priority.strategy")}
                          </span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400 ml-1">
                            {t("goalPlan.scenarios.priority.strategyVal")}
                          </span>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-xs text-orange-700 dark:text-orange-300">
                          {t("goalPlan.scenarios.priority.impact")}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-6 border border-teal-200 dark:border-teal-800">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                ⚡ {t("goalPlan.quickActions.title")}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => {
                    // Export functionality - same as the existing export button above
                    const data = getGoalAllocationData();
                    const csvContent = [
                      [
                        "Month",
                        "Goal",
                        "Allocation",
                        "Progress %",
                        "Target",
                        "Status",
                      ],
                      ...data.flatMap((month) =>
                        month.goalBreakdown.length > 0
                          ? month.goalBreakdown.map((goal) => [
                            month.monthLabel,
                            goal.name,
                            goal.amount.toString(),
                            goal.progressPercent?.toString() || "N/A",
                            goal.targetAmount.toString(),
                            goal.isCompleted ? "Completed" : "In Progress",
                          ])
                          : [
                            [
                              month.monthLabel,
                              "No allocations",
                              "0",
                              "N/A",
                              "N/A",
                              "N/A",
                            ],
                          ]
                      ),
                    ]
                      .map((row) => row.join(","))
                      .join("\\n");

                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `goal-allocation-schedule-${new Date()
                      .toISOString()
                      .slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <span className="text-xl">📊</span>
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {t("goalPlan.quickActions.export")}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t("goalPlan.quickActions.exportDesc")}
                    </p>
                  </div>
                </button>

                <Link
                  href="/goals"
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <span className="text-xl">🎯</span>
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {t("goalPlan.quickActions.adjust")}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t("goalPlan.quickActions.adjustDesc")}
                    </p>
                  </div>
                </Link>

                <Link
                  href="/forecast"
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <span className="text-xl">🔮</span>
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {t("goalPlan.quickActions.settings")}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t("goalPlan.quickActions.settingsDesc")}
                    </p>
                  </div>
                </Link>

                <Link
                  href="/import-export"
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <span className="text-xl">💾</span>
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {t("goalPlan.quickActions.backup")}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t("goalPlan.quickActions.backupDesc")}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          💡 {t("goalPlan.tips.title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("goalPlan.tips.priority")}
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center space-x-2">
                <span>🚨</span>
                <span>
                  <strong>{t("goalPlan.tips.priority.critical").split(":")[0]}:</strong> {t("goalPlan.tips.priority.critical").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>⚠️</span>
                <span>
                  <strong>{t("goalPlan.tips.priority.high").split(":")[0]}:</strong> {t("goalPlan.tips.priority.high").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📋</span>
                <span>
                  <strong>{t("goalPlan.tips.priority.medium").split(":")[0]}:</strong> {t("goalPlan.tips.priority.medium").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>💡</span>
                <span>
                  <strong>{t("goalPlan.tips.priority.low").split(":")[0]}:</strong> {t("goalPlan.tips.priority.low").split(":")[1]}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t("goalPlan.tips.categories")}
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center space-x-2">
                <span>💰</span>
                <span>
                  <strong>{t("goalPlan.tips.categories.income").split(":")[0]}:</strong> {t("goalPlan.tips.categories.income").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>💳</span>
                <span>
                  <strong>{t("goalPlan.tips.categories.expense").split(":")[0]}:</strong> {t("goalPlan.tips.categories.expense").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>🎯</span>
                <span>
                  <strong>{t("goalPlan.tips.categories.goal").split(":")[0]}:</strong> {t("goalPlan.tips.categories.goal").split(":")[1]}
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📊</span>
                <span>
                  <strong>{t("goalPlan.tips.categories.general").split(":")[0]}:</strong> {t("goalPlan.tips.categories.general").split(":")[1]}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
