"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import { Frequency, ExpenseCategory, GoalCategory, Priority } from "@/types";
import {
  generateSuggestions,
  DEFAULT_SUGGESTION_CONFIG,
} from "@/utils/suggestionGenerator";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatDateWithTranslations } from "@/utils/dateFormatting";
import IncomeVsExpensesChart from "@/components/charts/IncomeVsExpensesChart";
import GoalProgressChart from "@/components/charts/GoalProgressChart";
import ExpenseCategoryChart from "@/components/charts/ExpenseCategoryChart";
import AskAIButton from "@/components/AskAIButton";
import { generateForecast } from "@/utils/forecastCalculator";

export default function DashboardPage() {
  const state = useFinancialState();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  // Calculate financial metrics
  const calculateMonthlyAmount = (amount: number, frequency: Frequency) => {
    switch (frequency) {
      case Frequency.DAILY:
        return amount * 30.44;
      case Frequency.WEEKLY:
        return amount * 4.33;
      case Frequency.BIWEEKLY:
        return amount * 2.17;
      case Frequency.MONTHLY:
        return amount;
      case Frequency.QUARTERLY:
        return amount / 3;
      case Frequency.YEARLY:
        return amount / 12;
      case Frequency.ONE_TIME:
        return 0;
      default:
        return amount;
    }
  };

  // Calculate annual income and expenses using forecast
  const calculateAnnualFinancials = () => {
    if (!state.userPlan.id) {
      return {
        annualIncome: 0,
        annualExpenses: 0,
        annualNet: 0,
      };
    }

    // Use forecast starting from current month for 12 months
    const startDate = new Date();

    const forecastResult = generateForecast(state.userPlan, {
      months: 12,
      startDate,
      includeGoalContributions: false, // Don't include goal contributions in totals
      conservativeMode: false,
    });

    return {
      annualIncome: forecastResult.summary.totalIncome,
      annualExpenses: forecastResult.summary.totalExpenses,
      annualNet:
        forecastResult.summary.totalIncome -
        forecastResult.summary.totalExpenses,
    };
  };

  const { annualIncome, annualExpenses, annualNet } =
    calculateAnnualFinancials();

  const activeGoals = state.userPlan.goals.filter((goal) => goal.isActive);

  const savingsRate = annualIncome > 0 ? (annualNet / annualIncome) * 100 : 0;

  // Get category breakdowns
  const expensesByCategory = state.userPlan.expenses
    .filter((expense) => expense.isActive)
    .reduce((acc, expense) => {
      const monthlyAmount = calculateMonthlyAmount(
        expense.amount,
        expense.frequency || Frequency.MONTHLY
      );
      acc[expense.category] = (acc[expense.category] || 0) + monthlyAmount;
      return acc;
    }, {} as Record<ExpenseCategory, number>);

  // Calculate total monthly expenses
  const totalMonthlyExpenses = Object.values(expensesByCategory).reduce(
    (total, amount) => total + amount,
    0
  );

  // Get top expense categories
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Get upcoming goals (next 6 months)
  const upcomingGoals = activeGoals
    .filter((goal) => {
      const targetDate = new Date(goal.targetDate);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setDate(1); // Set to 1st to avoid overflow
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      sixMonthsFromNow.setDate(0); // Set to last day of the calculated month
      return targetDate <= sixMonthsFromNow;
    })
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    )
    .slice(0, 3);

  // Comprehensive suggestions for dashboard
  const allSuggestions = useMemo(() => {
    if (!state.userPlan) return [];
    return generateSuggestions(state.userPlan, DEFAULT_SUGGESTION_CONFIG);
  }, [state.userPlan]);

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return "🚨";
      case Priority.HIGH:
        return "⚠️";
      case Priority.MEDIUM:
        return "📋";
      case Priority.LOW:
        return "💡";
      default:
        return "📝";
    }
  };

  const getSuggestionCategoryIcon = (category: string) => {
    switch (category) {
      case "income":
        return "💰";
      case "expense":
        return "💳";
      case "goal":
        return "🎯";
      case "general":
        return "📊";
      default:
        return "💡";
    }
  };

  const getSuggestionCategoryColor = (category: string) => {
    switch (category) {
      case "income":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "expense":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "goal":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "general":
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const getSuggestionPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case Priority.HIGH:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case Priority.MEDIUM:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case Priority.LOW:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // Calculate Top Expense Months using forecast data
  const calculateTopExpenseMonths = () => {
    if (!state.userPlan.id) {
      return [];
    }

    // Generate forecast for 12 months to get expense data
    const forecastResult = generateForecast(state.userPlan, {
      months: 12,
      startDate: new Date(),
      includeGoalContributions: false,
      conservativeMode: false,
    });

    // Extract monthly expense data and sort by expense amount
    const monthlyExpenses = forecastResult.monthlyForecasts
      .map((forecast) => ({
        month: forecast.month,
        amount: forecast.expenses,
        monthName: new Date(forecast.month + "-01T12:00:00").toLocaleDateString(
          "en-US",
          {
            month: "long",
            year: "numeric",
          }
        ),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Show top 5 months

    return monthlyExpenses;
  };

  const topExpenseMonths = calculateTopExpenseMonths();

  const formatDate = (dateString: string) => {
    return formatDateWithTranslations(dateString, t, {
      includeYear: true,
      shortMonth: true,
    });
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    const icons = {
      [ExpenseCategory.HOUSING]: "🏠",
      [ExpenseCategory.TRANSPORTATION]: "🚗",
      [ExpenseCategory.FOOD]: "🍽️",
      [ExpenseCategory.UTILITIES]: "💡",
      [ExpenseCategory.INSURANCE]: "🛡️",
      [ExpenseCategory.HEALTHCARE]: "🏥",
      [ExpenseCategory.ENTERTAINMENT]: "🎬",
      [ExpenseCategory.PERSONAL_CARE]: "💅",
      [ExpenseCategory.EDUCATION]: "📚",
      [ExpenseCategory.DEBT_PAYMENTS]: "💳",
      [ExpenseCategory.SAVINGS]: "💰",
      [ExpenseCategory.TRAVEL]: "✈️",
      [ExpenseCategory.SHOPPING]: "🛍️",
      [ExpenseCategory.KIDS]: "👶",
      [ExpenseCategory.MISCELLANEOUS]: "📦",
      [ExpenseCategory.TAXES]:         "🧾",
    };
    return icons[category] || "📦";
  };

  const getGoalIcon = (category: GoalCategory) => {
    const icons = {
      [GoalCategory.EMERGENCY_FUND]: "🚨",
      [GoalCategory.RETIREMENT]: "🏖️",
      [GoalCategory.EDUCATION]: "🎓",
      [GoalCategory.HOME_PURCHASE]: "🏡",
      [GoalCategory.VACATION]: "✈️",
      [GoalCategory.DEBT_PAYOFF]: "💳",
      [GoalCategory.MAJOR_PURCHASE]: "🛒",
      [GoalCategory.INVESTMENT]: "📈",
      [GoalCategory.OTHER]: "🎯",
    };
    return icons[category] || "🎯";
  };

  // Check if user is a first-time user (no income, expenses, or goals)
  const isFirstTimeUser =
    !state.userPlan.id ||
    (state.userPlan.income.length === 0 &&
      state.userPlan.expenses.length === 0 &&
      state.userPlan.goals.length === 0);

  const hasMinimalData =
    state.userPlan.income.length === 0 || state.userPlan.expenses.length === 0;

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
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            {t("dashboard.title")}
          </h1>
          <AskAIButton />
        </div>
        <p className="mt-2 text-xl text-gray-600 dark:text-gray-300">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Welcome Message for First-time Users */}
      {isFirstTimeUser && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎯</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t("welcome.title")}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {t("welcome.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Step 1: Income */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("welcome.income.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {t("welcome.income.desc")}
              </p>
              <Link
                href="/income"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {t("welcome.income.button")}
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            {/* Step 2: Expenses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("welcome.expense.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {t("welcome.expense.desc")}
              </p>
              <Link
                href="/expenses"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                {t("welcome.expense.button")}
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>

            {/* Step 3: Goals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("welcome.goal.title")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {t("welcome.goal.desc")}
              </p>
              <Link
                href="/goals"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t("welcome.goal.button")}
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("welcome.next.title")}
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                  <li className="flex items-center space-x-2">
                    <span className="text-green-600 dark:text-green-400">
                      ✅
                    </span>
                    <span>
                      {t("welcome.next.1")}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-600 dark:text-green-400">
                      ✅
                    </span>
                    <span>
                      {t("welcome.next.2")}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-600 dark:text-green-400">
                      ✅
                    </span>
                    <span>
                      {t("welcome.next.3")}
                    </span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-green-600 dark:text-green-400">
                      ✅
                    </span>
                    <span>
                      {t("welcome.next.4")}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Data Helper */}
      {!isFirstTimeUser && hasMinimalData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                {t("dashboard.completeProfile.title")}
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                {t("dashboard.completeProfile.desc")}
              </p>
              <div className="flex space-x-3 mt-3">
                {state.userPlan.income.length === 0 && (
                  <Link
                    href="/income"
                    className="text-yellow-600 dark:text-yellow-400 hover:underline text-sm font-medium"
                  >
                    {t("dashboard.completeProfile.addIncome")}
                  </Link>
                )}
                {state.userPlan.expenses.length === 0 && (
                  <Link
                    href="/expenses"
                    className="text-yellow-600 dark:text-yellow-400 hover:underline text-sm font-medium"
                  >
                    {t("dashboard.completeProfile.addExpense")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Content - Only show when user has data */}
      {!isFirstTimeUser && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("dashboard.annualIncome")}
                    </p>
                    <div className="group relative">
                      <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                        ℹ️
                      </span>
                      <div className="invisible group-hover:visible absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg -translate-x-1/2 left-1/2">
                        {t("dashboard.tooltip.annualIncome")}
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(annualIncome)}
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </div>
              {annualIncome === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t("dashboard.startIncomeHelper")}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("dashboard.annualExpenses")}
                    </p>
                    <div className="group relative">
                      <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                        ℹ️
                      </span>
                      <div className="invisible group-hover:visible absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg -translate-x-1/2 left-1/2">
                        {t("dashboard.tooltip.annualExpenses")}
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(annualExpenses)}
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
                      d="M20 12H4"
                    />
                  </svg>
                </div>
              </div>
              {annualExpenses === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t("dashboard.startExpenseHelper")}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("dashboard.annualNet")}
                    </p>
                    <div className="group relative">
                      <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                        ℹ️
                      </span>
                      <div className="invisible group-hover:visible absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg -translate-x-1/2 left-1/2">
                        {t("dashboard.tooltip.annualNet")}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`text-2xl font-bold ${annualNet >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {formatCurrency(annualNet)}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${annualNet >= 0
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-red-100 dark:bg-red-900"
                    }`}
                >
                  <svg
                    className={`w-6 h-6 ${annualNet >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        annualNet >= 0
                          ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      }
                    />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("dashboard.savingsRate")}: {savingsRate.toFixed(1)}%
                </p>
                {savingsRate > 0 && savingsRate < 20 && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {t("dashboard.savingsTarget")}
                  </span>
                )}
              </div>
            </div>

            {/* Monthly Cash Flow */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t("dashboard.monthlyFlow")}
                    </p>
                    <div className="group relative">
                      <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                        ℹ️
                      </span>
                      <div className="invisible group-hover:visible absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded shadow-lg -translate-x-1/2 left-1/2">
                        {t("dashboard.tooltip.monthlyFlow")}
                      </div>
                    </div>
                  </div>
                  <p
                    className={`text-2xl font-bold ${annualNet / 12 >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {formatCurrency(annualNet / 12)}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${annualNet / 12 >= 0
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-red-100 dark:bg-red-900"
                    }`}
                >
                  <svg
                    className={`w-6 h-6 ${annualNet / 12 >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        annualNet / 12 >= 0
                          ? "M7 11l5-5m0 0l5 5m-5-5v12"
                          : "M17 13l-5 5m0 0l-5-5m5 5V6"
                      }
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {annualNet / 12 >= 0
                  ? t("dashboard.flow.positive")
                  : annualNet / 12 >= -500
                    ? t("dashboard.flow.tight")
                    : t("dashboard.flow.negative")}
              </p>
            </div>
          </div>

          {/* Quick Actions - Compact */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t("dashboard.quickActions")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                href="/income"
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400"
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
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("dashboard.startIncome")}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("income.title")}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/expenses"
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-600 dark:text-red-400"
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
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("dashboard.startExpense")}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("expenses.title")}
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/goals"
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
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
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Set Goal
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Create goals
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Advanced Charts Section */}
          <div className="space-y-8">
            {/* Income vs Expenses Trend Chart */}
            <IncomeVsExpensesChart
              userPlan={state.userPlan}
              className="shadow-sm"
            />

            {/* Expense Category Chart */}
            <ExpenseCategoryChart
              userPlan={state.userPlan}
              className="shadow-sm"
            />
          </div>

          {/* Charts and Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Top Expense Categories
              </h3>
              {topExpenseCategories.length > 0 ? (
                <div className="space-y-4">
                  {topExpenseCategories.map(([category, amount]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getCategoryIcon(category as ExpenseCategory)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {category.charAt(0).toUpperCase() +
                              category.slice(1).toLowerCase().replace("_", " ")}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatCurrency(amount)} per month
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {((amount / totalMonthlyExpenses) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No expenses tracked yet
                  </p>
                  <Link
                    href="/expenses"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add your first expense
                  </Link>
                </div>
              )}
            </div>

            {/* Top Expense Months */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Top Expense Months
              </h3>
              {topExpenseMonths.length > 0 ? (
                <div className="space-y-4">
                  {(() => {
                    const maxAmount = Math.max(
                      ...topExpenseMonths.map((m) => m.amount)
                    );
                    return topExpenseMonths.map((monthData, index) => {
                      const barWidth = (monthData.amount / maxAmount) * 100;
                      const isHighest = monthData.amount === maxAmount;

                      return (
                        <div key={monthData.month} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHighest
                                  ? "bg-red-200 dark:bg-red-800"
                                  : "bg-red-100 dark:bg-red-900"
                                  }`}
                              >
                                <span
                                  className={`text-sm font-bold ${isHighest
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-red-600 dark:text-red-400"
                                    }`}
                                >
                                  #{index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {monthData.monthName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {monthData.month}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-lg font-bold ${isHighest
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-red-600 dark:text-red-400"
                                  }`}
                              >
                                {formatCurrency(monthData.amount)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {((monthData.amount / maxAmount) * 100).toFixed(
                                  0
                                )}
                                % of highest
                              </p>
                            </div>
                          </div>

                          {/* Bar Chart */}
                          <div className="relative">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${isHighest
                                  ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500"
                                  : index === 1
                                    ? "bg-gradient-to-r from-red-400 to-red-500 dark:from-red-500 dark:to-red-600"
                                    : "bg-gradient-to-r from-red-300 to-red-400 dark:from-red-600 dark:to-red-700"
                                  }`}
                                style={{
                                  width: `${barWidth}%`,
                                  minWidth: barWidth > 5 ? "auto" : "8px",
                                }}
                              />
                            </div>

                            {/* Bar Chart Labels */}
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                0
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatCurrency(maxAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No expense data available
                  </p>
                  <Link
                    href="/expenses"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add expenses to see analysis
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Comprehensive Suggestions */}
          {allSuggestions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    💡 Smart Financial Suggestions
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Personalized recommendations to improve your financial
                    health
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {allSuggestions.length}
                    </span>{" "}
                    suggestions
                  </div>
                  <Link
                    href="/goal-plan"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    View All Details
                  </Link>
                </div>
              </div>

              {/* Suggestions Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        High Priority
                      </p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {
                          allSuggestions.filter(
                            (s) =>
                              s.priority === Priority.HIGH ||
                              s.priority === Priority.CRITICAL
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <span className="text-xl">📈</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Potential Impact
                      </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(
                          allSuggestions.reduce(
                            (sum, s) => sum + Math.abs(s.estimatedImpact),
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <span className="text-xl">✅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Actionable
                      </p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {allSuggestions.filter((s) => s.actionable).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Suggestions List */}
              <div className="space-y-4">
                {allSuggestions.slice(0, 6).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${getSuggestionCategoryColor(
                      suggestion.category
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-xl shadow-sm">
                            {getSuggestionCategoryIcon(suggestion.category)}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">
                              {suggestion.title}
                            </h4>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSuggestionPriorityColor(
                                suggestion.priority
                              )}`}
                            >
                              <span className="mr-1">
                                {getPriorityIcon(suggestion.priority)}
                              </span>
                              {suggestion.priority.toUpperCase()}
                            </span>
                            {suggestion.actionable && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                ✅ Actionable
                              </span>
                            )}
                          </div>

                          <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                            {suggestion.description}
                          </p>

                          <div className="flex items-center space-x-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Category:</span>{" "}
                              {suggestion.category.charAt(0).toUpperCase() +
                                suggestion.category.slice(1)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Impact:</span>{" "}
                              {formatCurrency(
                                Math.abs(suggestion.estimatedImpact)
                              )}
                              /month
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {allSuggestions.length > 6 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/goal-plan"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View All {allSuggestions.length} Suggestions
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Goal Progress Chart */}
          <GoalProgressChart userPlan={state.userPlan} className="shadow-sm" />

          {/* Upcoming Goals */}
          {upcomingGoals.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upcoming Goals (Next 6 Months)
                </h3>
                <Link
                  href="/goals"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  View All Goals
                </Link>
              </div>
              <div className="space-y-4">
                {upcomingGoals.map((goal) => {
                  const daysUntilTarget = Math.ceil(
                    (new Date(goal.targetDate).getTime() -
                      new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                  );
                  const progress =
                    (goal.currentAmount / goal.targetAmount) * 100;
                  const isOverdue = daysUntilTarget < 0;
                  const isUrgent =
                    daysUntilTarget <= 30 && daysUntilTarget >= 0;

                  return (
                    <div
                      key={goal.id}
                      className={`p-4 border rounded-lg ${isOverdue
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : isUrgent
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverdue
                              ? "bg-red-100 dark:bg-red-900"
                              : isUrgent
                                ? "bg-yellow-100 dark:bg-yellow-900"
                                : "bg-blue-100 dark:bg-blue-900"
                              }`}
                          >
                            <span className="text-xl">
                              {getGoalIcon(goal.category)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {goal.name}
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded ${goal.priority === Priority.CRITICAL
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : goal.priority === Priority.HIGH
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                  }`}
                              >
                                {goal.priority.charAt(0).toUpperCase() +
                                  goal.priority.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatCurrency(goal.currentAmount)} of{" "}
                              {formatCurrency(goal.targetAmount)} •{" "}
                              {formatDate(goal.targetDate)}
                            </p>
                            {/* Progress Bar */}
                            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${progress >= 100
                                  ? "bg-green-500 dark:bg-green-400"
                                  : isOverdue
                                    ? "bg-red-500 dark:bg-red-400"
                                    : isUrgent
                                      ? "bg-yellow-500 dark:bg-yellow-400"
                                      : "bg-blue-500 dark:bg-blue-400"
                                  }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {isOverdue && (
                              <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
                                Overdue
                              </span>
                            )}
                            {isUrgent && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm font-medium mt-1 ${isOverdue
                              ? "text-red-600 dark:text-red-400"
                              : isUrgent
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-gray-900 dark:text-gray-100"
                              }`}
                          >
                            {isOverdue
                              ? `${Math.abs(daysUntilTarget)} days overdue`
                              : `${daysUntilTarget} days left`}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {progress.toFixed(1)}% complete
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
