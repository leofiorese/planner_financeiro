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
import MonthPicker from "@/components/MonthPicker";

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
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

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

  useEffect(() => {
    if (state.userPlan?.forecastConfig) {
      setLocalConfig(state.userPlan.forecastConfig);
    }
  }, [state.userPlan?.forecastConfig]);

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

  const calendarData: MonthlyForecastCalendarData[] = useMemo(() => {
    if (!forecastResult.monthlyForecasts.length) return [];

    return aggregateForecastForCalendar(
      forecastResult,
      new Date(localConfig.startDate + "-01T12:00:00"),
      localConfig.months
    );
  }, [forecastResult, localConfig.startDate, localConfig.months]);

  useEffect(() => {
    setIsAutoRecalculating(true);
    const timer = setTimeout(() => setIsAutoRecalculating(false), 400);
    return () => clearTimeout(timer);
  }, [localConfig]);

  const formatMonth = (monthKey: string) => {
    return formatDateWithTranslations(monthKey + "-01", t, {
      includeYear: true,
      shortMonth: false,
      includeDate: false,
    });
  };

  const formatShortMonth = (monthKey: string) => {
    return formatDateWithTranslations(monthKey + "-01", t, {
      includeYear: false,
      shortMonth: true,
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
    if (balance >= 0) return "text-emerald-700 dark:text-emerald-400";
    return "text-rose-700 dark:text-rose-400";
  };

  // Chart bounds & geometry calculation
  const { maxVal, minVal, span, zeroBaselinePct } = useMemo(() => {
    const balances = forecastResult.monthlyForecasts.map((m) => m.endingBalance);
    const max = balances.length ? Math.max(...balances, 0) : 0;
    const min = balances.length ? Math.min(...balances, 0) : 0;
    const s = Math.max(max - min, 100);
    const zeroPct = min < 0 ? (Math.abs(min) / s) * 100 : 0;
    return { maxVal: max, minVal: min, span: s, zeroBaselinePct: zeroPct };
  }, [forecastResult.monthlyForecasts]);

  if (state.loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>{t("forecast.pageTitle")}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
              Horizonte: {localConfig.months} {localConfig.months === 1 ? "Mês" : "Meses"}
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-2">
            <span>
              {t("forecast.period")}: <strong className="text-slate-800 dark:text-slate-200">{getForecastDateRange().start}</strong> → <strong className="text-slate-800 dark:text-slate-200">{getForecastDateRange().end}</strong>
            </span>
            {isAutoRecalculating && (
              <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-medium animate-pulse">
                • {t("forecast.recalculating")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {isRecalculating && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            )}
            <span>{isRecalculating ? t("forecast.calculating") || "Calculando..." : t("forecast.recalculate")}</span>
          </button>
          <button
            onClick={() => setShowResetConfirmation(true)}
            className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors"
          >
            {t("forecast.resetAll")}
          </button>
        </div>
      </div>

      {/* ── Cashflow Warnings Alert (if negative balance exists) ─────── */}
      {forecastResult.summary.monthsWithNegativeBalance > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-base leading-none mt-0.5">⚠️</span>
          <div>
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
              {t("forecast.warning.cashFlow")}
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
              {t("forecast.warning.negativeBalance").replace(
                "{{months}}",
                forecastResult.summary.monthsWithNegativeBalance.toString()
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Configuration Controls Ribbon ────────────────────────────── */}
      <div className="surface-card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end border border-slate-200/80 dark:border-slate-800">
        {/* Starting Balance */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("forecast.startingBalance")}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="0.01"
              value={localConfig.startingBalance !== undefined ? localConfig.startingBalance : ""}
              onChange={(e) =>
                updateConfig({
                  startingBalance: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              placeholder="0.00"
            />
            <button
              onClick={() =>
                updateConfig({
                  startingBalance: state.userPlan?.currentBalance || 0,
                })
              }
              className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              title={t("forecast.title.resetCurrent") || "Sincronizar com saldo atual"}
            >
              Sincronizar
            </button>
          </div>
        </div>

        {/* Start Month */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("forecast.startDate")}
          </label>
          <MonthPicker
            value={localConfig.startDate}
            onChange={(val) => updateConfig({ startDate: val })}
          />
        </div>

        {/* Forecast Period */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t("forecast.forecastPeriod")}
          </label>
          <select
            value={localConfig.months}
            onChange={(e) => updateConfig({ months: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          >
            <option value={6}>6 Meses</option>
            <option value={12}>12 Meses (1 Ano)</option>
            <option value={18}>18 Meses (1.5 Anos)</option>
            <option value={24}>24 Meses (2 Anos)</option>
            <option value={36}>36 Meses (3 Anos)</option>
            <option value={60}>60 Meses (5 Anos)</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2 pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={localConfig.conservativeMode}
              onChange={(e) => updateConfig({ conservativeMode: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:checked:bg-indigo-600"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("forecast.conservativeMode")}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={localConfig.includeGoalContributions}
              onChange={(e) => updateConfig({ includeGoalContributions: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:checked:bg-indigo-600"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("forecast.includeGoals")}
            </span>
          </label>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("forecast.finalBalance")}
          </span>
          <div
            className={`text-xl font-bold tabular-nums mt-1.5 ${getBalanceColor(
              forecastResult.summary.finalBalance
            )}`}
          >
            {formatCurrency(forecastResult.summary.finalBalance)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Ao fim de {localConfig.months} {localConfig.months === 1 ? "mês" : "meses"}
          </div>
        </div>

        <div className="surface-card p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("forecast.totalIncome")}
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1.5">
            {formatCurrency(forecastResult.summary.totalIncome)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            ~{formatCurrency(forecastResult.summary.averageMonthlyIncome)} / mês
          </div>
        </div>

        <div className="surface-card p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("forecast.totalExpenses")}
          </span>
          <div className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-400 mt-1.5">
            {formatCurrency(forecastResult.summary.totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            ~{formatCurrency(forecastResult.summary.averageMonthlyExpenses)} / mês
          </div>
        </div>

        <div className="surface-card p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t("forecast.totalGoalContributions")}
          </span>
          <div className="text-xl font-bold tabular-nums text-indigo-700 dark:text-indigo-400 mt-1.5">
            {formatCurrency(forecastResult.summary.totalGoalContributions)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {t("forecast.towardGoals")}
          </div>
        </div>
      </div>

      {/* ── View Mode Switcher Toolbar ───────────────────────────────── */}
      <div className="surface-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200/80 dark:border-slate-800">
        <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 pl-1">
          {t("forecast.details")}
        </h2>

        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 border border-slate-200 dark:border-slate-700/80">
          {[
            { id: "table" as const, label: t("forecast.view.table") },
            { id: "chart" as const, label: t("forecast.view.chart") },
            { id: "goals" as const, label: t("forecast.view.goals") },
            { id: "calendar" as const, label: t("forecast.view.calendar") },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedView(v.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                selectedView === v.id
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table View ──────────────────────────────────────────────── */}
      {selectedView === "table" && (
        <div className="surface-card overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-left">{t("forecast.table.month")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.startingBalance")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.income")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.expenses")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.goals")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.netChange")}</th>
                  <th className="px-4 py-3 text-right">{t("forecast.table.endingBalance")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {forecastResult.monthlyForecasts.map((month) => (
                  <tr
                    key={month.month}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatMonth(month.month)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {formatCurrency(month.startingBalance)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      +{formatCurrency(month.income)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      -{formatCurrency(month.expenses)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                      {month.goalContributions > 0 ? `-${formatCurrency(month.goalContributions)}` : "—"}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap ${getBalanceColor(
                        month.netChange
                      )}`}
                    >
                      {month.netChange >= 0 ? "+" : ""}
                      {formatCurrency(month.netChange)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap ${getBalanceColor(
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

      {/* ── Chart View ──────────────────────────────────────────────── */}
      {selectedView === "chart" && (
        <div className="surface-card p-6 border border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("forecast.chart.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("forecast.projection")} ({localConfig.months} {localConfig.months === 1 ? "mês" : "meses"})
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {t("forecast.chart.legend.positive") || "Saldo Positivo"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {t("forecast.chart.legend.negative") || "Saldo Negativo"}
                </span>
              </div>
              {minVal < 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {t("forecast.chart.legend.zero") || "Linha Zero"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chart Canvas Area */}
          <div className="relative pt-6 pb-2">
            {/* Zero reference line if negative values exist */}
            {minVal < 0 && (
              <div
                className="absolute left-0 right-0 border-b border-dashed border-slate-300 dark:border-slate-600 z-10 pointer-events-none"
                style={{ bottom: `calc(40px + ${zeroBaselinePct}% * 1.8)` }}
              />
            )}

            <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-2">
              {forecastResult.monthlyForecasts.map((month) => {
                const isPositive = month.endingBalance >= 0;
                let barHeightPct = 0;
                let barBottomPct = 0;

                if (minVal < 0) {
                  if (isPositive) {
                    barBottomPct = zeroBaselinePct;
                    barHeightPct = Math.max((month.endingBalance / span) * 100, 3);
                  } else {
                    barHeightPct = Math.max((Math.abs(month.endingBalance) / span) * 100, 3);
                    barBottomPct = Math.max(zeroBaselinePct - barHeightPct, 0);
                  }
                } else {
                  barBottomPct = 0;
                  barHeightPct = Math.max(((month.endingBalance) / (maxVal || 1)) * 100, 4);
                }

                const isHovered = hoveredMonth === month.month;

                return (
                  <div
                    key={month.month}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(month.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Hover Tooltip Popover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-3 z-30 pointer-events-none bg-slate-900/95 dark:bg-slate-800 text-white text-[11px] p-2.5 rounded-lg shadow-xl border border-slate-700/60 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                        <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1 mb-1.5">
                          {formatMonth(month.month)}
                        </div>
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">{t("forecast.table.endingBalance")}:</span>
                            <span
                              className={`font-bold tabular-nums ${
                                isPositive ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(month.endingBalance)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">{t("forecast.table.income")}:</span>
                            <span className="font-medium text-emerald-400 tabular-nums">
                              +{formatCurrency(month.income)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">{t("forecast.table.expenses")}:</span>
                            <span className="font-medium text-rose-400 tabular-nums">
                              -{formatCurrency(month.expenses)}
                            </span>
                          </div>
                          {month.goalContributions > 0 && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">{t("forecast.table.goals")}:</span>
                              <span className="font-medium text-indigo-400 tabular-nums">
                                -{formatCurrency(month.goalContributions)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-700/60 font-semibold">
                            <span className="text-slate-300">{t("forecast.table.netChange")}:</span>
                            <span
                              className={`tabular-nums ${
                                month.netChange >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {month.netChange >= 0 ? "+" : ""}
                              {formatCurrency(month.netChange)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bar track container */}
                    <div className="w-full bg-slate-100/80 dark:bg-slate-800/60 rounded-t relative flex items-end justify-center h-[180px]">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          isPositive
                            ? "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                            : "bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400"
                        } ${isHovered ? "ring-2 ring-indigo-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900" : ""}`}
                        style={{
                          height: `${Math.min(100, barHeightPct)}%`,
                          bottom: minVal < 0 ? `${barBottomPct}%` : undefined,
                          position: minVal < 0 ? "absolute" : "relative",
                        }}
                      />
                    </div>

                    {/* Localized X-axis month label */}
                    <div className="mt-2 text-center select-none w-full">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                        {formatShortMonth(month.month)}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">
                        {month.month.split("-")[0].slice(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Summary Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center justify-between sm:justify-start sm:gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {t("forecast.chart.low") || "Mínimo"}:
              </span>
              <span
                className={`font-bold tabular-nums ${getBalanceColor(
                  forecastResult.summary.lowestBalance
                )}`}
              >
                {formatCurrency(forecastResult.summary.lowestBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-center sm:gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {t("forecast.chart.avgNet") || "Média Líquida"}:
              </span>
              <span
                className={`font-bold tabular-nums ${getBalanceColor(
                  forecastResult.summary.averageMonthlyNet
                )}`}
              >
                {forecastResult.summary.averageMonthlyNet >= 0 ? "+" : ""}
                {formatCurrency(forecastResult.summary.averageMonthlyNet)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end sm:gap-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {t("forecast.chart.high") || "Máximo"}:
              </span>
              <span
                className={`font-bold tabular-nums ${getBalanceColor(
                  forecastResult.summary.highestBalance
                )}`}
              >
                {formatCurrency(forecastResult.summary.highestBalance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Goals Timeline View ─────────────────────────────────────── */}
      {selectedView === "goals" && (
        <div className="surface-card p-6 border border-slate-200/80 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t("forecast.goals.title")}
          </h3>
          {forecastResult.goalProgress.length > 0 ? (
            <div className="space-y-3.5">
              {forecastResult.goalProgress.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {goal.name}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {formatCurrency(goal.projectedAmount)} / {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold tabular-nums text-indigo-700 dark:text-indigo-400">
                        {goal.projectedProgress.toFixed(1)}%
                      </span>
                      <span
                        className={`block text-[11px] font-semibold ${
                          goal.onTrack
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {goal.onTrack ? t("forecast.goals.onTrack") || "No Prazo" : t("forecast.goals.behind") || "Atrasado"}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        goal.onTrack ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(3, goal.projectedProgress))}%` }}
                    />
                  </div>

                  {goal.estimatedCompletionMonth && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                      {t("forecast.goals.estimatedCompletion") || "Conclusão Estimada"}:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatMonth(goal.estimatedCompletionMonth)}
                      </strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
              {t("forecast.goals.noActive") || "Nenhuma meta ativa vinculada ao plano."}
            </p>
          )}
        </div>
      )}

      {/* ── Calendar View ───────────────────────────────────────────── */}
      {selectedView === "calendar" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {calendarData.map((m) => (
            <div
              key={m.month}
              className="surface-card p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatMonth(m.month)}
                  </h4>
                  <span
                    className={`text-xs font-bold tabular-nums ${getBalanceColor(
                      m.endingBalance
                    )}`}
                  >
                    {formatCurrency(m.endingBalance)}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("forecast.table.income")}:</span>
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{formatCurrency(m.totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("forecast.table.expenses")}:</span>
                    <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                      -{formatCurrency(m.totalExpenses)}
                    </span>
                  </div>
                  {m.totalGoalContributions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{t("forecast.table.goals")}:</span>
                      <span className="font-semibold tabular-nums text-indigo-700 dark:text-indigo-400">
                        -{formatCurrency(m.totalGoalContributions)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {t("forecast.table.netChange")}:
                </span>
                <span
                  className={`font-bold tabular-nums ${getBalanceColor(
                    m.netChange
                  )}`}
                >
                  {m.netChange >= 0 ? "+" : ""}
                  {formatCurrency(m.netChange)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reset Confirmation Modal ─────────────────────────────────── */}
      {showResetConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="surface-card w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("forecast.resetModal.title") || "Redefinir Configuração de Previsão?"}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {t("forecast.resetModal.content") || "Isso restaurará o horizonte para 12 meses e recalculará os fluxos a partir do saldo atual."}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowResetConfirmation(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                {t("common.cancel") || "Cancelar"}
              </button>
              <button
                onClick={handleResetAll}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                {t("common.save") || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

