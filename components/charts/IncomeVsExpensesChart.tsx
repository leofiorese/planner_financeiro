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

  // Helper function to format month
  const formatMonth = (monthKey: string) => {
    const date = new Date(monthKey + "-01T12:00:00");
    return date.toLocaleDateString(getDateLocale(language), {
      year: "2-digit",
      month: "short",
    });
  };

  // Generate forecast data for the chart
  const chartData = useMemo(() => {
    if (!userPlan) return [];

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
  }, [userPlan, selectedPeriod]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {data.monthLabel}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-green-600 dark:text-green-400">
                💰 {t("charts.incomeVsExpenses.tooltip.income")}:
              </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(data.income)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600 dark:text-red-400">
                💸 {t("charts.incomeVsExpenses.tooltip.expenses")}:
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(data.expenses)}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300">
                  📊 {t("charts.incomeVsExpenses.tooltip.net")}:
                </span>
                <span
                  className={`font-semibold ${data.netIncome >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {formatCurrency(data.netIncome)}
                </span>
              </div>
              {data.surplus > 0 && (
                <div className="flex justify-between items-center text-xs text-blue-600 dark:text-blue-400">
                  <span>📈 {t("charts.incomeVsExpenses.tooltip.surplus")}:</span>
                  <span>{formatCurrency(data.surplus)}</span>
                </div>
              )}
              {data.deficit > 0 && (
                <div className="flex justify-between items-center text-xs text-red-600 dark:text-red-400">
                  <span>📉 {t("charts.incomeVsExpenses.tooltip.deficit")}:</span>
                  <span>{formatCurrency(data.deficit)}</span>
                </div>
              )}
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
    return focusedLine === dataKey ? 1 : 0.3;
  };

  const getLineStrokeWidth = (dataKey: string) => {
    if (!focusedLine) return 2;
    return focusedLine === dataKey ? 3 : 1;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📈 {t("charts.incomeVsExpenses.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.incomeVsExpenses.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              {t("charts.incomeVsExpenses.period")}:
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) =>
                setSelectedPeriod(e.target.value as "6" | "12" | "24")
              }
              className="px-3 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              <option value="6">6 {t("charts.incomeVsExpenses.months")}</option>
              <option value="12">12 {t("charts.incomeVsExpenses.months")}</option>
              <option value="24">24 {t("charts.incomeVsExpenses.months")}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showProjection"
              checked={showProjection}
              onChange={(e) => setShowProjection(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="showProjection"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {t("charts.incomeVsExpenses.showProjection")}
            </label>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: "#666" }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: "#666" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={handleLegendClick}
              wrapperStyle={{ cursor: "pointer" }}
            />

            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />

            {/* Income line */}
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={getLineStrokeWidth("income")}
              opacity={getLineOpacity("income")}
              name={`💰 ${t("charts.incomeVsExpenses.series.income")}`}
              dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#10B981" }}
            />

            {/* Expenses line */}
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#EF4444"
              strokeWidth={getLineStrokeWidth("expenses")}
              opacity={getLineOpacity("expenses")}
              name={`💸 ${t("charts.incomeVsExpenses.series.expenses")}`}
              dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#EF4444" }}
            />

            {/* Net Income line */}
            <Line
              type="monotone"
              dataKey="netIncome"
              stroke="#3B82F6"
              strokeWidth={getLineStrokeWidth("netIncome")}
              opacity={getLineOpacity("netIncome")}
              name={`📊 ${t("charts.incomeVsExpenses.series.netIncome")}`}
              dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#3B82F6" }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(
              chartData.reduce((sum, item) => sum + item.income, 0) /
              chartData.length
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.incomeVsExpenses.avgIncome")}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(
              chartData.reduce((sum, item) => sum + item.expenses, 0) /
              chartData.length
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.incomeVsExpenses.avgExpenses")}
          </div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${chartData.reduce((sum, item) => sum + item.netIncome, 0) >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
              }`}
          >
            {formatCurrency(
              chartData.reduce((sum, item) => sum + item.netIncome, 0) /
              chartData.length
            )}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.incomeVsExpenses.avgNet")}
          </div>
        </div>
      </div>

      {/* Chart Instructions */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t("charts.incomeVsExpenses.help")}
      </div>
    </div>
  );
}
