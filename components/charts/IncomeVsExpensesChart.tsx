"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { UserPlan } from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { generateForecast } from "@/utils/forecastCalculator";
import { useLanguage } from "@/context/LanguageContext";
import { getDateLocale } from "@/utils/dateFormatting";

interface IncomeVsExpensesChartProps {
  userPlan: UserPlan;
  className?: string;
}

interface ChartDataPoint {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  netIncome: number;
  surplus: number;
  deficit: number;
}

export default function IncomeVsExpensesChart({
  userPlan,
  className = "",
}: IncomeVsExpensesChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"6" | "12" | "24">("12");
  const [showProjection, setShowProjection] = useState(true);
  const [focusedLine, setFocusedLine] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

  const chartData = useMemo(() => {
    if (!userPlan) return [];

    const formatMonth = (monthKey: string) => {
      const date = new Date(monthKey + "-01T12:00:00");
      return date.toLocaleDateString(getDateLocale(language), {
        year: "2-digit",
        month: "short",
      });
    };

    const forecastConfig = userPlan.forecastConfig || {
      startingBalance: userPlan.currentBalance || 0,
      startDate: new Date().toISOString().slice(0, 7),
      months: parseInt(selectedPeriod),
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: new Date().toISOString(),
    };

    const currentYear = new Date().getFullYear();
    const utilsConfig = {
      months: parseInt(selectedPeriod),
      startingBalance: forecastConfig.startingBalance,
      startDate: new Date(currentYear, 0, 1),
      includeGoalContributions: forecastConfig.includeGoalContributions,
      conservativeMode: forecastConfig.conservativeMode,
    };

    const forecastResult = generateForecast(userPlan, utilsConfig);

    return forecastResult.monthlyForecasts.map((forecast): ChartDataPoint => {
      const netIncome = forecast.income - forecast.expenses;
      return {
        month: forecast.month,
        monthLabel: formatMonth(forecast.month),
        income: forecast.income,
        expenses: forecast.expenses,
        netIncome,
        surplus: netIncome > 0 ? netIncome : 0,
        deficit: netIncome < 0 ? Math.abs(netIncome) : 0,
      };
    });
  }, [userPlan, selectedPeriod, language]);

  // Custom tooltip with high contrast and tabular numerals
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[];
  }) => {
    if (active && payload && payload.length) {
      const data: ChartDataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl backdrop-blur-md min-w-[200px]">
          <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            {data.monthLabel}
          </p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {t("charts.incomeVsExpenses.tooltip.income")}:
              </span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.income)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {t("charts.incomeVsExpenses.tooltip.expenses")}:
              </span>
              <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(data.expenses)}
              </span>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  {t("charts.incomeVsExpenses.tooltip.net")}:
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    data.netIncome >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(data.netIncome)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendClick = (data: any) => {
    if (data && data.dataKey) {
      setFocusedLine(focusedLine === data.dataKey ? null : data.dataKey);
    }
  };

  const getLineOpacity = (dataKey: string) => {
    if (!focusedLine) return 1;
    return focusedLine === dataKey ? 1 : 0.25;
  };

  const getLineStrokeWidth = (dataKey: string) => {
    if (!focusedLine) return 2.5;
    return focusedLine === dataKey ? 3.5 : 1.5;
  };

  const avgIncome = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.income, 0) / chartData.length : 0;
  const avgExpenses = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.expenses, 0) / chartData.length : 0;
  const avgNet = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.netIncome, 0) / chartData.length : 0;

  return (
    <div className={`surface-card p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            {t("charts.incomeVsExpenses.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("charts.incomeVsExpenses.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("charts.incomeVsExpenses.period")}:
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) =>
                setSelectedPeriod(e.target.value as "6" | "12" | "24")
              }
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="6">6 {t("charts.incomeVsExpenses.months")}</option>
              <option value="12">12 {t("charts.incomeVsExpenses.months")}</option>
              <option value="24">24 {t("charts.incomeVsExpenses.months")}</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              id="showProjection"
              checked={showProjection}
              onChange={(e) => setShowProjection(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t("charts.incomeVsExpenses.showProjection")}
          </label>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="currentColor" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(150, 150, 150, 0.2)" }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={handleLegendClick}
              wrapperStyle={{ cursor: "pointer", fontSize: "12px", paddingTop: "12px" }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.5} />

            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={getLineStrokeWidth("income")}
              opacity={getLineOpacity("income")}
              name={t("charts.incomeVsExpenses.series.income")}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: "#10b981" }}
            />

            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={getLineStrokeWidth("expenses")}
              opacity={getLineOpacity("expenses")}
              name={t("charts.incomeVsExpenses.series.expenses")}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: "#ef4444" }}
            />

            <Line
              type="monotone"
              dataKey="netIncome"
              stroke="#6366f1"
              strokeWidth={getLineStrokeWidth("netIncome")}
              opacity={getLineOpacity("netIncome")}
              name={t("charts.incomeVsExpenses.series.netIncome")}
              dot={{ fill: "#6366f1", strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: "#6366f1" }}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats Strip */}
      <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t("charts.incomeVsExpenses.avgIncome")}
          </div>
          <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(avgIncome)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t("charts.incomeVsExpenses.avgExpenses")}
          </div>
          <div className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
            {formatCurrency(avgExpenses)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t("charts.incomeVsExpenses.avgNet")}
          </div>
          <div
            className={`text-sm font-bold tabular-nums mt-0.5 ${
              avgNet >= 0
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(avgNet)}
          </div>
        </div>
      </div>
    </div>
  );
}
