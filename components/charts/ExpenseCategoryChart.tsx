/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { UserPlan, ExpenseCategory, Frequency } from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";

interface ExpenseCategoryChartProps {
  userPlan: UserPlan;
  className?: string;
}

interface CategoryData {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  count: number;
  expenses: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: Frequency;
    monthlyAmount: number;
  }>;
  color: string;
}

const CATEGORY_COLORS = {
  [ExpenseCategory.HOUSING]: "#EF4444",
  [ExpenseCategory.TRANSPORTATION]: "#F97316",
  [ExpenseCategory.FOOD]: "#EAB308",
  [ExpenseCategory.UTILITIES]: "#22C55E",
  [ExpenseCategory.INSURANCE]: "#06B6D4",
  [ExpenseCategory.HEALTHCARE]: "#3B82F6",
  [ExpenseCategory.ENTERTAINMENT]: "#8B5CF6",
  [ExpenseCategory.PERSONAL_CARE]: "#EC4899",
  [ExpenseCategory.EDUCATION]: "#14B8A6",
  [ExpenseCategory.DEBT_PAYMENTS]: "#F59E0B",
  [ExpenseCategory.SAVINGS]: "#10B981",
  [ExpenseCategory.TRAVEL]: "#84CC16",
  [ExpenseCategory.SHOPPING]: "#F472B6",
  [ExpenseCategory.KIDS]: "#A78BFA",
  [ExpenseCategory.MISCELLANEOUS]: "#6B7280",
};

const CATEGORY_ICONS = {
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
};

export default function ExpenseCategoryChart({
  userPlan,
  className = "",
}: ExpenseCategoryChartProps) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"pie" | "donut" | "bar" | "treemap">(
    "donut"
  );
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Calculate monthly amount based on frequency
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
        return amount; // For one-time, show full amount
      default:
        return amount;
    }
  };

  // Process expense data by category
  const categoryData = useMemo(() => {
    if (!userPlan?.expenses) return [];

    const expenses = showInactive
      ? userPlan.expenses
      : userPlan.expenses.filter((expense) => expense.isActive);

    const categoryMap = new Map<ExpenseCategory, CategoryData>();

    expenses.forEach((expense) => {
      const monthlyAmount = calculateMonthlyAmount(
        expense.amount,
        expense.frequency || Frequency.MONTHLY
      );

      if (!categoryMap.has(expense.category)) {
        categoryMap.set(expense.category, {
          category: expense.category,
          amount: 0,
          percentage: 0,
          count: 0,
          expenses: [],
          color: CATEGORY_COLORS[expense.category],
        });
      }

      const categoryData = categoryMap.get(expense.category)!;
      categoryData.amount += monthlyAmount;
      categoryData.count += 1;
      categoryData.expenses.push({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency || Frequency.MONTHLY,
        monthlyAmount,
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce(
      (sum, cat) => sum + cat.amount,
      0
    );

    // Calculate percentages and sort by amount
    const result = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return result;
  }, [userPlan, showInactive]);

  const formatCategoryName = (category: ExpenseCategory) => {
    return (
      category.charAt(0).toUpperCase() +
      category.slice(1).toLowerCase().replace("_", " ")
    );
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const PieView = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="amount"
            onClick={(data) =>
              setSelectedCategory(
                selectedCategory === data.category ? null : data.category
              )
            }
          >
            {categoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={selectedCategory === entry.category ? "#000" : "none"}
                strokeWidth={selectedCategory === entry.category ? 2 : 0}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const DonutView = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            innerRadius={60}
            fill="#8884d8"
            dataKey="amount"
            onClick={(data) =>
              setSelectedCategory(
                selectedCategory === data.category ? null : data.category
              )
            }
          >
            {categoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={selectedCategory === entry.category ? "#000" : "none"}
                strokeWidth={selectedCategory === entry.category ? 2 : 0}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const BarView = () => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={categoryData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="category"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 10 }}
            tickFormatter={formatCategoryName}
          />
          <YAxis
            tickFormatter={(value) => formatCurrency(value)}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={<CustomTooltip />}
            labelFormatter={(value: string) => value}
            cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
            labelStyle={{ color: "inherit" }}
            itemStyle={{ color: "inherit" }}
          />
          <Bar
            dataKey="amount"
            onClick={(data: any) => {
              const category = data?.payload?.category;
              if (category) {
                setSelectedCategory(
                  selectedCategory === category ? null : category
                );
              }
            }}
            style={{ cursor: "pointer" }}
          >
            {categoryData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke={selectedCategory === entry.category ? "#000" : "none"}
                strokeWidth={selectedCategory === entry.category ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const TreemapView = () => {
    const treemapData = categoryData.map((cat) => ({
      name: formatCategoryName(cat.category),
      value: cat.amount,
      fill: cat.color,
    }));

    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
          >
            <Tooltip
              formatter={(value) => [formatCurrency(value as number), "Amount"]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            🥧 {t("charts.expenses.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("charts.expenses.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="showInactive"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {t("charts.expenses.includeInactive")}
            </label>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("pie")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "pie"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >

              🥧 {t("charts.expenses.view.pie")}
            </button>
            <button
              onClick={() => setViewMode("donut")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "donut"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              🍩 {t("charts.expenses.view.donut")}
            </button>
            <button
              onClick={() => setViewMode("bar")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "bar"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              📊 {t("charts.expenses.view.bar")}
            </button>
            <button
              onClick={() => setViewMode("treemap")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === "treemap"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
            >
              🗂️ {t("charts.expenses.view.treemap")}
            </button>
          </div>
        </div>
      </div>

      {categoryData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              {viewMode === "pie" && <PieView />}
              {viewMode === "donut" && <DonutView />}
              {viewMode === "bar" && <BarView />}
              {viewMode === "treemap" && <TreemapView />}
            </div>

            {/* Category Legend & Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {t("charts.expenses.categories")} ({categoryData.length})
              </h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {categoryData.map((cat) => (
                  <div
                    key={cat.category}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedCategory === cat.category
                      ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700"
                      : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat.category ? null : cat.category
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {CATEGORY_ICONS[cat.category]}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCategoryName(cat.category)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {cat.count} {t("charts.expenses.count")}
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(cat.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown for Selected Category */}
          {selectedCategory && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">
                  {CATEGORY_ICONS[selectedCategory]}
                </span>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatCategoryName(selectedCategory)} {t("charts.expenses.details")}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryData
                  .find((cat) => cat.category === selectedCategory)
                  ?.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {expense.name}
                        </h5>
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                          {expense.frequency}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("charts.expenses.original")}:
                          </span>
                          <span>{formatCurrency(expense.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("charts.expenses.monthly")}:
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(expense.monthlyAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(
                  categoryData.reduce((sum, cat) => sum + cat.amount, 0)
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.expenses.totalMonthly")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {categoryData.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.expenses.categories")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {categoryData.reduce((sum, cat) => sum + cat.count, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.expenses.totalExpenses")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(
                  categoryData.reduce((sum, cat) => sum + cat.amount, 0) /
                  Math.max(1, categoryData.length)
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("charts.expenses.avgPerCategory")}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💸</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("charts.expenses.noData.title")}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {t("charts.expenses.noData.desc")}
          </p>
        </div>
      )}

      {/* Chart Instructions */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {t("charts.expenses.help")}
      </div>
    </div>
  );
}
