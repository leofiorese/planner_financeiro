"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useFinancialState, useFinancialActions } from "@/context";
import {
  Frequency,
  ExpenseCategory,
  Priority,
  CreateExpenseInput,
  UpdateExpenseInput,
  Expense,
  PaymentMethod,
  CreditCardAccount,
} from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ExpenseSortBy,
  ExpenseGroupBy,
  sortExpenses,
  groupExpenses,
  getSortByLabel,
  getGroupByLabel,
  aggregateExpensesByMonth,
  getExpenseType,
  ExpenseType,
  calculateMonthlyAmount,
} from "@/utils/expenseOperations";
import { getInstallmentProgressDisplay } from "@/utils/installmentCalculator";
import {
  formatLocalizedDate,
  formatLocalizedMonth,
} from "@/utils/dateFormatting";

const calculateCreditCardDueDate = (
  account: CreditCardAccount,
  referenceDate: Date = new Date()
) => {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  let dueDay = 10;
  if (account === CreditCardAccount.XP) dueDay = 20;

  const targetDate = new Date(currentYear, currentMonth, dueDay);

  // If reference date is past the due day (closing date approx), set to next month
  // Simple logic: if purchase day > dueDay, move payment to next month
  if (currentDay > dueDay) {
    targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return targetDate.toISOString().split("T")[0];
};

export default function ExpensesPage() {
  const state = useFinancialState();
  const { addExpense, updateExpense, deleteExpense } = useFinancialActions();
  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    ExpenseCategory | "all"
  >("all");

  // View mode and filtering states
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [sortBy, setSortBy] = useState<ExpenseSortBy>(ExpenseSortBy.DATE_DESC);
  const [groupBy, setGroupBy] = useState<ExpenseGroupBy>(ExpenseGroupBy.NONE);

  // Form ref for auto-scroll
  const formRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to form when editing starts
  useEffect(() => {
    if (isAddFormOpen && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddFormOpen]);
  const [formData, setFormData] = useState<CreateExpenseInput>({
    name: "",
    amount: 0,
    category: ExpenseCategory.MISCELLANEOUS,
    dueDate: new Date().toISOString().split("T")[0],
    paymentMethod: PaymentMethod.PIX,
    creditCardAccount: undefined,
    recurring: false,
    frequency: Frequency.MONTHLY,
    recurringWeeksInterval: 1,
    description: "",
    priority: Priority.MEDIUM,
    isActive: true,
    isInstallment: false,
    installmentMonths: 1,
    installmentStartMonth: "",
  });

  // Separate state for purchase date (defaults to today)
  // Used to calculate credit card due date
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );


  const handleInputChange = (
    field: keyof CreateExpenseInput,
    value: any
  ) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [field]: value,
      };

      // Handle Payment Method changes
      if (field === "paymentMethod") {
        if (value === PaymentMethod.CREDIT_CARD) {
          // Default to Inter if switching to Credit Card
          if (!prev.creditCardAccount) {
            newData.creditCardAccount = CreditCardAccount.INTER;
            // Calculate initial due date based on current purchase date
            const pDate = new Date(purchaseDate);
            newData.dueDate = calculateCreditCardDueDate(
              CreditCardAccount.INTER,
              pDate
            );
          }
        } else {
          // Reset credit card account if not credit card
          newData.creditCardAccount = undefined;
          // Reset due date to purchase date (or today if empty)
          newData.dueDate = purchaseDate;
        }
      }

      // Handle Credit Card Account changes
      if (field === "creditCardAccount" && value) {
        const pDate = new Date(purchaseDate);
        newData.dueDate = calculateCreditCardDueDate(
          value as CreditCardAccount,
          pDate
        );
      }

      // Auto-populate installment start month when installment is enabled
      if (
        field === "isInstallment" &&
        value === true &&
        !prev.installmentStartMonth
      ) {
        newData.installmentStartMonth = prev.dueDate
          ? prev.dueDate.slice(0, 7)
          : new Date().toISOString().slice(0, 7);
      }

      // Sync installmentStartMonth with dueDate if it changes
      if (field === "dueDate" && prev.isInstallment) {
        newData.installmentStartMonth = String(value).slice(0, 7);
      }

      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingExpense) {
        // Update existing expense
        const updateData: UpdateExpenseInput = {
          id: editingExpense,
          ...formData,
        };
        await updateExpense(updateData);
        setEditingExpense(null);
      } else {
        // Add new expense
        await addExpense(formData);
        setIsAddFormOpen(false);
      }

      // Reset form
      setFormData({
        name: "",
        amount: 0,
        category: ExpenseCategory.MISCELLANEOUS,
        dueDate: "",
        recurring: false,
        frequency: Frequency.MONTHLY,
        recurringWeeksInterval: 1,
        description: "",
        priority: Priority.MEDIUM,
        isActive: true,
        isInstallment: false,
        installmentMonths: 1,
        installmentStartMonth: "",
        paymentMethod: PaymentMethod.PIX,
        creditCardAccount: undefined,
      });
    } catch (error) {
      console.error("Failed to save expense:", error);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense.id);
    setFormData({
      name: expense.name,
      amount: expense.amount,
      category: expense.category,
      dueDate: expense.dueDate,
      paymentMethod: expense.paymentMethod || PaymentMethod.PIX, // Default for existing expenses
      creditCardAccount: expense.creditCardAccount,
      recurring: expense.recurring,
      frequency: expense.frequency || Frequency.MONTHLY,
      recurringWeeksInterval: expense.recurringWeeksInterval || 1,
      description: expense.description || "",
      priority: expense.priority,
      isActive: expense.isActive,
      isInstallment: expense.isInstallment || false,
      installmentMonths: expense.installmentMonths || 1,
      installmentStartMonth: expense.installmentStartMonth || "",
    });
    setPurchaseDate(new Date().toISOString().split("T")[0]); // Default to today as we don't track purchase date
    setIsAddFormOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (window.confirm(t("expenses.deleteConfirm"))) {
      try {
        await deleteExpense(expenseId);
      } catch (error) {
        console.error("Failed to delete expense:", error);
      }
    }
  };

  const handleCancel = () => {
    setIsAddFormOpen(false);
    setEditingExpense(null);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setFormData({
      name: "",
      amount: 0,
      category: ExpenseCategory.MISCELLANEOUS,
      dueDate: new Date().toISOString().split("T")[0],
      paymentMethod: PaymentMethod.PIX,
      creditCardAccount: undefined,
      recurring: false,
      frequency: Frequency.MONTHLY,
      recurringWeeksInterval: 1,
      description: "",
      priority: Priority.MEDIUM,
      isActive: true,
      isInstallment: false,
      installmentMonths: 1,
      installmentStartMonth: "",
    });
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    return t(`common.category.${category}`, {
      defaultValue: category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    });
  };

  const getFrequencyLabel = (frequency: Frequency) => {
    switch (frequency) {
      case Frequency.DAILY:
        return t("frequency.daily");
      case Frequency.WEEKLY:
        return t("frequency.weekly");
      case Frequency.BIWEEKLY:
        return t("frequency.biweekly");
      case Frequency.MONTHLY:
        return t("frequency.monthly");
      case Frequency.QUARTERLY:
        return t("frequency.quarterly");
      case Frequency.YEARLY:
        return t("frequency.yearly");
      case Frequency.ONE_TIME:
        return t("frequency.one_time");
      default:
        return frequency;
    }
  };

  // Use the centralized calculateMonthlyAmount from expenseOperations
  // which now includes overlapping cycle logic
  const calculateMonthlyAmountLocal = (
    expense: {
      amount: number;
      frequency?: Frequency;
      isInstallment?: boolean;
      installmentMonths?: number;
      installmentStartMonth?: string;
      recurring?: boolean;
      recurringWeeksInterval?: number;
    },
    targetMonth?: Date
  ) => {
    // Cast to full Expense type and use centralized function
    return calculateMonthlyAmount(expense as Expense, targetMonth);
  };

  // Process expenses with filtering, sorting, and grouping
  const processedExpenses = useMemo(() => {
    // First filter by category
    const filtered =
      selectedCategory === "all"
        ? state.userPlan.expenses
        : state.userPlan.expenses.filter(
          (expense) => expense.category === selectedCategory
        );

    // Then sort
    const sorted = sortExpenses(filtered, sortBy);

    // Then group (for list view)
    const grouped = groupExpenses(sorted, groupBy);

    return {
      filtered: sorted,
      grouped,
    };
  }, [state.userPlan.expenses, selectedCategory, sortBy, groupBy]);

  // Monthly calendar data (shows the entire current year)
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    return aggregateExpensesByMonth(processedExpenses.filtered, startOfYear, 12);
  }, [processedExpenses.filtered]);

  const totalMonthlyExpenses = state.userPlan.expenses
    .filter((expense) => expense.isActive)
    .reduce(
      (total, expense) => total + calculateMonthlyAmountLocal(expense),
      0
    );

  const expensesByCategory = Object.values(ExpenseCategory)
    .map((category) => ({
      category,
      count: state.userPlan.expenses.filter(
        (expense) => expense.category === category && expense.isActive
      ).length,
      total: state.userPlan.expenses
        .filter((expense) => expense.category === category && expense.isActive)
        .reduce(
          (sum, expense) => sum + calculateMonthlyAmountLocal(expense),
          0
        ),
    }))
    .filter((item) => item.count > 0);

  const recurringExpenses = state.userPlan.expenses.filter(
    (expense) => expense.recurring && expense.isActive
  );

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case ExpenseCategory.HOUSING:
        return "🏠";
      case ExpenseCategory.FOOD:
        return "🍽️";
      case ExpenseCategory.TRANSPORTATION:
        return "🚗";
      case ExpenseCategory.UTILITIES:
        return "⚡";
      case ExpenseCategory.HEALTHCARE:
        return "🏥";
      case ExpenseCategory.ENTERTAINMENT:
        return "🎬";
      case ExpenseCategory.PERSONAL_CARE:
        return "💄";
      case ExpenseCategory.EDUCATION:
        return "📚";
      case ExpenseCategory.SAVINGS:
        return "💰";
      case ExpenseCategory.DEBT_PAYMENTS:
        return "💳";
      case ExpenseCategory.INSURANCE:
        return "🛡️";
      case ExpenseCategory.TRAVEL:
        return "✈️";
      case ExpenseCategory.SHOPPING:
        return "🛍️";
      case ExpenseCategory.KIDS:
        return "👶";
      case ExpenseCategory.MISCELLANEOUS:
        return "📦";
      default:
        return "📦";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              💳 {t("expenses.pageTitle")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {t("expenses.pageSubtitle")}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("expenses.totalMonthly")}
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalMonthlyExpenses)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              from {state.userPlan.expenses.filter((e) => e.isActive).length}{" "}
              {t("expenses.activeExpenses")}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
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
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("expenses.stats.total")}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {state.userPlan.expenses.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("expenses.stats.recurring")}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {recurringExpenses.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("expenses.stats.categories")}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {expensesByCategory.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
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
            <div className="ml-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("expenses.stats.yearly")}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(totalMonthlyExpenses * 12)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Left side: Title and View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              💳 {t("expenses.listTitle")}
            </h2>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 transform scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                <span>📅</span>
                {t("expenses.controls.view.calendar")}
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${viewMode === "list"
                  ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 transform scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                <span>📋</span>
                {t("expenses.controls.view.list")}
              </button>
            </div>
          </div>

          {/* Right side: Filters and Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as ExpenseCategory | "all")
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
            >
              <option value="all">{t("expenses.controls.filter.all")}</option>
              {Object.values(ExpenseCategory).map((category) => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {getCategoryLabel(category)}
                </option>
              ))}
            </select>

            {/* Sort and Group Controls (List View Only) */}
            {viewMode === "list" && (
              <>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as ExpenseSortBy)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
                >
                  {Object.values(ExpenseSortBy).map((option) => (
                    <option key={option} value={option}>
                      {getSortByLabel(option)}
                    </option>
                  ))}
                </select>

                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as ExpenseGroupBy)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-sm"
                >
                  {Object.values(ExpenseGroupBy).map((option) => (
                    <option key={option} value={option}>
                      {getGroupByLabel(option)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              onClick={() => setIsAddFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
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
              {t("expenses.addButton")}
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAddFormOpen && (
        <div
          ref={formRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingExpense ? t("expenses.form.editTitle") : t("expenses.form.addTitle")}
            </h3>
            {editingExpense && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                📝 {formData.name || t("common.name")}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("expenses.form.name")} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder={t("expenses.form.placeholder.name")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("expenses.form.amount")} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount === 0 ? "" : formData.amount}
                onChange={(e) =>
                  handleInputChange("amount", parseFloat(e.target.value) || 0)
                }
                onFocus={(e) => {
                  if (e.target.value === "0") {
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("expenses.form.category")} *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  handleInputChange(
                    "category",
                    e.target.value as ExpenseCategory
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                {Object.values(ExpenseCategory).map((category) => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)} {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("expenses.form.paymentMethod")} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(PaymentMethod).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleInputChange("paymentMethod", method)}
                    className={`px-2 py-2 text-sm font-medium rounded-lg border transition-colors ${formData.paymentMethod === method
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                  >
                    {t(`expenses.form.paymentMethod.${method}`)}
                  </button>
                ))}
              </div>
            </div>

            {formData.paymentMethod === PaymentMethod.CREDIT_CARD && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("expenses.form.creditCardAccount")} *
                </label>
                <div className="flex gap-2">
                  {Object.values(CreditCardAccount).map((account) => (
                    <button
                      key={account}
                      type="button"
                      onClick={() =>
                        handleInputChange("creditCardAccount", account)
                      }
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${formData.creditCardAccount === account
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                    >
                      {t(`expenses.form.creditCardAccount.${account}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.paymentMethod === PaymentMethod.CREDIT_CARD ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("expenses.form.purchaseDate") || "Purchase Date"} *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setPurchaseDate(newDate);
                      if (formData.creditCardAccount) {
                        const calculatedDue = calculateCreditCardDueDate(
                          formData.creditCardAccount,
                          new Date(newDate)
                        );
                        handleInputChange("dueDate", calculatedDue);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("expenses.form.purchaseDateHelper") ||
                      "Select the date you made the purchase."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("expenses.form.dueDate")} ({t("common.calculated")})
                  </label>
                  <input
                    type="date"
                    required
                    readOnly
                    value={formData.dueDate}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {t("expenses.form.autoCalculatedDue") ||
                      "Automatically calculated based on card closing date."}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("expenses.form.dueDate")} *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => {
                    handleInputChange("dueDate", e.target.value);
                    setPurchaseDate(e.target.value); // Sync purchase date
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("expenses.form.priority")}
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  handleInputChange("priority", e.target.value as Priority)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                {Object.values(Priority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.recurring}
                  onChange={(e) =>
                    handleInputChange("recurring", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t("expenses.form.recurring")}
                </span>
              </label>
            </div>

            {formData.recurring && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("expenses.form.frequency")}
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      handleInputChange(
                        "frequency",
                        e.target.value as Frequency
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  >
                    {Object.values(Frequency).map((freq) => (
                      <option key={freq} value={freq}>
                        {getFrequencyLabel(freq)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Weekly Interval Input */}
                {formData.frequency === Frequency.WEEKLY && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("expenses.form.interval")}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Every
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={formData.recurringWeeksInterval || 1}
                        onChange={(e) =>
                          handleInputChange(
                            "recurringWeeksInterval",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 text-center"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.recurringWeeksInterval === 1
                          ? "week"
                          : "weeks"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t("expenses.form.intervalHelp")}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isInstallment}
                  onChange={(e) =>
                    handleInputChange("isInstallment", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t("expenses.form.installment")}
                </span>
              </label>
            </div>

            {formData.isInstallment && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("expenses.form.installmentMonths")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.installmentMonths}
                    onChange={(e) =>
                      handleInputChange(
                        "installmentMonths",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    placeholder="12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Starting Month
                  </label>
                  <input
                    type="month"
                    value={formData.installmentStartMonth}
                    onChange={(e) =>
                      handleInputChange("installmentStartMonth", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                placeholder="Additional details about this expense..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t("expenses.list.active")}
                </span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={state.loading.isLoadingExpenses}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.loading.isLoadingExpenses
                  ? t("common.saving")
                  : editingExpense
                    ? t("expenses.form.editTitle")
                    : t("expenses.addButton")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Views */}
      {viewMode === "calendar" ? (
        /* Calendar View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {/* Expense Type Legend */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              {t("expenses.legend")}
            </h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-1.5 rounded text-gray-700 dark:text-gray-300">
                  {t("expenses.type.oneTime")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 px-3 py-1.5 rounded text-gray-700 dark:text-gray-300">
                  {t("expenses.type.recurring")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 px-3 py-1.5 rounded text-gray-700 dark:text-gray-300">
                  {t("expenses.type.installment")}
                  <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded font-medium">
                    2/10
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {monthlyData.map((monthData) => (
              <div
                key={monthData.month}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Month Header */}
                <div className="text-center mb-4 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                    {monthData.monthLabel}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {formatCurrency(monthData.totalAmount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {monthData.expenses.length} expense
                    {monthData.expenses.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Expenses Content */}
                <div className="px-3 pb-3">
                  {monthData.expenses.length > 0 ? (
                    <div className="space-y-1">
                      {monthData.expenses.map((expense) => {
                        const expenseType = getExpenseType(expense);

                        // Define background colors based on expense type
                        const getBackgroundColor = (type: ExpenseType) => {
                          switch (type) {
                            case ExpenseType.RECURRING:
                              return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700";
                            case ExpenseType.INSTALLMENT:
                              return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700";
                            case ExpenseType.ONE_TIME:
                            default:
                              return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700";
                          }
                        };

                        // Use centralized installment progress calculation
                        const installmentProgress =
                          getInstallmentProgressDisplay(
                            expense,
                            new Date(monthData.month + "-01T12:00:00")
                          );

                        return (
                          <div
                            key={expense.id}
                            className={`rounded p-2 border text-xs transition-all hover:shadow-sm ${getBackgroundColor(
                              expenseType
                            )}`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-sm">
                                  {getCategoryIcon(expense.category)}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {expense.name}
                                </span>
                                {installmentProgress && (
                                  <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                    {installmentProgress}
                                  </span>
                                )}
                              </div>
                              <span className="text-red-600 dark:text-red-400 font-semibold whitespace-nowrap ml-2">
                                {formatCurrency(
                                  calculateMonthlyAmountLocal(
                                    expense,
                                    new Date(monthData.month + "-01T00:00:00Z")
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2 opacity-50">💰</div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t("expenses.noExpensesMonth")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {processedExpenses.filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t("expenses.noExpenses")}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t("dashboard.startExpenseHelper")}
              </p>
              <button
                onClick={() => setIsAddFormOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t("expenses.addButton")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupBy === ExpenseGroupBy.NONE
                ? // Ungrouped list
                processedExpenses.filtered.map((expense) => (
                  <div
                    key={expense.id}
                    className={`p-6 transition-all duration-300 ${editingExpense === expense.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg"
                      : ""
                      }`}
                  >
                    {/* Editing indicator */}
                    {editingExpense === expense.id && (
                      <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        {t("income.editing")}
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {getCategoryIcon(expense.category)}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {expense.name}
                          </h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {getCategoryLabel(expense.category)}
                          </span>
                          {expense.recurring && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {t("expenses.type.recurringLabel")}
                            </span>
                          )}
                          {expense.isInstallment && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {t("expenses.type.installmentLabel", {
                                months: expense.installmentMonths || 0,
                              })}
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${expense.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                              }`}
                          >
                            {expense.isActive
                              ? t("common.active")
                              : t("common.inactive")}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {t("common.amount")}
                            </div>
                            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(expense.amount)}{" "}
                              {expense.frequency && (
                                <span className="text-sm text-gray-500">
                                  / {getFrequencyLabel(expense.frequency)}
                                </span>
                              )}
                            </div>
                            {expense.isInstallment && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(
                                  expense.amount /
                                  (expense.installmentMonths || 1)
                                )}{" "}
                                {t("common.perMonth")}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {t("expenses.monthlyEquivalent")}
                            </div>
                            <div className="text-lg font-medium text-red-600 dark:text-red-400">
                              {formatCurrency(
                                calculateMonthlyAmountLocal(
                                  expense,
                                  new Date()
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {expense.isInstallment
                                ? t("common.startDate")
                                : t("expenses.form.dueDate")}
                            </div>
                            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {expense.isInstallment &&
                                expense.installmentStartMonth
                                ? formatLocalizedMonth(
                                  expense.installmentStartMonth,
                                  language
                                )
                                : expense.dueDate
                                  ? formatLocalizedDate(
                                    expense.dueDate,
                                    language
                                  )
                                  : "Not set"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {t("common.type")}
                            </div>
                            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                              {expense.isInstallment
                                ? t("expenses.type.installmentLabel", {
                                  months: expense.installmentMonths || 0,
                                })
                                : expense.recurring
                                  ? t("expenses.type.recurringLabel")
                                  : t("expenses.type.oneTimeLabel")}
                            </div>
                          </div>
                        </div>

                        {expense.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            {expense.description}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit expense"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete expense"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
                : // Grouped list
                processedExpenses.grouped.map((group) => (
                  <div key={group.key} className="mb-6">
                    {/* Group Header */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{group.icon}</span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {group.label}
                          </h3>
                          <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                            {group.count} expense
                            {group.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(group.totalAmount)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Total
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Group Expenses */}
                    <div className="divide-y divide-gray-200 dark:divide-gray-600">
                      {group.expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className={`p-6 transition-all duration-300 ${editingExpense === expense.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg"
                            : ""
                            }`}
                        >
                          {/* Editing indicator */}
                          {editingExpense === expense.id && (
                            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Currently editing this expense
                            </div>
                          )}

                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">
                                  {getCategoryIcon(expense.category)}
                                </span>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {expense.name}
                                </h3>
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {getCategoryLabel(expense.category)}
                                </span>
                                {expense.recurring && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    Recurring
                                  </span>
                                )}
                                {expense.isInstallment && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    Installment ({expense.installmentMonths}{" "}
                                    months)
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${expense.isActive
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    }`}
                                >
                                  {expense.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Amount
                                  </div>
                                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {formatCurrency(expense.amount)}{" "}
                                    {expense.frequency && (
                                      <span className="text-sm text-gray-500">
                                        /{" "}
                                        {getFrequencyLabel(expense.frequency)}
                                      </span>
                                    )}
                                  </div>
                                  {expense.isInstallment && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {formatCurrency(
                                        expense.amount /
                                        (expense.installmentMonths || 1)
                                      )}{" "}
                                      per month
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Monthly Equivalent
                                  </div>
                                  <div className="text-lg font-medium text-red-600 dark:text-red-400">
                                    {formatCurrency(
                                      calculateMonthlyAmountLocal(
                                        expense,
                                        new Date()
                                      )
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {expense.isInstallment
                                      ? "Start Date"
                                      : "Due Date"}
                                  </div>
                                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {expense.isInstallment &&
                                      expense.installmentStartMonth
                                      ? formatLocalizedMonth(
                                        expense.installmentStartMonth,
                                        useLanguage().language
                                      )
                                      : expense.dueDate
                                        ? formatLocalizedDate(
                                          expense.dueDate,
                                          useLanguage().language
                                        )
                                        : "Not set"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Type
                                  </div>
                                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    {expense.isInstallment
                                      ? `Installment (${expense.installmentMonths} months)`
                                      : expense.recurring
                                        ? "Recurring"
                                        : "One-time"}
                                  </div>
                                </div>
                              </div>

                              {expense.description && (
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                  {expense.description}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEdit(expense)}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title={t("expenses.form.editTitle")}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title={t("expenses.deleteExpense")}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error.expenseError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {state.error.expenseError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
