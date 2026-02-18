/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { UserPlan, Goal, GoalType, Priority } from "@/types";
import { generateForecast } from "@/utils/forecastCalculator";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { getDateLocale } from "@/utils/dateFormatting";

interface GoalProgressChartProps {
  userPlan: UserPlan;
  className?: string;
}

interface GoalProgressData {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  remainingAmount: number;
  estimatedCompletionMonth?: string;
  isOnTrack: boolean;
  priority: Priority;
  goalType: GoalType;
  monthsUntilTarget: number;
  averageMonthlyAllocation: number;
}

const COLORS = {
  onTrack: "#10B981",
  behindSchedule: "#EF4444",
  completed: "#10B981",
  openEnded: "#8B5CF6",
};

const PRIORITY_COLORS = {
  [Priority.CRITICAL]: "#DC2626",
  [Priority.HIGH]: "#EA580C",
  [Priority.MEDIUM]: "#D97706",
  [Priority.LOW]: "#65A30D",
};

export default function GoalProgressChart({
  userPlan,
  className = "",
}: GoalProgressChartProps) {
  const [viewMode, setViewMode] = useState<
    "progress" | "timeline" | "allocation"
  >("progress");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const state = useFinancialState();
  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

  // Process goal data for visualization
  const goalData = useMemo(() => {
    if (!userPlan?.goals) return [];

    const forecastResult = generateForecast(userPlan, {
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
    });

    const goals = showOnlyActive
      ? userPlan.goals.filter((goal) => goal.isActive)
      : userPlan.goals;

    return goals.map((goal): GoalProgressData => {
      const goalProgress = forecastResult.goalProgress.find(
        (gp) => gp.id === goal.id
      );
      const progressPercent =
        goal.goalType === GoalType.FIXED_AMOUNT
          ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
          : 0;

      const targetDate = new Date(goal.targetDate);
      const currentDate = new Date();
      const monthsUntilTarget = Math.max(
        0,
        (targetDate.getFullYear() - currentDate.getFullYear()) * 12 +
        (targetDate.getMonth() - currentDate.getMonth())
      );

      return {
        id: goal.id,
        name: goal.name,
        currentAmount: goal.currentAmount,
        targetAmount: goal.targetAmount,
        progressPercent,
        remainingAmount: Math.max(0, goal.targetAmount - goal.currentAmount),
        estimatedCompletionMonth: goalProgress?.estimatedCompletionMonth,
        isOnTrack: goalProgress?.onTrack || false,
        priority: goal.priority,
        goalType: goal.goalType,
        monthsUntilTarget,
        averageMonthlyAllocation: goalProgress?.averageMonthlyAllocation || 0,
      };
    });
  }, [userPlan, showOnlyActive]);

  const formatMonth = (monthKey?: string) => {
    if (!monthKey) return "N/A";
    const date = new Date(monthKey + "-01");
    // Use the current language from the hook
    return date.toLocaleDateString(getDateLocale(language), {
      year: "numeric",
      month: "short",
    });
  };

  const getGoalColor = (goal: GoalProgressData) => {
    if (goal.goalType === GoalType.OPEN_ENDED) return COLORS.openEnded;
    if (goal.progressPercent >= 100) return COLORS.completed;
    return goal.isOnTrack ? COLORS.onTrack : COLORS.behindSchedule;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const goal = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-w-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {goal.name}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t("charts.goals.tooltip.progress")}:
              </span>
              <span className="font-semibold">
                {goal.progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">{t("charts.goals.tooltip.current")}:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(goal.currentAmount)}
              </span>
            </div>
            {goal.goalType === GoalType.FIXED_AMOUNT && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("charts.goals.tooltip.target")}:
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("charts.goals.tooltip.remaining")}:
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(goal.remainingAmount)}
                  </span>
                </div>
              </>
            )}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("charts.goals.tooltip.status")}:
                </span>
                <span
                  className={`font-semibold ${goal.isOnTrack
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {goal.isOnTrack ? t("charts.goals.status.onTrack") : t("charts.goals.status.behind")}
                </span>
              </div>
              {goal.estimatedCompletionMonth && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("charts.goals.tooltip.completion")}:
                  </span>
                  <span className="text-sm">
                    {formatMonth(goal.estimatedCompletionMonth)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const ProgressBarView = () => (
    <div className="space-y-4">
      {goalData.map((goal) => (
        <div
          key={goal.id}
          className={`p-4 border rounded-lg transition-all cursor-pointer ${selectedGoal === goal.id
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          onClick={() =>
            setSelectedGoal(selectedGoal === goal.id ? null : goal.id)
          }
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {goal.name}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium`}
                style={{
                  backgroundColor: PRIORITY_COLORS[goal.priority] + "20",
                  color: PRIORITY_COLORS[goal.priority],
                }}
              >
                {goal.priority}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${goal.isOnTrack
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
              >
                {goal.isOnTrack ? t("charts.goals.status.onTrack") : t("charts.goals.status.behind")}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>
              {formatCurrency(goal.currentAmount)} /{" "}
              {formatCurrency(goal.targetAmount)}
            </span>
            <span>{goal.progressPercent.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, goal.progressPercent)}%`,
                backgroundColor: getGoalColor(goal),
              }}
            />
          </div>

          {selectedGoal === goal.id && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("charts.goals.monthlyAllocation")}:
                </span>
                <span className="font-medium">
                  {formatCurrency(goal.averageMonthlyAllocation)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("charts.goals.tooltip.remaining")}:
                </span>
                <span className="font-medium">{goal.monthsUntilTarget}</span>
              </div>
              {goal.estimatedCompletionMonth && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("charts.goals.tooltip.completion")}:
                  </span>
                  <span className="font-medium">
                    {formatMonth(goal.estimatedCompletionMonth)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const TimelineView = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={goalData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="progressPercent" radius={[4, 4, 0, 0]}>
            {goalData.map((goal, index) => (
              <Cell key={`cell-${index}`} fill={getGoalColor(goal)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const AllocationView = () => {
    const pieData = goalData
      .filter((goal) => goal.averageMonthlyAllocation > 0)
      .map((goal) => ({
        name: goal.name,
        value: goal.averageMonthlyAllocation,
        color: getGoalColor(goal),
      }));

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                formatCurrency(value as number),
                t("charts.goals.monthlyAllocation"),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🎯 {t("charts.goals.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.goals.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyActive"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="showOnlyActive"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {t("charts.goals.activeOnly")}
            </label>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("progress")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "progress"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              📊 {t("charts.goals.view.progress")}
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "timeline"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              📅 {t("charts.goals.view.timeline")}
            </button>
            <button
              onClick={() => setViewMode("allocation")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "allocation"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              🥧 {t("charts.goals.view.allocation")}
            </button>
          </div>
        </div>
      </div>

      {goalData.length > 0 ? (
        <>
          {viewMode === "progress" && <ProgressBarView />}
          {viewMode === "timeline" && <TimelineView />}
          {viewMode === "allocation" && <AllocationView />}

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {goalData.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.goals.totalGoals")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {goalData.filter((g) => g.isOnTrack).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.goals.onTrack")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(
                  goalData.reduce((sum, g) => sum + g.currentAmount, 0)
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.goals.totalSaved")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(
                  goalData.reduce(
                    (sum, g) => sum + g.averageMonthlyAllocation,
                    0
                  )
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.goals.monthlyAllocation")}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("charts.goals.noData.title")}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t("charts.goals.noData.desc")}
          </p>
        </div>
      )}

      {/* Chart Instructions */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t("charts.goals.help")}
      </div>
    </div>
  );
}
