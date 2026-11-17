"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { UserPlan, GoalType, Priority } from "@/types";
import { generateForecast } from "@/utils/forecastCalculator";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { getDateLocale } from "@/utils/dateFormatting";
import { PriorityBadge } from "@/components/CategoryIcon";

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
  onTrack: "#10b981",
  behindSchedule: "#f43f5e",
  completed: "#10b981",
  openEnded: "#6366f1",
};

export default function GoalProgressChart({
  userPlan,
  className = "",
}: GoalProgressChartProps) {
  const [viewMode, setViewMode] = useState<"progress" | "timeline" | "allocation">("progress");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

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
          ? Math.min(100, (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100)
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

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: GoalProgressData }>;
  }) => {
    if (active && payload && payload.length) {
      const goal = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl backdrop-blur-md max-w-sm">
          <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            {goal.name}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">
                {t("charts.goals.tooltip.progress")}:
              </span>
              <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {goal.progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">{t("charts.goals.tooltip.current")}:</span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(goal.currentAmount)}
              </span>
            </div>
            {goal.goalType === GoalType.FIXED_AMOUNT && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">{t("charts.goals.tooltip.target")}:</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">{t("charts.goals.tooltip.remaining")}:</span>
                  <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {formatCurrency(goal.remainingAmount)}
                  </span>
                </div>
              </>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">{t("charts.goals.tooltip.status")}:</span>
                <span
                  className={`font-semibold ${
                    goal.isOnTrack ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {goal.isOnTrack ? t("charts.goals.status.onTrack") : t("charts.goals.status.behind")}
                </span>
              </div>
              {goal.estimatedCompletionMonth && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-600 dark:text-slate-400">{t("charts.goals.tooltip.completion")}:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
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

  const totalSaved = goalData.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalAllocation = goalData.reduce((sum, g) => sum + g.averageMonthlyAllocation, 0);

  return (
    <div className={`surface-card p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t("charts.goals.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("charts.goals.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              id="showOnlyActive"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t("charts.goals.activeOnly")}
          </label>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            {(["progress", "timeline", "allocation"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {goalData.length > 0 ? (
        <>
          {viewMode === "progress" && (
            <div className="space-y-3">
              {goalData.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                return (
                  <div
                    key={goal.id}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs"
                        : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                    onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {goal.name}
                        </span>
                        <PriorityBadge priority={goal.priority} />
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          goal.isOnTrack
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        }`}
                      >
                        {goal.isOnTrack ? t("charts.goals.status.onTrack") : t("charts.goals.status.behind")}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                        <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(goal.currentAmount)}</strong>
                        {" / "}
                        {formatCurrency(goal.targetAmount)}
                      </span>
                      <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                        {goal.progressPercent.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(3, goal.progressPercent))}%`,
                          backgroundColor: getGoalColor(goal),
                        }}
                      />
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 text-xs grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-[10px]">
                            {t("charts.goals.monthlyAllocation")}
                          </div>
                          <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {formatCurrency(goal.averageMonthlyAllocation)}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-[10px]">
                            {t("charts.goals.tooltip.remaining")}
                          </div>
                          <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {goal.monthsUntilTarget} mo
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-600 dark:text-slate-400 text-[10px]">
                            {t("charts.goals.tooltip.completion")}
                          </div>
                          <div className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {formatMonth(goal.estimatedCompletionMonth)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "timeline" && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={goalData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="currentColor" />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    height={45}
                    tick={{ fontSize: 10, fill: "currentColor" }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
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
          )}

          {viewMode === "allocation" && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalData
                      .filter((goal) => goal.averageMonthlyAllocation > 0)
                      .map((goal) => ({
                        name: goal.name,
                        value: goal.averageMonthlyAllocation,
                        color: getGoalColor(goal),
                      }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={45}
                    dataKey="value"
                  >
                    {goalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getGoalColor(entry)} />
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
          )}

          {/* Summary Stats Footer */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("charts.goals.totalGoals")}
              </div>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {goalData.length}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("charts.goals.onTrack")}
              </div>
              <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {goalData.filter((g) => g.isOnTrack).length}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("charts.goals.totalSaved")}
              </div>
              <div className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(totalSaved)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("charts.goals.monthlyAllocation")}
              </div>
              <div className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {formatCurrency(totalAllocation)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("charts.goals.noData.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t("charts.goals.noData.desc")}
          </p>
        </div>
      )}
    </div>
  );
}
