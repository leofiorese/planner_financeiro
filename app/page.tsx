"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import {
  generateSuggestions,
  DEFAULT_SUGGESTION_CONFIG,
} from "@/utils/suggestionGenerator";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import IncomeVsExpensesChart from "@/components/charts/IncomeVsExpensesChart";
import GoalProgressChart from "@/components/charts/GoalProgressChart";
import ExpenseCategoryChart from "@/components/charts/ExpenseCategoryChart";
import AskAIButton from "@/components/AskAIButton";
import { generateForecast } from "@/utils/forecastCalculator";
import { formatDateDDMMYYYY } from "@/utils/dateFormatting";
import { GoalCategoryIcon, PriorityBadge, ExpenseCategoryIcon } from "@/components/CategoryIcon";

export default function DashboardPage() {
  const state = useFinancialState();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  // Calculate annual income and expenses using forecast engine
  const calculateAnnualFinancials = () => {
    if (!state.userPlan?.id) {
      return {
        annualIncome: 0,
        annualExpenses: 0,
        annualNet: 0,
      };
    }

    const startDate = new Date();
    const forecastResult = generateForecast(state.userPlan, {
      months: 12,
      startDate,
      includeGoalContributions: false,
      conservativeMode: false,
    });

    return {
      annualIncome: forecastResult.summary.totalIncome,
      annualExpenses: forecastResult.summary.totalExpenses,
      annualNet:
        forecastResult.summary.totalIncome - forecastResult.summary.totalExpenses,
    };
  };

  const { annualIncome, annualExpenses, annualNet } = calculateAnnualFinancials();
  const activeGoals = state.userPlan?.goals?.filter((goal) => goal.isActive) || [];
  const savingsRate = annualIncome > 0 ? (annualNet / annualIncome) * 100 : 0;

  // Upcoming goals (next 6 months)
  const upcomingGoals = activeGoals
    .filter((goal) => {
      const targetDate = new Date(goal.targetDate);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setDate(1);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      sixMonthsFromNow.setDate(0);
      return targetDate <= sixMonthsFromNow;
    })
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    )
    .slice(0, 4);

  // Top expense months formatted in Portuguese
  const topExpenseMonths = useMemo(() => {
    if (!state.userPlan?.id) return [];
    const forecastResult = generateForecast(state.userPlan, {
      months: 12,
      startDate: new Date(),
      includeGoalContributions: false,
      conservativeMode: false,
    });

    return forecastResult.monthlyForecasts
      .map((forecast) => {
        const date = new Date(forecast.month + "-01T12:00:00");
        const rawMonth = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
        return {
          month: forecast.month,
          amount: forecast.expenses,
          monthName,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [state.userPlan]);

  // Recent Transactions & Outflows (combining latest expenses & income)
  const recentTransactions = useMemo(() => {
    if (!state.userPlan) return [];
    const items: Array<{
      id: string;
      name: string;
      amount: number;
      type: "income" | "expense";
      date: string;
      category?: string;
      isRecurring?: boolean;
    }> = [];

    (state.userPlan.expenses || []).slice(0, 15).forEach((exp) => {
      items.push({
        id: `exp-${exp.id}`,
        name: exp.name,
        amount: exp.amount,
        type: "expense",
        date: exp.dueDate || exp.createdAt,
        category: exp.category,
        isRecurring: exp.recurring,
      });
    });

    (state.userPlan.income || []).slice(0, 10).forEach((inc) => {
      items.push({
        id: `inc-${inc.id}`,
        name: inc.name,
        amount: inc.amount,
        type: "income",
        date: inc.startDate || inc.createdAt,
        category: "Renda",
        isRecurring: inc.frequency !== undefined,
      });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [state.userPlan]);

  const allSuggestions = useMemo(() => {
    if (!state.userPlan) return [];
    return generateSuggestions(state.userPlan, DEFAULT_SUGGESTION_CONFIG);
  }, [state.userPlan]);

  const isFirstTimeUser =
    !state.userPlan?.id ||
    (state.userPlan.income.length === 0 &&
      state.userPlan.expenses.length === 0 &&
      state.userPlan.goals.length === 0);

  const hasMinimalData =
    (state.userPlan?.income.length === 0) || (state.userPlan?.expenses.length === 0);

  if (state.loading?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>{t("dashboard.title")}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
              Plano Ativo
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AskAIButton />
          <Link
            href="/forecast"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Simular 12 Meses</span>
          </Link>
        </div>
      </div>

      {/* ── First-Time User Experience ──────────────────────────────── */}
      {isFirstTimeUser && (
        <div className="surface-card p-6 sm:p-8 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30">
          <div className="max-w-xl mx-auto text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("welcome.title")}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t("welcome.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Step 1: Income */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {t("welcome.income.title")}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {t("welcome.income.desc")}
                </p>
              </div>
              <Link
                href="/income"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                <span>{t("welcome.income.button")}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Step 2: Expenses */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {t("welcome.expense.title")}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {t("welcome.expense.desc")}
                </p>
              </div>
              <Link
                href="/expenses"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                <span>{t("welcome.expense.button")}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Step 3: Goals */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {t("welcome.goal.title")}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {t("welcome.goal.desc")}
                </p>
              </div>
              <Link
                href="/goals"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                <span>{t("welcome.goal.button")}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Minimal Data Warning ────────────────────────────────────── */}
      {!isFirstTimeUser && hasMinimalData && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {t("dashboard.completeProfile.title")}
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {t("dashboard.completeProfile.desc")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {state.userPlan.income.length === 0 && (
              <Link
                href="/income"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-200/80 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors border border-amber-300 dark:border-amber-700"
              >
                {t("dashboard.completeProfile.addIncome")}
              </Link>
            )}
            {state.userPlan.expenses.length === 0 && (
              <Link
                href="/expenses"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-200/80 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 hover:bg-amber-300 dark:hover:bg-amber-800 transition-colors border border-amber-300 dark:border-amber-700"
              >
                {t("dashboard.completeProfile.addExpense")}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content ──────────────────────────────────── */}
      {!isFirstTimeUser && (
        <>
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Annual Projected Income */}
            <div className="surface-card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("dashboard.annualIncome")}
                </span>
                <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(annualIncome)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                ~{formatCurrency(annualIncome / 12)} / mês
              </div>
            </div>

            {/* 2. Annual Projected Expenses */}
            <div className="surface-card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("dashboard.annualExpenses")}
                </span>
                <span className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </span>
              </div>
              <div className="text-lg sm:text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(annualExpenses)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                ~{formatCurrency(annualExpenses / 12)} / mês
              </div>
            </div>

            {/* 3. Annual Projected Net Cashflow */}
            <div className="surface-card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("dashboard.annualNet")}
                </span>
                <span
                  className={`p-1 rounded-md border ${
                    annualNet >= 0
                      ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60"
                      : "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={
                        annualNet >= 0
                          ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      }
                    />
                  </svg>
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-bold tabular-nums ${
                  annualNet >= 0
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(annualNet)}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Taxa de Poupança:{" "}
                <strong className="tabular-nums text-slate-800 dark:text-slate-200 font-semibold">
                  {savingsRate.toFixed(1)}%
                </strong>
              </div>
            </div>

            {/* 4. Monthly Net Surplus/Deficit */}
            <div className="surface-card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("dashboard.monthlyFlow")}
                </span>
                <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-bold tabular-nums ${
                  annualNet / 12 >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(annualNet / 12)}
              </div>
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1 truncate">
                {annualNet / 12 >= 0
                  ? t("dashboard.flow.positive")
                  : annualNet / 12 >= -500
                  ? t("dashboard.flow.tight")
                  : t("dashboard.flow.negative")}
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Toolbar */}
          <div className="surface-card p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pl-1 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Atalhos Rápidos:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/income"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 transition-colors border border-emerald-300/80 dark:border-emerald-800/80 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nova Renda</span>
              </Link>

              <Link
                href="/expenses"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 transition-colors border border-rose-300/80 dark:border-rose-800/80 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
                <span>Nova Despesa</span>
              </Link>

              <Link
                href="/car"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 transition-colors border border-slate-300/80 dark:border-slate-700/80 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M3 13a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2z" />
                </svg>
                <span>Veículo</span>
              </Link>

              <Link
                href="/wishlist"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 transition-colors border border-slate-300/80 dark:border-slate-700/80 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Desejos</span>
              </Link>

              <Link
                href="/goals"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100/90 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 transition-colors border border-indigo-300/80 dark:border-indigo-800/80 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <span>Metas</span>
              </Link>
            </div>
          </div>

          {/* Primary Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <IncomeVsExpensesChart userPlan={state.userPlan} />
            <ExpenseCategoryChart userPlan={state.userPlan} />
          </div>

          {/* Outflow Analysis & Upcoming Milestones Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Outflow Months */}
            <div className="surface-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Meses com Maior Volume de Despesas (12M)
                </h3>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Motor de Projeção
                </span>
              </div>

              {topExpenseMonths.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const maxAmount = Math.max(...topExpenseMonths.map((m) => m.amount), 1);
                    return topExpenseMonths.map((monthData, idx) => {
                      const barWidth = (monthData.amount / maxAmount) * 100;
                      return (
                        <div key={monthData.month} className="space-y-1.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              #{idx + 1} {monthData.monthName}
                            </span>
                            <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                              {formatCurrency(monthData.amount)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(4, barWidth)}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400 py-6 text-center">
                  Nenhum registro de despesa para analisar.
                </p>
              )}
            </div>

            {/* Upcoming Goals */}
            <div className="surface-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Metas Próximas (Próximos 6 Meses)
                </h3>
                <Link
                  href="/goals"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                >
                  Ver todas ({activeGoals.length})
                </Link>
              </div>

              {upcomingGoals.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingGoals.map((goal) => {
                    const daysUntilTarget = Math.ceil(
                      (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    const progress =
                      (goal.currentAmount / Math.max(1, goal.targetAmount)) * 100;
                    const isOverdue = daysUntilTarget < 0;
                    const isUrgent = daysUntilTarget <= 30 && daysUntilTarget >= 0;

                    return (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
                              <GoalCategoryIcon category={goal.category} className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {goal.name}
                            </span>
                            <PriorityBadge priority={goal.priority} />
                          </div>
                          <span
                            className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 border ${
                              isOverdue
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                : isUrgent
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isOverdue ? `${Math.abs(daysUntilTarget)}d atrasado` : `${daysUntilTarget}d restantes`}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-slate-600 dark:text-slate-400 tabular-nums">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                            <span className="ml-2 font-medium text-slate-500 dark:text-slate-400">
                              (Prazo: {formatDateDDMMYYYY(goal.targetDate)})
                            </span>
                          </span>
                          <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {progress.toFixed(0)}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-600 dark:text-slate-400">
                  Nenhuma meta prevista para os próximos 6 meses.
                  <div className="mt-2">
                    <Link
                      href="/goals"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      Criar um objetivo financeiro
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Financial Outflows & Inflows */}
          {recentTransactions.length > 0 && (
            <div className="surface-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Lançamentos Recentes (Despesas & Rendas)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Link
                    href="/expenses"
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Ver despesas →
                  </Link>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <Link
                    href="/income"
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Ver rendas →
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          tx.type === "income"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        ) : tx.category ? (
                          <ExpenseCategoryIcon category={tx.category} className="w-4 h-4" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {tx.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          <span>{formatDateDDMMYYYY(tx.date)}</span>
                          {tx.isRecurring && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Recorrente
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs sm:text-sm font-bold tabular-nums ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"} {formatCurrency(tx.amount)}
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                        {tx.type === "income" ? "Renda" : tx.category || "Despesa"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goal Progress Detailed Chart */}
          <GoalProgressChart userPlan={state.userPlan} />

          {/* Smart Financial Insights & Actionable Suggestions */}
          {allSuggestions.length > 0 && (
            <div className="surface-card p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Insights & Otimizações Financeiras Inteligentes
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Inteligência automatizada gerada a partir do seu fluxo de caixa e metas
                  </p>
                </div>
                <Link
                  href="/goal-plan"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                >
                  Ver matriz completa de planejamento →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {allSuggestions.slice(0, 6).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {suggestion.category}
                        </span>
                        <PriorityBadge priority={suggestion.priority} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-1">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 line-clamp-3">
                        {suggestion.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                        Impacto Estimado:
                      </span>
                      <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Math.abs(suggestion.estimatedImpact))}/mês
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
