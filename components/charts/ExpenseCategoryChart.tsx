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
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";

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

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.HOUSING]: "#ef4444",
  [ExpenseCategory.TRANSPORTATION]: "#f97316",
  [ExpenseCategory.FOOD]: "#f59e0b",
  [ExpenseCategory.UTILITIES]: "#10b981",
  [ExpenseCategory.INSURANCE]: "#06b6d4",
  [ExpenseCategory.HEALTHCARE]: "#3b82f6",
  [ExpenseCategory.ENTERTAINMENT]: "#8b5cf6",
  [ExpenseCategory.PERSONAL_CARE]: "#ec4899",
  [ExpenseCategory.EDUCATION]: "#14b8a6",
  [ExpenseCategory.DEBT_PAYMENTS]: "#f43f5e",
  [ExpenseCategory.SAVINGS]: "#059669",
  [ExpenseCategory.TRAVEL]: "#84cc16",
  [ExpenseCategory.SHOPPING]: "#d946ef",
  [ExpenseCategory.KIDS]: "#6366f1",
  [ExpenseCategory.MISCELLANEOUS]: "#64748b",
  [ExpenseCategory.TAXES]: "#b91c1c",
};

export default function ExpenseCategoryChart({
  userPlan,
  className = "",
}: ExpenseCategoryChartProps) {
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<"pie" | "donut" | "bar" | "treemap">("donut");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [showInactive, setShowInactive] = useState(false);

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
        return amount;
      default:
        return amount;
    }
  };

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
          color: CATEGORY_COLORS[expense.category] || "#64748b",
        });
      }

      const catData = categoryMap.get(expense.category)!;
      catData.amount += monthlyAmount;
      catData.count += 1;
      catData.expenses.push({
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

    return Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalAmount > 0 ? (cat.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [userPlan, showInactive]);

  const formatCategoryName = (category: ExpenseCategory) => {
    return (
      category.charAt(0).toUpperCase() +
      category.slice(1).toLowerCase().replace("_", " ")
    );
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {data.name || (data.category && formatCategoryName(data.category))}
          </p>
          <p className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
            {formatCurrency(data.value || data.amount)}
            {data.percentage ? ` (${data.percentage.toFixed(1)}%)` : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
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
        fontSize={11}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const totalMonthlySpend = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <div className={`surface-card p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t("charts.expenses.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t("charts.expenses.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            {t("charts.expenses.includeInactive")}
          </label>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            {(["donut", "pie", "bar", "treemap"] as const).map((mode) => (
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

      {categoryData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-7 h-72">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === "bar" ? (
                  <BarChart
                    data={categoryData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="currentColor" />
                    <XAxis
                      dataKey="category"
                      angle={-30}
                      textAnchor="end"
                      height={45}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      tickFormatter={formatCategoryName}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      tickLine={false}
                      axisLine={false}
                      width={65}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="amount"
                      onClick={(data: any) => {
                        const category = data?.payload?.category;
                        if (category) {
                          setSelectedCategory(selectedCategory === category ? null : category);
                        }
                      }}
                      radius={[4, 4, 0, 0]}
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
                ) : viewMode === "treemap" ? (
                  <Treemap
                    data={categoryData.map((cat) => ({
                      name: formatCategoryName(cat.category),
                      value: cat.amount,
                      fill: cat.color,
                    }))}
                    dataKey="value"
                    stroke="#ffffff"
                    fill="#6366f1"
                  >
                    <Tooltip formatter={(value) => [formatCurrency(value as number), "Valor"]} />
                  </Treemap>
                ) : (
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomLabel}
                      outerRadius={105}
                      innerRadius={viewMode === "donut" ? 55 : 0}
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
                          stroke={selectedCategory === entry.category ? "#6366f1" : "rgba(255,255,255,0.2)"}
                          strokeWidth={selectedCategory === entry.category ? 3 : 1}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Category Details List */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("charts.expenses.categories")} ({categoryData.length})
                </span>
                <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrency(totalMonthlySpend)}
                </span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {categoryData.map((cat) => {
                  const isSelected = selectedCategory === cat.category;
                  return (
                    <div
                      key={cat.category}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      onClick={() =>
                        setSelectedCategory(isSelected ? null : cat.category)
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="p-1 rounded-md text-white shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            <ExpenseCategoryIcon category={cat.category} className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {formatCategoryName(cat.category)}
                          </span>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                          {formatCurrency(cat.amount)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(3, cat.percentage)}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                        <span>{cat.count} {t("charts.expenses.count")}</span>
                        <span className="font-semibold tabular-nums">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drilldown Section for Selected Category */}
          {selectedCategory && (
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="p-1.5 rounded-lg text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[selectedCategory] || "#64748b" }}
                  >
                    <ExpenseCategoryIcon category={selectedCategory} className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatCategoryName(selectedCategory)} {t("charts.expenses.details")}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear filter
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {categoryData
                  .find((cat) => cat.category === selectedCategory)
                  ?.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {expense.name}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 capitalize">
                          {expense.frequency}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-xs tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(expense.monthlyAmount)}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400">/mo</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t("charts.expenses.noData.title")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t("charts.expenses.noData.desc")}
          </p>
        </div>
      )}
    </div>
  );
}
