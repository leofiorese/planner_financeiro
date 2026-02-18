"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useFinancialContext } from "@/context";
import {
  generateForecast,
  ForecastConfig as UtilsForecastConfig,
  ForecastResult,
  aggregateForecastForCalendar,
  MonthlyForecastCalendarData,
} from "@/utils/forecastCalculator";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateWithTranslations } from "@/utils/dateFormatting";
import { ForecastConfig } from "@/types";

export default function ForecastPage() {
  const { state, updateForecastConfig } = useFinancialContext();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [localConfig, setLocalConfig] = useState<ForecastConfig>(
    state.userPlan?.forecastConfig || {
      startingBalance: state.userPlan?.currentBalance || 0,
      startDate: new Date().toISOString().slice(0, 7),
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: new Date().toISOString(),
    }
  );
  const [selectedView, setSelectedView] = useState<
    "table" | "chart" | "goals" | "calendar"
  >("table");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isAutoRecalculating, setIsAutoRecalculating] = useState(false);

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

  // Sync local config with context when userPlan changes
  useEffect(() => {
    if (state.userPlan?.forecastConfig) {
      setLocalConfig(state.userPlan.forecastConfig);
    }
  }, [state.userPlan?.forecastConfig]);

  // Update forecast configuration in context
  const updateConfig = async (newConfig: Partial<ForecastConfig>) => {
    const updatedConfig = { ...localConfig, ...newConfig };
    setLocalConfig(updatedConfig);

    try {
      setIsRecalculating(true);
      await updateForecastConfig(updatedConfig);
    } catch (error) {
      console.error("Failed to update forecast config:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Manual recalculate function
  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await updateForecastConfig({
        ...localConfig,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to recalculate forecast:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Reset all forecast configuration to defaults
  const handleResetAll = async () => {
    try {
      setIsRecalculating(true);
      setShowResetConfirmation(false);
      const defaultConfig: ForecastConfig = {
        startingBalance: state.userPlan?.currentBalance || 0,
        startDate: new Date().toISOString().slice(0, 7),
        months: 12,
        includeGoalContributions: true,
        conservativeMode: false,
        updatedAt: new Date().toISOString(),
      };
      await updateForecastConfig(defaultConfig);
    } catch (error) {
      console.error("Failed to reset forecast config:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Generate forecast when data or config changes
  const forecastResult: ForecastResult = useMemo(() => {
    if (!state.userPlan)
      return {
        monthlyForecasts: [],
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          totalGoalContributions: 0,
          finalBalance: 0,
          averageMonthlyIncome: 0,
          averageMonthlyExpenses: 0,
          averageMonthlyNet: 0,
          lowestBalance: 0,
          highestBalance: 0,
          monthsWithNegativeBalance: 0,
        },
        goalProgress: [],
      };

    return generateForecast(state.userPlan, convertToUtilsConfig(localConfig));
  }, [state.userPlan, localConfig]);

  // Generate calendar data for calendar view
  const calendarData: MonthlyForecastCalendarData[] = useMemo(() => {
    if (!forecastResult.monthlyForecasts.length) return [];

    // Debug logging for calendar data generation
    if (process.env.NODE_ENV === "development") {
      console.log("🗓️ Generating calendar data from forecast result:");
      console.log(
        "   First month expenses:",
        forecastResult.monthlyForecasts[0]?.expenses
      );
      console.log("   Total months:", forecastResult.monthlyForecasts.length);
    }

    const result = aggregateForecastForCalendar(
      forecastResult,
      new Date(localConfig.startDate + "-01T12:00:00"),
      localConfig.months
    );

    // Debug logging for calendar data output
    if (process.env.NODE_ENV === "development") {
      console.log("🗓️ Calendar data generated:");
      console.log("   First month totalExpenses:", result[0]?.totalExpenses);
      console.log("   Calendar data length:", result.length);
    }

    return result;
  }, [forecastResult, localConfig.startDate, localConfig.months]);

  // Auto-recalculation effect
  useEffect(() => {
    setIsAutoRecalculating(true);
    const timer = setTimeout(() => setIsAutoRecalculating(false), 500);
    return () => clearTimeout(timer);
  }, [localConfig]);

  const formatMonth = (monthKey: string) => {
    return formatDateWithTranslations(monthKey + "-01", t, {
      includeYear: true,
      shortMonth: false,
      includeDate: false,
    });
  };

  const getForecastDateRange = () => {
    const startDate = new Date(localConfig.startDate + "-01T12:00:00");
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + localConfig.months - 1);

    return {
      start: formatMonth(localConfig.startDate),
      end: formatMonth(endDate.toISOString().slice(0, 7)),
    };
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 0) return "text-green-600 dark:text-green-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBalanceBgColor = (balance: number) => {
    if (balance >= 0) return "bg-green-50 dark:bg-green-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  if (state.loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="space-y-6">
          {/* Title Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              📈 {t("forecast.pageTitle")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {t("forecast.pageSubtitle")}
            </p>
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              {t("forecast.period")}: {getForecastDateRange().start} - {getForecastDateRange().end}
              {isAutoRecalculating && (
                <span className="ml-2 inline-flex items-center">
                  <svg
                    className="animate-spin h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("forecast.recalculating")}
                </span>
              )}
            </p>
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            {/* Row 1: Starting Balance */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-fit">
                  {t("forecast.startingBalance")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={localConfig.startingBalance || ""}
                    onFocus={(e) =>
                      e.target.value === "0" && (e.target.value = "")
                    }
                    onChange={(e) =>
                      updateConfig({
                        startingBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() =>
                      updateConfig({
                        startingBalance: state.userPlan?.currentBalance || 0,
                      })
                    }
                    className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    title={t("forecast.title.resetCurrent")}
                  >
                    {t("forecast.reset")}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={t("forecast.title.recalculate")}
                >
                  {isRecalculating ? t("forecast.calculating") : t("forecast.recalculate")}
                </button>
                <button
                  onClick={() => setShowResetConfirmation(true)}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  title={t("forecast.title.resetAll")}
                >
                  {t("forecast.resetAll")}
                </button>
              </div>
            </div>

            {/* Row 2: Date and Period Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                  {t("forecast.startDate")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={localConfig.startDate}
                    onChange={(e) =>
                      updateConfig({
                        startDate: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                    title={t("forecast.title.selectStart")}
                  />
                  <button
                    onClick={() =>
                      updateConfig({
                        startDate: new Date().toISOString().slice(0, 7),
                      })
                    }
                    className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    title={t("forecast.title.resetMonth")}
                  >
                    {t("forecast.now")}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-fit">
                  {t("forecast.forecastPeriod")}
                </label>
                <select
                  value={localConfig.months}
                  onChange={(e) =>
                    updateConfig({
                      months: parseInt(e.target.value),
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value={6}>6 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"}</option>
                  <option value={12}>1 {t("common.date").toLowerCase().includes("data") ? "ano" : "year"} (12 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                  <option value={18}>1.5 {t("common.date").toLowerCase().includes("data") ? "anos" : "years"} (18 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                  <option value={24}>2 {t("common.date").toLowerCase().includes("data") ? "anos" : "years"} (24 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                  <option value={36}>3 {t("common.date").toLowerCase().includes("data") ? "anos" : "years"} (36 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                  <option value={48}>4 {t("common.date").toLowerCase().includes("data") ? "anos" : "years"} (48 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                  <option value={60}>5 {t("common.date").toLowerCase().includes("data") ? "anos" : "years"} (60 {t("common.date").toLowerCase().includes("data") ? "meses" : "months"})</option>
                </select>
              </div>
            </div>

            {/* Row 3: Toggle Options */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="conservativeMode"
                  checked={localConfig.conservativeMode}
                  onChange={(e) =>
                    updateConfig({
                      conservativeMode: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="conservativeMode"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("forecast.conservativeMode")}
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeGoals"
                  checked={localConfig.includeGoalContributions}
                  onChange={(e) =>
                    updateConfig({
                      includeGoalContributions: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="includeGoals"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("forecast.includeGoals")}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("forecast.finalBalance")}
              </p>
              <p
                className={`text-2xl font-bold ${getBalanceColor(
                  forecastResult.summary.finalBalance
                )}`}
              >
                {formatCurrency(forecastResult.summary.finalBalance)}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${getBalanceBgColor(
                forecastResult.summary.finalBalance
              )}`}
            >
              <svg
                className={`w-6 h-6 ${getBalanceColor(
                  forecastResult.summary.finalBalance
                )}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("forecast.afterMonths", { months: localConfig.months })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("forecast.totalIncome")}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(forecastResult.summary.totalIncome)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("forecast.avgMonth", { amount: formatCurrency(forecastResult.summary.averageMonthlyIncome) })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("forecast.totalExpenses")}
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(forecastResult.summary.totalExpenses)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("forecast.avgMonth", { amount: formatCurrency(forecastResult.summary.averageMonthlyExpenses) })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t("forecast.totalGoalContributions")}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(forecastResult.summary.totalGoalContributions)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("forecast.towardGoals")}
          </p>
        </div>
      </div>

      {/* View Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t("forecast.details")}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedView("table")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "table"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              {t("forecast.view.table")}
            </button>
            <button
              onClick={() => setSelectedView("chart")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "chart"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              {t("forecast.view.chart")}
            </button>
            <button
              onClick={() => setSelectedView("goals")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "goals"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              {t("forecast.view.goals")}
            </button>
            <button
              onClick={() => setSelectedView("calendar")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedView === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
            >
              {t("forecast.view.calendar")}
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {selectedView === "table" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.month")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.startingBalance")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.income")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.expenses")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.goals")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.netChange")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("forecast.table.endingBalance")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {forecastResult.monthlyForecasts.map((month, index) => (
                  <tr
                    key={month.month}
                    className={
                      index % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-700"
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatMonth(month.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(month.startingBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      <div className="flex items-center gap-2">
                        <span>+{formatCurrency(month.income)}</span>
                        {month.incomeBreakdown.length > 0 && (
                          <div className="relative group">
                            <svg
                              className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-lg min-w-max max-w-xs border border-gray-600 dark:border-gray-500">
                                <div className="font-semibold mb-2 text-center">
                                  {formatMonth(month.month)} {t("forecast.table.income")}
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {month.incomeBreakdown.map((income, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center gap-4"
                                    >
                                      <span className="text-gray-300 truncate">
                                        {income.name}
                                      </span>
                                      <span className="font-medium text-green-300 whitespace-nowrap">
                                        +{formatCurrency(income.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t border-gray-600 dark:border-gray-500 mt-2 pt-2">
                                  <div className="flex justify-between items-center font-semibold">
                                    <span>{t("common.total")}</span>
                                    <span className="text-green-300">
                                      +{formatCurrency(month.income)}
                                    </span>
                                  </div>
                                </div>

                                {/* Tooltip arrow pointing up */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                      <div className="flex items-center gap-2">
                        <span>-{formatCurrency(month.expenses)}</span>
                        {month.expenseBreakdown.length > 0 && (
                          <div className="relative group">
                            <svg
                              className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-lg min-w-max max-w-xs border border-gray-600 dark:border-gray-500">
                                <div className="font-semibold mb-2 text-center">
                                  {formatMonth(month.month)} {t("forecast.table.expenses")}
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {month.expenseBreakdown.map(
                                    (expense, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center gap-4"
                                      >
                                        <div className="text-gray-300 truncate">
                                          <span>{expense.name}</span>
                                          {expense.installmentInfo
                                            ?.isInstallment && (
                                              <span className="text-xs text-blue-300 ml-2">
                                                (
                                                {
                                                  expense.installmentInfo
                                                    .currentMonth
                                                }
                                                /
                                                {
                                                  expense.installmentInfo
                                                    .totalMonths
                                                }
                                                )
                                              </span>
                                            )}
                                        </div>
                                        <span className="font-medium text-red-300 whitespace-nowrap">
                                          -{formatCurrency(expense.amount)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                                <div className="border-t border-gray-600 dark:border-gray-500 mt-2 pt-2">
                                  <div className="flex justify-between items-center font-semibold">
                                    <span>{t("common.total")}</span>
                                    <span className="text-red-300">
                                      -{formatCurrency(month.expenses)}
                                    </span>
                                  </div>
                                </div>

                                {/* Tooltip arrow pointing up */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                      <div className="flex items-center gap-2">
                        <span>-{formatCurrency(month.goalContributions)}</span>
                        {month.goalBreakdown.length > 0 && (
                          <div className="relative group">
                            <svg
                              className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-3 shadow-lg min-w-max max-w-xs border border-gray-600 dark:border-gray-500">
                                <div className="font-semibold mb-2 text-center">
                                  {formatMonth(month.month)} {t("forecast.totalGoalContributions")}
                                </div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {month.goalBreakdown.map((goal, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center gap-4"
                                    >
                                      <span className="text-gray-300 truncate">
                                        {goal.name}
                                      </span>
                                      <span className="font-medium text-blue-300 whitespace-nowrap">
                                        -{formatCurrency(goal.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t border-gray-600 dark:border-gray-500 mt-2 pt-2">
                                  <div className="flex justify-between items-center font-semibold">
                                    <span>{t("common.total")}</span>
                                    <span className="text-blue-300">
                                      -{formatCurrency(month.goalContributions)}
                                    </span>
                                  </div>
                                </div>

                                {/* Tooltip arrow pointing up */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-700"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getBalanceColor(
                        month.netChange
                      )}`}
                    >
                      {month.netChange >= 0 ? "+" : ""}
                      {formatCurrency(month.netChange)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getBalanceColor(
                        month.endingBalance
                      )}`}
                    >
                      {formatCurrency(month.endingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart View */}
      {selectedView === "chart" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("forecast.chart.title")}
          </h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {forecastResult.monthlyForecasts.map((month) => {
              const maxBalance = Math.max(
                ...forecastResult.monthlyForecasts.map((m) => m.endingBalance),
                0 // Ensure we include zero as a reference point
              );
              const minBalance = Math.min(
                ...forecastResult.monthlyForecasts.map((m) => m.endingBalance),
                0 // Ensure we include zero as a reference point
              );

              // Calculate the range and ensure we have a reasonable scale
              const range = Math.max(maxBalance - minBalance, 1000); // Minimum range of 1000
              const zeroPoint = Math.abs(minBalance) / range; // Where zero line should be

              // Calculate height as percentage from bottom
              let height: number;
              if (month.endingBalance >= 0) {
                // Positive balance: height from zero line upward
                height = (month.endingBalance / range) * 100;
              } else {
                // Negative balance: height from bottom to zero line
                height =
                  ((Math.abs(minBalance) + month.endingBalance) / range) * 100;
              }

              // Ensure minimum visible height
              height = Math.max(height, 2);

              return (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative"
                    style={{ height: "200px" }}
                  >
                    {/* Zero line indicator */}
                    {minBalance < 0 && (
                      <div
                        className="absolute w-full border-t-2 border-gray-400 dark:border-gray-500 border-dashed"
                        style={{ bottom: `${zeroPoint * 100}%` }}
                      />
                    )}

                    {/* Balance bar */}
                    <div
                      className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${month.endingBalance >= 0
                        ? "bg-green-500 dark:bg-green-400"
                        : "bg-red-500 dark:bg-red-400"
                        }`}
                      style={{ height: `${height}%` }}
                      title={`${formatMonth(month.month)}: ${formatCurrency(
                        month.endingBalance
                      )}`}
                    />

                    {/* Net change indicator */}
                    <div
                      className={`absolute top-1 right-1 w-2 h-2 rounded-full ${month.netChange >= 0
                        ? "bg-green-600 dark:bg-green-300"
                        : "bg-red-600 dark:bg-red-300"
                        }`}
                      title={t("forecast.title.netChange", { amount: formatCurrency(month.netChange) })}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {month.month.split("-")[1]}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {t("forecast.chart.low")}: {formatCurrency(forecastResult.summary.lowestBalance)}
            </span>
            <span>
              {t("forecast.chart.avgNet")}:{" "}
              {formatCurrency(forecastResult.summary.averageMonthlyNet)}
            </span>
            <span>
              {t("forecast.chart.high")}: {formatCurrency(forecastResult.summary.highestBalance)}
            </span>
          </div>

          {/* Chart Legend */}
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded mr-2"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {t("forecast.chart.legend.positive")}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded mr-2"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {t("forecast.chart.legend.negative")}
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded mr-2"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {t("forecast.chart.legend.zero")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Goal Progress View */}
      {selectedView === "goals" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("forecast.goals.title")}
          </h3>
          {forecastResult.goalProgress.length > 0 ? (
            <div className="space-y-4">
              {forecastResult.goalProgress.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {goal.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("forecast.goals.progressText", { current: formatCurrency(goal.projectedAmount), target: formatCurrency(goal.targetAmount) })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {goal.projectedProgress.toFixed(1)}%
                      </p>
                      <p
                        className={`text-xs ${goal.onTrack
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                          }`}
                      >
                        {goal.onTrack ? t("forecast.goals.onTrack") : t("forecast.goals.behind")}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${goal.projectedProgress >= 100
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
                  {goal.estimatedCompletionMonth && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {t("forecast.goals.estimatedCompletion")}:{" "}
                      {formatMonth(goal.estimatedCompletionMonth)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {t("forecast.goals.noActive")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {selectedView === "calendar" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t("forecast.calendar.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {calendarData.map((monthData) => (
              <div
                key={monthData.month}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {monthData.monthLabel}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("forecast.table.startingBalance")}: {formatCurrency(monthData.startingBalance)}
                  </p>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2">
                  {/* Income */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {t("forecast.table.income")}:
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      +{formatCurrency(monthData.totalIncome)}
                    </span>
                  </div>

                  {/* Expenses */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {t("forecast.table.expenses")}:
                    </span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(monthData.totalExpenses)}
                    </span>
                  </div>

                  {/* Goal Contributions */}
                  {monthData.totalGoalContributions > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {t("forecast.table.goals")}:
                      </span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        -{formatCurrency(monthData.totalGoalContributions)}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>

                  {/* Net Change */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("forecast.table.netChange")}:
                    </span>
                    <span
                      className={`text-sm font-bold ${monthData.netChange >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                        }`}
                    >
                      {monthData.netChange >= 0 ? "+" : ""}
                      {formatCurrency(monthData.netChange)}
                    </span>
                  </div>

                  {/* Ending Balance */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t("forecast.table.endingBalance")}:
                    </span>
                    <span
                      className={`text-sm font-bold ${getBalanceColor(
                        monthData.endingBalance
                      )}`}
                    >
                      {formatCurrency(monthData.endingBalance)}
                    </span>
                  </div>
                </div>

                {/* Detailed breakdowns - expandable */}
                {(monthData.forecastData.incomeBreakdown.length > 0 ||
                  monthData.forecastData.expenseBreakdown.length > 0 ||
                  monthData.forecastData.goalBreakdown.length > 0) && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                        {t("forecast.calendar.viewDetails")} (
                        {monthData.forecastData.incomeBreakdown.length +
                          monthData.forecastData.expenseBreakdown.length +
                          monthData.forecastData.goalBreakdown.length}{" "}
                        {t("forecast.calendar.items")})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {/* Income Details */}
                        {monthData.forecastData.incomeBreakdown.map((income) => (
                          <div
                            key={`income-${income.id}`}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="text-green-700 dark:text-green-300 truncate">
                              📈 {income.name}
                            </span>
                            <span className="text-green-700 dark:text-green-300 font-medium ml-2">
                              +{formatCurrency(income.amount)}
                            </span>
                          </div>
                        ))}

                        {/* Expense Details */}
                        {monthData.forecastData.expenseBreakdown.map(
                          (expense) => (
                            <div
                              key={`expense-${expense.id}`}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="text-red-700 dark:text-red-300 truncate">
                                💸 {expense.name}
                                {expense.installmentInfo?.isInstallment && (
                                  <span className="text-orange-600 dark:text-orange-400 ml-1">
                                    ({expense.installmentInfo.currentMonth}/
                                    {expense.installmentInfo.totalMonths})
                                  </span>
                                )}
                              </span>
                              <span className="text-red-700 dark:text-red-300 font-medium ml-2">
                                -{formatCurrency(expense.amount)}
                              </span>
                            </div>
                          )
                        )}

                        {/* Goal Details */}
                        {monthData.forecastData.goalBreakdown.map((goal) => (
                          <div
                            key={`goal-${goal.id}`}
                            className="flex justify-between items-center text-xs"
                          >
                            <span className="text-blue-700 dark:text-blue-300 truncate">
                              🎯 {goal.name}
                            </span>
                            <span className="text-blue-700 dark:text-blue-300 font-medium ml-2">
                              -{formatCurrency(goal.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {calendarData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {t("forecast.calendar.noData")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {forecastResult.summary.monthsWithNegativeBalance > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                {t("forecast.warning.cashFlow")}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {t("forecast.warning.negativeBalance", { months: forecastResult.summary.monthsWithNegativeBalance })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md mx-4">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {t("forecast.resetModal.title")}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t("forecast.resetModal.content")}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowResetConfirmation(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleResetAll}
                disabled={isRecalculating}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRecalculating ? t("forecast.resetModal.resetting") : t("forecast.resetAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
