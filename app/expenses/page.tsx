"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useFinancialState, useFinancialActions } from "@/context";
import Link from "next/link";
import {
  Frequency,
  ExpenseCategory,
  Priority,
  CreateExpenseInput,
  UpdateExpenseInput,
  Expense,
  PaymentMethod,
  CreditCardAccount,
  CreditCardAccountInfo,
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
  calculateMonthlyAmount,
} from "@/utils/expenseOperations";
import { getInstallmentProgressDisplay } from "@/utils/installmentCalculator";
import { formatLocalizedDate, formatLocalizedMonth } from "@/utils/dateFormatting";
import {
  calculateCreditCardDueDate,
  calculateCreditCardBillingMonth,
  getBillingShiftLabel,
  getCardConfig,
} from "@/utils/creditCardRules";
import { ExpenseCategoryIcon } from "@/components/CategoryIcon";
import DatePicker from "@/components/DatePicker";
import MonthPicker from "@/components/MonthPicker";

const getLocalizedSortByLabel = (sortBy: ExpenseSortBy, language: string) => {
  if (language !== "pt") {
    return getSortByLabel(sortBy);
  }
  switch (sortBy) {
    case ExpenseSortBy.DATE_DESC:
      return "Data (Mais recente)";
    case ExpenseSortBy.DATE_ASC:
      return "Data (Mais antiga)";
    case ExpenseSortBy.AMOUNT_DESC:
      return "Valor (Maior primeiro)";
    case ExpenseSortBy.AMOUNT_ASC:
      return "Valor (Menor primeiro)";
    case ExpenseSortBy.NAME_ASC:
      return "Nome (A - Z)";
    case ExpenseSortBy.NAME_DESC:
      return "Nome (Z - A)";
    case ExpenseSortBy.PRIORITY_DESC:
      return "Prioridade (Alta para baixa)";
    case ExpenseSortBy.PRIORITY_ASC:
      return "Prioridade (Baixa para alta)";
    default:
      return sortBy;
  }
};

const getLocalizedGroupByLabel = (groupBy: ExpenseGroupBy, language: string) => {
  if (language !== "pt") {
    return getGroupByLabel(groupBy);
  }
  switch (groupBy) {
    case ExpenseGroupBy.NONE:
      return "Sem agrupamento";
    case ExpenseGroupBy.TYPE:
      return "Por tipo de despesa";
    case ExpenseGroupBy.CATEGORY:
      return "Por categoria";
    case ExpenseGroupBy.PRIORITY:
      return "Por prioridade";
    case ExpenseGroupBy.MONTH:
      return "Por mês";
    default:
      return groupBy;
  }
};

const getPaymentMethodBadge = (method?: PaymentMethod, language: string = "pt") => {
  switch (method) {
    case PaymentMethod.CREDIT_CARD:
      return {
        label: language === "pt" ? "Cartão de Crédito" : "Credit Card",
        className:
          "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60",
      };
    case PaymentMethod.DEBIT_CARD:
      return {
        label: language === "pt" ? "Cartão de Débito" : "Debit Card",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60",
      };
    case PaymentMethod.CASH:
      return {
        label: language === "pt" ? "Dinheiro" : "Cash",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60",
      };
    case PaymentMethod.PIX:
    default:
      return {
        label: "PIX",
        className:
          "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60",
      };
  }
};

const getCreditCardAccountBadge = (
  account?: CreditCardAccount | string,
  userCards?: CreditCardAccountInfo[]
) => {
  if (!account) return null;

  // Check user cards first
  const matched = userCards?.find(
    (c) => c.id === account || c.name.toLowerCase() === account.toLowerCase()
  );
  if (matched) {
    return {
      label: matched.name,
      style: {
        backgroundColor: `${matched.color || "#6366f1"}15`,
        color: matched.color || "#6366f1",
        borderColor: `${matched.color || "#6366f1"}40`,
      },
      className: "border font-semibold",
    };
  }

  // Fallback static enums/defaults
  switch (account) {
    case CreditCardAccount.INTER:
    case "inter":
      return {
        label: "Inter",
        className:
          "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/60 font-semibold",
      };
    case CreditCardAccount.XP:
    case "xp":
      return {
        label: "XP",
        className:
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold",
      };
    default:
      if (typeof account === "string" && account.trim()) {
        return {
          label: account.toUpperCase(),
          className:
            "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 font-semibold",
        };
      }
      return null;
  }
};

export default function ExpensesPage() {
  const state = useFinancialState();
  const { addExpense, updateExpense, deleteExpense } = useFinancialActions();
  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

  // ── Mode & View State ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [sortBy, setSortBy] = useState<ExpenseSortBy>(ExpenseSortBy.DATE_DESC);
  const [groupBy, setGroupBy] = useState<ExpenseGroupBy>(ExpenseGroupBy.NONE);

  // ── Filters State ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<"all" | "one_time" | "recurring" | "installment">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [cardAccountFilter, setCardAccountFilter] = useState<string>("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // ── List Pagination State ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // ── Calendar Year State (12 months per year) ─────────────────────────
  const currentRealYear = new Date().getFullYear();
  const [calendarYear, setCalendarYear] = useState<number>(currentRealYear);

  // ── Form State ───────────────────────────────────────────────────────
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // ── Last Inserted Animation Tracker ──────────────────────────────────
  const [lastInsertedExpenseId, setLastInsertedExpenseId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("lastInsertedExpenseId");
    }
    return null;
  });

  const prevExpensesLengthRef = useRef(state.userPlan.expenses.length);

  useEffect(() => {
    if (state.userPlan.expenses.length > prevExpensesLengthRef.current) {
      const newest = [...state.userPlan.expenses].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })[0];
      if (newest) {
        setLastInsertedExpenseId(newest.id);
        try {
          sessionStorage.setItem("lastInsertedExpenseId", newest.id);
        } catch {}
      }
    }
    prevExpensesLengthRef.current = state.userPlan.expenses.length;
  }, [state.userPlan.expenses]);

  useEffect(() => {
    if (isAddFormOpen && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddFormOpen]);

  // ── Credit Cards References ──────────────────────────────────────────
  const creditCards = useMemo(
    () => state.userPlan.creditCardAccounts || [],
    [state.userPlan.creditCardAccounts]
  );
  const activeCards = useMemo(
    () => (creditCards.length > 0 ? creditCards.filter((c) => c.isActive) : []),
    [creditCards]
  );

  const selectedCardInfo = useMemo(() => {
    if (!formData.creditCardAccount) return null;
    return getCardConfig(formData.creditCardAccount, creditCards);
  }, [creditCards, formData.creditCardAccount]);

  const billingShiftText = useMemo(() => {
    if (formData.paymentMethod !== PaymentMethod.CREDIT_CARD) return null;
    const dummyExp: Expense = {
      ...formData,
      id: "temp",
      createdAt: "",
      updatedAt: "",
    } as Expense;
    return getBillingShiftLabel(dummyExp, creditCards);
  }, [formData, creditCards]);

  // ── Input & Form Handlers ────────────────────────────────────────────
  const handleInputChange = (
    field: keyof CreateExpenseInput,
    value: CreateExpenseInput[keyof CreateExpenseInput]
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      if (field === "paymentMethod") {
        if (value === PaymentMethod.CREDIT_CARD) {
          const defaultAccount = activeCards[0]?.id || CreditCardAccount.INTER;
          updated.creditCardAccount = defaultAccount;
          updated.dueDate = calculateCreditCardDueDate(
            defaultAccount,
            new Date(purchaseDate),
            creditCards
          );
          if (updated.isInstallment) {
            updated.installmentStartMonth = calculateCreditCardBillingMonth(
              defaultAccount,
              new Date(purchaseDate),
              creditCards
            );
          }
        } else {
          updated.creditCardAccount = undefined;
          updated.dueDate = new Date().toISOString().split("T")[0];
          if (updated.isInstallment) {
            updated.installmentStartMonth = new Date().toISOString().slice(0, 7);
          }
        }
      }

      if (field === "creditCardAccount" && value) {
        updated.dueDate = calculateCreditCardDueDate(
          value as string,
          new Date(purchaseDate),
          creditCards
        );
        if (updated.isInstallment) {
          updated.installmentStartMonth = calculateCreditCardBillingMonth(
            value as string,
            new Date(purchaseDate),
            creditCards
          );
        }
      }

      return updated;
    });
  };

  const handlePurchaseDateChange = (newDate: string) => {
    setPurchaseDate(newDate);
    if (
      formData.paymentMethod === PaymentMethod.CREDIT_CARD &&
      formData.creditCardAccount
    ) {
      const calculatedDueDate = calculateCreditCardDueDate(
        formData.creditCardAccount,
        new Date(newDate),
        creditCards
      );
      const calculatedBillingMonth = calculateCreditCardBillingMonth(
        formData.creditCardAccount,
        new Date(newDate),
        creditCards
      );
      setFormData((prev) => ({
        ...prev,
        dueDate: calculatedDueDate,
        installmentStartMonth: prev.isInstallment
          ? calculatedBillingMonth
          : prev.installmentStartMonth,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingExpense) {
        const updateData: UpdateExpenseInput = {
          id: editingExpense,
          ...formData,
        };
        await updateExpense(updateData);
        setEditingExpense(null);
      } else {
        await addExpense(formData);
        setIsAddFormOpen(false);
      }

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
      paymentMethod: expense.paymentMethod || PaymentMethod.PIX,
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
    setPurchaseDate(new Date().toISOString().split("T")[0]);
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
        .join(" "),
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
    return calculateMonthlyAmount(expense as Expense, targetMonth);
  };

  // ── Filters & Active Count ───────────────────────────────────────────
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (categoryFilter !== "all") count++;
    if (scheduleTypeFilter !== "all") count++;
    if (paymentMethodFilter !== "all") count++;
    if (cardAccountFilter !== "all") count++;
    if (startDateFilter) count++;
    if (endDateFilter) count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [
    searchQuery,
    categoryFilter,
    scheduleTypeFilter,
    paymentMethodFilter,
    cardAccountFilter,
    startDateFilter,
    endDateFilter,
    statusFilter,
  ]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setScheduleTypeFilter("all");
    setPaymentMethodFilter("all");
    setCardAccountFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    categoryFilter,
    scheduleTypeFilter,
    paymentMethodFilter,
    cardAccountFilter,
    startDateFilter,
    endDateFilter,
    statusFilter,
    sortBy,
    groupBy,
  ]);

  // ── Core Filtering Engine ────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    return state.userPlan.expenses.filter((expense) => {
      // 1. Text Search (name, description, category)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = expense.name.toLowerCase().includes(q);
        const matchDesc = expense.description?.toLowerCase().includes(q) || false;
        const matchCat = expense.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "all" && expense.category !== categoryFilter) {
        return false;
      }

      // 3. Schedule Type Filter (Recorrência, Parcelada ou Única)
      if (scheduleTypeFilter !== "all") {
        if (scheduleTypeFilter === "one_time" && (expense.recurring || expense.isInstallment)) {
          return false;
        }
        if (scheduleTypeFilter === "recurring" && !expense.recurring) {
          return false;
        }
        if (scheduleTypeFilter === "installment" && !expense.isInstallment) {
          return false;
        }
      }

      // 4. Payment Method Filter
      if (paymentMethodFilter !== "all" && expense.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // 5. Card Account Filter
      if (cardAccountFilter !== "all") {
        if (expense.paymentMethod !== PaymentMethod.CREDIT_CARD) return false;
        const expCard = expense.creditCardAccount || "";
        const matches =
          expCard.toLowerCase() === cardAccountFilter.toLowerCase() ||
          creditCards.some(
            (c) =>
              c.id === cardAccountFilter &&
              (c.id === expCard || c.name.toLowerCase() === expCard.toLowerCase())
          );
        if (!matches) return false;
      }

      // 6. Start Date Filter (Data Início)
      if (startDateFilter) {
        if (expense.isInstallment && expense.installmentStartMonth && expense.installmentMonths) {
          const [sYear, sMonth] = expense.installmentStartMonth.split("-").map(Number);
          const endInstallmentDate = new Date(sYear, sMonth - 1 + expense.installmentMonths - 1, 31);
          if (endInstallmentDate < new Date(startDateFilter)) return false;
        } else if (expense.recurring) {
          // Recurring expenses continue into the future
        } else {
          if (new Date(expense.dueDate) < new Date(startDateFilter)) return false;
        }
      }

      // 7. End Date Filter (Data Fim)
      if (endDateFilter) {
        if (expense.isInstallment && expense.installmentStartMonth) {
          const [sYear, sMonth] = expense.installmentStartMonth.split("-").map(Number);
          const startInstallmentDate = new Date(sYear, sMonth - 1, 1);
          if (startInstallmentDate > new Date(endDateFilter)) return false;
        } else {
          if (new Date(expense.dueDate) > new Date(endDateFilter)) return false;
        }
      }

      // 8. Status Filter
      if (statusFilter === "active" && !expense.isActive) return false;
      if (statusFilter === "inactive" && expense.isActive) return false;

      return true;
    });
  }, [
    state.userPlan.expenses,
    searchQuery,
    categoryFilter,
    scheduleTypeFilter,
    paymentMethodFilter,
    cardAccountFilter,
    startDateFilter,
    endDateFilter,
    statusFilter,
    creditCards,
  ]);

  // ── List Sorting & Pagination ────────────────────────────────────────
  const sortedExpenses = useMemo(
    () => sortExpenses(filteredExpenses, sortBy),
    [filteredExpenses, sortBy]
  );

  const totalFilteredCount = sortedExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFilteredCount);

  const paginatedExpenses = useMemo(() => {
    return sortedExpenses.slice(startIndex, endIndex);
  }, [sortedExpenses, startIndex, endIndex]);

  const paginatedGrouped = useMemo(() => {
    if (groupBy === ExpenseGroupBy.NONE) return [];
    return groupExpenses(paginatedExpenses, groupBy);
  }, [paginatedExpenses, groupBy]);

  const effectiveLastInsertedId = useMemo(() => {
    if (
      lastInsertedExpenseId &&
      state.userPlan.expenses.some((e) => e.id === lastInsertedExpenseId)
    ) {
      return lastInsertedExpenseId;
    }
    if (state.userPlan.expenses.length === 0) return null;
    const sortedByCreated = [...state.userPlan.expenses].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return sortedByCreated[0]?.id || null;
  }, [lastInsertedExpenseId, state.userPlan.expenses]);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const currentInvoiceMonthKey = useMemo(() => {
    return calculateCreditCardBillingMonth(
      activeCards[0]?.id || CreditCardAccount.INTER,
      new Date(),
      creditCards
    );
  }, [activeCards, creditCards]);

  const currentInvoiceExpenses = useMemo(() => {
    const [invYear, invMonth] = currentInvoiceMonthKey.split("-").map(Number);
    const targetDate = new Date(invYear, invMonth - 1, 1);

    return state.userPlan.expenses.filter((expense) => {
      if (!expense.isActive) return false;
      if (expense.paymentMethod !== PaymentMethod.CREDIT_CARD) return false;
      const amountInMonth = calculateMonthlyAmountLocal(expense, targetDate);
      return amountInMonth > 0;
    });
  }, [state.userPlan.expenses, currentInvoiceMonthKey]);

  const totalCurrentInvoiceAmount = useMemo(() => {
    const [invYear, invMonth] = currentInvoiceMonthKey.split("-").map(Number);
    const targetDate = new Date(invYear, invMonth - 1, 1);

    return currentInvoiceExpenses.reduce((sum, exp) => {
      return sum + calculateMonthlyAmountLocal(exp, targetDate);
    }, 0);
  }, [currentInvoiceExpenses, currentInvoiceMonthKey]);

  // ── Calendar View 12-Month Engine ────────────────────────────────────
  const monthlyData = useMemo(() => {
    const startOfYear = new Date(calendarYear, 0, 1);
    return aggregateExpensesByMonth(filteredExpenses, startOfYear, 12);
  }, [filteredExpenses, calendarYear]);

  const annualCalendarSummary = useMemo(() => {
    const totalAnnual = monthlyData.reduce((sum, m) => sum + m.totalAmount, 0);
    const totalCardsAnnual = monthlyData.reduce((sum, m) => {
      const [y, mon] = m.month.split("-").map(Number);
      const targetDate = new Date(y, mon - 1, 1);
      const monthCardsTotal = m.expenses
        .filter((e) => e.paymentMethod === PaymentMethod.CREDIT_CARD)
        .reduce((s, e) => s + calculateMonthlyAmountLocal(e, targetDate), 0);
      return sum + monthCardsTotal;
    }, 0);

    return {
      totalAnnual,
      totalCardsAnnual,
      monthlyAvg: totalAnnual / 12,
    };
  }, [monthlyData]);

  const totalMonthlyExpenses = state.userPlan.expenses
    .filter((expense) => expense.isActive)
    .reduce(
      (total, expense) => total + calculateMonthlyAmountLocal(expense),
      0
    );

  const recurringExpenses = state.userPlan.expenses.filter(
    (expense) => expense.recurring && expense.isActive
  );

  const getLocalizedGroupHeaderLabel = (
    key: string,
    currentGroupBy: ExpenseGroupBy,
    fallbackLabel: string
  ) => {
    if (language !== "pt") return fallbackLabel;

    switch (currentGroupBy) {
      case ExpenseGroupBy.CATEGORY:
        return getCategoryLabel(key as ExpenseCategory);
      case ExpenseGroupBy.TYPE:
        if (key === "one_time") return "Despesas Únicas";
        if (key === "recurring") return "Despesas Recorrentes";
        if (key === "installment") return "Despesas Parceladas";
        return fallbackLabel;
      case ExpenseGroupBy.PRIORITY:
        if (key === Priority.LOW) return "Prioridade Baixa";
        if (key === Priority.MEDIUM) return "Prioridade Média";
        if (key === Priority.HIGH) return "Prioridade Alta";
        if (key === Priority.CRITICAL) return "Prioridade Crítica";
        return fallbackLabel;
      case ExpenseGroupBy.MONTH: {
        const formatted = formatLocalizedMonth(key, "pt", {
          month: "long",
          year: "numeric",
        });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
      }
      default:
        return fallbackLabel;
    }
  };

  const renderExpenseRow = (expense: Expense) => {
    const isEditing = editingExpense === expense.id;
    const isLastInserted = expense.id === effectiveLastInsertedId;
    const monthlyEq = calculateMonthlyAmountLocal(expense, new Date());
    const paymentBadge = getPaymentMethodBadge(expense.paymentMethod, language);
    const cardBadge = getCreditCardAccountBadge(expense.creditCardAccount, creditCards);
    const currentInstallmentProgress =
      expense.isInstallment && getInstallmentProgressDisplay(expense, new Date());

    return (
      <div
        key={expense.id}
        className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isEditing
            ? "bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/50"
            : isLastInserted
            ? "bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ExpenseCategoryIcon category={expense.category} className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {expense.name}
              </h3>
              {isLastInserted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 flex items-center gap-1 shadow-xs animate-in fade-in duration-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {language === "pt" ? "Última Inserção" : "Latest Added"}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                {getCategoryLabel(expense.category)}
              </span>
              {expense.recurring && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  {language === "pt" ? "Recorrente" : "Recurring"}
                </span>
              )}
              {expense.isInstallment && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                  {expense.installmentMonths
                    ? `${expense.installmentMonths}x Parcelas`
                    : language === "pt"
                    ? "Parcelado"
                    : "Installments"}
                </span>
              )}
              {currentInstallmentProgress && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  {currentInstallmentProgress}
                </span>
              )}
              {!expense.isActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {language === "pt" ? "Inativo" : "Inactive"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span>{language === "pt" ? "Método:" : "Method:"}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${paymentBadge.className}`}>
                  {paymentBadge.label}
                </span>
              </div>
              {cardBadge && (
                <div className="flex items-center gap-1.5">
                  <span>{language === "pt" ? "Cartão:" : "Card:"}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${cardBadge.className}`}
                    style={cardBadge.style || {}}
                  >
                    {cardBadge.label}
                  </span>
                </div>
              )}
              {expense.dueDate && (
                <span className="text-slate-600 dark:text-slate-400">
                  {language === "pt" ? "Vencimento:" : "Due Date:"}{" "}
                  <strong className="text-slate-700 dark:text-slate-300 font-medium">
                    {formatLocalizedDate(expense.dueDate, language)}
                  </strong>
                </span>
              )}
            </div>

            {expense.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {expense.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-12 sm:pl-0">
          <div className="text-right">
            <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(expense.amount)}
            </div>
            <div className="text-[11px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(monthlyEq)} {language === "pt" ? "/ mês" : "/ mo"}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEdit(expense)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === "pt" ? "Editar despesa" : "Edit expense"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(expense.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === "pt" ? "Excluir despesa" : "Delete expense"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Executive Header Banner ──────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>{t("expenses.pageTitle")}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
              {state.userPlan.expenses.filter((e) => e.isActive).length} {language === "pt" ? "Saídas Ativas" : "Active Expenses"}
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("expenses.pageSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-right">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t("expenses.totalMonthly")}
            </div>
            <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(totalMonthlyExpenses)}
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400">
              {recurringExpenses.length} {language === "pt" ? "obrigações recorrentes" : "recurring items"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-right">
            <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center justify-end gap-1">
              <span>💳</span>
              <span>{t("expenses.totalInvoice", { defaultValue: "Fatura Atual (Cartão)" })}</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400 mt-0.5">
              {formatCurrency(totalCurrentInvoiceAmount)}
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400">
              {currentInvoiceExpenses.length} {language === "pt" ? "itens na fatura aberta" : "open statement items"} ({formatLocalizedMonth(currentInvoiceMonthKey, language, { month: "short", year: "2-digit" })})
            </div>
          </div>

          <button
            onClick={() => {
              setEditingExpense(null);
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
              setIsAddFormOpen(!isAddFormOpen);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("expenses.addButton")}</span>
          </button>
        </div>
      </div>

      {/* ── View Mode & High-Level Controls Toolbar ─────────────────── */}
      <div className="surface-card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {language === "pt" ? "Lista Ledger" : "List Ledger"}
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {language === "pt" ? "Calendário (12M)" : "12M Calendar"}
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("expenses.filters.search")}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFiltersCount > 0
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>{t("expenses.filters.title")}</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${isAdvancedFiltersOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              {t("expenses.filters.clear")}
            </button>
          )}
        </div>

        {/* List View Sorting & Grouping */}
        {viewMode === "list" && (
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ExpenseSortBy)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {Object.values(ExpenseSortBy).map((option) => (
                <option key={option} value={option}>
                  {getLocalizedSortByLabel(option, language)}
                </option>
              ))}
            </select>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as ExpenseGroupBy)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {Object.values(ExpenseGroupBy).map((option) => (
                <option key={option} value={option}>
                  {getLocalizedGroupByLabel(option, language)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Collapsible Advanced Filters Drawer ───────────────────────── */}
      {isAdvancedFiltersOpen && (
        <div className="surface-card p-5 border border-indigo-200/80 dark:border-indigo-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.form.category")}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "all")}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">{t("expenses.controls.filter.all")}</option>
                {Object.values(ExpenseCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Type (Única, Recorrente, Parcelada) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.type")}
              </label>
              <select
                value={scheduleTypeFilter}
                onChange={(e) => setScheduleTypeFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">{t("expenses.filters.type.all")}</option>
                <option value="one_time">{t("expenses.filters.type.oneTime")}</option>
                <option value="recurring">{t("expenses.filters.type.recurring")}</option>
                <option value="installment">{t("expenses.filters.type.installment")}</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.paymentMethod")}
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => {
                  const val = e.target.value as PaymentMethod | "all";
                  setPaymentMethodFilter(val);
                  if (val !== PaymentMethod.CREDIT_CARD && val !== "all") {
                    setCardAccountFilter("all");
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">{t("expenses.filters.paymentMethod.all")}</option>
                {Object.values(PaymentMethod).map((method) => (
                  <option key={method} value={method}>
                    {t(`expenses.form.paymentMethod.${method}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Card Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.card")}
              </label>
              <select
                value={cardAccountFilter}
                onChange={(e) => setCardAccountFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">{t("expenses.filters.card.all")}</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} (Fecha {card.closingDay} / Vence {card.dueDay})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.startDate")}
              </label>
              <DatePicker
                value={startDateFilter}
                onChange={(val) => setStartDateFilter(val)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.endDate")}
              </label>
              <DatePicker
                value={endDateFilter}
                onChange={(val) => setEndDateFilter(val)}
              />
            </div>

            {/* Status (Ativo/Inativo) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("expenses.filters.status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">{t("expenses.filters.status.all")}</option>
                <option value="active">{t("expenses.filters.status.active")}</option>
                <option value="inactive">{t("expenses.filters.status.inactive")}</option>
              </select>
            </div>

            {/* Filter Summary Actions */}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-2 px-3 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t("expenses.filters.clear")}
              </button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t("expenses.filters.activeCount")}:
              </span>
              {categoryFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-[11px]">
                  <span>{getCategoryLabel(categoryFilter)}</span>
                  <button onClick={() => setCategoryFilter("all")} className="hover:font-bold">✕</button>
                </span>
              )}
              {scheduleTypeFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-[11px]">
                  <span>{t(`expenses.filters.type.${scheduleTypeFilter === "one_time" ? "oneTime" : scheduleTypeFilter}`)}</span>
                  <button onClick={() => setScheduleTypeFilter("all")} className="hover:font-bold">✕</button>
                </span>
              )}
              {paymentMethodFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 text-[11px]">
                  <span>{t(`expenses.form.paymentMethod.${paymentMethodFilter}`)}</span>
                  <button onClick={() => setPaymentMethodFilter("all")} className="hover:font-bold">✕</button>
                </span>
              )}
              {cardAccountFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 text-[11px]">
                  <span>Cartão: {creditCards.find((c) => c.id === cardAccountFilter)?.name || cardAccountFilter}</span>
                  <button onClick={() => setCardAccountFilter("all")} className="hover:font-bold">✕</button>
                </span>
              )}
              {startDateFilter && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 text-[11px]">
                  <span>De: {formatLocalizedDate(startDateFilter, language)}</span>
                  <button onClick={() => setStartDateFilter("")} className="hover:font-bold">✕</button>
                </span>
              )}
              {endDateFilter && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 text-[11px]">
                  <span>Até: {formatLocalizedDate(endDateFilter, language)}</span>
                  <button onClick={() => setEndDateFilter("")} className="hover:font-bold">✕</button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 text-[11px]">
                  <span>Status: {statusFilter === "active" ? (language === "pt" ? "Ativas" : "Active") : (language === "pt" ? "Inativas" : "Inactive")}</span>
                  <button onClick={() => setStatusFilter("all")} className="hover:font-bold">✕</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Form Panel ────────────────────────────────────── */}
      {isAddFormOpen && (
        <div
          ref={formRef}
          className="surface-card p-6 border-2 border-rose-300 dark:border-rose-700/80 bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-200 shadow-md"
        >
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {editingExpense ? t("expenses.form.editTitle") : t("expenses.form.addTitle")}
            </h3>
            <button
              onClick={handleCancel}
              className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {language === "pt" ? "Fechar" : "Close"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("expenses.form.name")} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder={t("expenses.form.placeholder.name")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus-visible:ring-2 focus-visible:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("expenses.form.amount")} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount || ""}
                onChange={(e) =>
                  handleInputChange("amount", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus-visible:ring-2 focus-visible:ring-rose-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("expenses.form.category")}
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {Object.values(ExpenseCategory).map((category) => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Selector */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("expenses.form.paymentMethod")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(PaymentMethod).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handleInputChange("paymentMethod", method)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                      formData.paymentMethod === method
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t(`expenses.form.paymentMethod.${method}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Credit Card Account Selector */}
            {formData.paymentMethod === PaymentMethod.CREDIT_CARD && (
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("expenses.form.creditCardAccount")}
                    </label>
                    <Link
                      href="/cards"
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{language === "pt" ? "Configurar Cartões" : "Configure Cards"}</span>
                    </Link>
                  </div>

                  {activeCards.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      <p>{language === "pt" ? "Nenhum cartão cadastrado." : "No credit cards registered."}</p>
                      <Link
                        href="/cards"
                        className="inline-block mt-1 text-xs font-bold underline"
                      >
                        {language === "pt" ? "+ Cadastrar Cartão" : "+ Add Card"}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeCards.map((card) => {
                        const isSelected = formData.creditCardAccount === card.id;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleInputChange("creditCardAccount", card.id)}
                            className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: card.color || "#6366f1" }}
                            />
                            <span className="truncate">{card.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedCardInfo && (
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                        {language === "pt" ? "Fechamento: Dia " : "Closing: Day "}
                        {selectedCardInfo.closingDay}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                        {language === "pt" ? "Vencimento: Dia " : "Due: Day "}
                        {selectedCardInfo.dueDay}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "pt"
                      ? "Data da Compra (Calcula fechamento e vencimento)"
                      : "Purchase Date (Calculates closing/due date)"}
                  </label>
                  <DatePicker
                    value={purchaseDate}
                    onChange={(val) => handlePurchaseDateChange(val)}
                  />
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                    {language === "pt" ? "Vencimento da Fatura:" : "Statement Due Date:"}{" "}
                    <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                      {formatLocalizedDate(formData.dueDate, language)}
                    </strong>
                    {billingShiftText && (
                      <span className="block text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        ℹ️ {billingShiftText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Recurrence & Installments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === "pt" ? "Tipo de Despesa" : "Schedule Type"}
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("recurring", false);
                    handleInputChange("isInstallment", false);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    !formData.recurring && !formData.isInstallment
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {language === "pt" ? "Única" : "One-time"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("recurring", true);
                    handleInputChange("isInstallment", false);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    formData.recurring && !formData.isInstallment
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {language === "pt" ? "Recorrente" : "Recurring"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange("recurring", false);
                    handleInputChange("isInstallment", true);
                    if (!formData.installmentStartMonth) {
                      const defaultStartMonth =
                        formData.paymentMethod === PaymentMethod.CREDIT_CARD
                          ? calculateCreditCardBillingMonth(
                              formData.creditCardAccount || activeCards[0]?.id || CreditCardAccount.INTER,
                              new Date(purchaseDate),
                              creditCards
                            )
                          : new Date().toISOString().slice(0, 7);
                      handleInputChange("installmentStartMonth", defaultStartMonth);
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    formData.isInstallment
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {language === "pt" ? "Parcelada" : "Installments"}
                </button>
              </div>
            </div>

            {formData.isInstallment ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === "pt" ? "Número de Parcelas (Meses)" : "Installment Count (Months)"}
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={formData.installmentMonths || 2}
                    onChange={(e) => handleInputChange("installmentMonths", parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus-visible:ring-2 focus-visible:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === "pt" ? "Mês de Início" : "Start Month"}
                  </label>
                  <MonthPicker
                    value={formData.installmentStartMonth || (formData.paymentMethod === PaymentMethod.CREDIT_CARD ? calculateCreditCardBillingMonth(formData.creditCardAccount || activeCards[0]?.id || CreditCardAccount.INTER, new Date(purchaseDate), creditCards) : new Date().toISOString().slice(0, 7))}
                    onChange={(val) => handleInputChange("installmentStartMonth", val)}
                    closingDay={selectedCardInfo?.closingDay || 11}
                  />
                </div>
              </>
            ) : formData.recurring ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("expenses.form.frequency")}
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => handleInputChange("frequency", e.target.value as Frequency)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  {Object.values(Frequency).map((freq) => (
                    <option key={freq} value={freq}>
                      {getFrequencyLabel(freq)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("expenses.form.dueDate")}
                </label>
                <DatePicker
                  value={formData.dueDate}
                  onChange={(val) => handleInputChange("dueDate", val)}
                />
              </div>
            )}

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === "pt" ? "Descrição (Opcional)" : "Description"}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus-visible:ring-2 focus-visible:ring-rose-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder={language === "pt" ? "Detalhes adicionais..." : "Optional details..."}
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={state.loading.isLoadingExpenses}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── View Display (List vs Calendar) ─────────────────────────── */}
      {viewMode === "calendar" ? (
        <div className="space-y-4">
          {/* Calendar Year Navigation Toolbar */}
          <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCalendarYear((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>{calendarYear - 1}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {calendarYear}
                </span>
                {calendarYear === currentRealYear ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                    {language === "pt" ? "Ano Atual" : "Current Year"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCalendarYear(currentRealYear)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {language === "pt" ? `Ir para ${currentRealYear}` : `Go to ${currentRealYear}`}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCalendarYear((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{calendarYear + 1}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Annual KPIs for Selected Year */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">
                  {t("expenses.calendar.annualTotal")}:
                </span>
                <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(annualCalendarSummary.totalAnnual)}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60">
                <span className="text-[10px] text-purple-700 dark:text-purple-300 block uppercase font-medium">
                  {t("expenses.calendar.cardTotal")}:
                </span>
                <span className="font-bold tabular-nums text-purple-700 dark:text-purple-300">
                  {formatCurrency(annualCalendarSummary.totalCardsAnnual)}
                </span>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-medium">
                  {t("expenses.calendar.monthlyAvg")}:
                </span>
                <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  {formatCurrency(annualCalendarSummary.monthlyAvg)}
                </span>
              </div>
            </div>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {monthlyData.map((monthData) => {
              const isCurrentMonth = monthData.month === currentMonthKey;
              const isCurrentInvoice = monthData.month === currentInvoiceMonthKey;

              const [mYear, mMonth] = monthData.month.split("-").map(Number);
              const mDate = new Date(mYear, mMonth - 1, 1);
              const creditCardMonthTotal = monthData.expenses
                .filter((e) => e.paymentMethod === PaymentMethod.CREDIT_CARD)
                .reduce((sum, e) => sum + calculateMonthlyAmountLocal(e, mDate), 0);

              return (
                <div
                  key={monthData.month}
                  className={`surface-card p-4 flex flex-col justify-between transition-all duration-200 ${
                    isCurrentMonth && isCurrentInvoice
                      ? "ring-2 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-md"
                      : isCurrentMonth
                      ? "ring-2 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 shadow-md"
                      : isCurrentInvoice
                      ? "ring-2 ring-purple-500 dark:ring-purple-400 bg-purple-50/40 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 shadow-md"
                      : "border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <h3
                          className={`text-xs font-bold ${
                            isCurrentMonth
                              ? "text-indigo-700 dark:text-indigo-300"
                              : isCurrentInvoice
                              ? "text-purple-700 dark:text-purple-300"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {(() => {
                            const rawLabel = formatLocalizedMonth(monthData.month, language, {
                              month: "long",
                              year: "numeric",
                            });
                            return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
                          })()}
                        </h3>
                        {isCurrentMonth && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-indigo-600 text-white dark:bg-indigo-500 shadow-xs shrink-0">
                            {language === "pt" ? "Mês Atual" : "Current"}
                          </span>
                        )}
                        {isCurrentInvoice && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-purple-600 text-white dark:bg-purple-500 shadow-xs shrink-0 flex items-center gap-0.5">
                            <span>💳</span>
                            <span>{language === "pt" ? "Fatura Atual" : "Statement"}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums shrink-0 ${
                          isCurrentMonth
                            ? "text-indigo-600 dark:text-indigo-400"
                            : isCurrentInvoice
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(monthData.totalAmount)}
                      </span>
                    </div>

                    {creditCardMonthTotal > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 mb-2 font-medium">
                        <span className="flex items-center gap-1">
                          <span>💳</span>
                          <span>{t("expenses.cardBill")}</span>
                        </span>
                        <span className="font-bold tabular-nums">
                          {formatCurrency(creditCardMonthTotal)}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {monthData.expenses.length > 0 ? (
                        monthData.expenses.map((expense) => {
                          const installmentProgress = getInstallmentProgressDisplay(
                            expense,
                            new Date(monthData.month + "-01T12:00:00")
                          );
                          const isLastInserted = expense.id === effectiveLastInsertedId;

                          return (
                            <div
                              key={expense.id}
                              onClick={() => handleEdit(expense)}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isLastInserted
                                  ? "bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 hover:border-amber-500"
                                  : isCurrentMonth
                                  ? "bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-400 dark:hover:border-indigo-500"
                                  : isCurrentInvoice
                                  ? "bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-500"
                                  : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0 text-slate-500 dark:text-slate-400">
                                  <ExpenseCategoryIcon category={expense.category} className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                                  {expense.name}
                                </span>
                                {isLastInserted && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-400/60 shrink-0">
                                    ✨ {language === "pt" ? "Último" : "New"}
                                  </span>
                                )}
                                {installmentProgress && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                                    {installmentProgress}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100 shrink-0 text-[11px]">
                                {formatCurrency(
                                  calculateMonthlyAmountLocal(
                                    expense,
                                    new Date(monthData.month + "-01T00:00:00Z")
                                  )
                                )}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                          {t("expenses.noExpensesMonth")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-right font-medium">
                    {monthData.expenses.length}{" "}
                    {monthData.expenses.length === 1
                      ? language === "pt"
                        ? "item"
                        : "item"
                      : language === "pt"
                      ? "itens"
                      : "items"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List Ledger View ─────────────────────────────────────────── */
        <div className="surface-card overflow-hidden">
          {/* Header with counts and total */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{t("expenses.listTitle")}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {totalFilteredCount} {totalFilteredCount === 1 ? "item" : "itens"}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                    (filtrado de {state.userPlan.expenses.length})
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                Total: {formatCurrency(totalMonthlyExpenses)} {language === "pt" ? "/ mês" : "/ mo"}
              </span>

              {/* Page size dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{t("expenses.pagination.perPage")}:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* List Content */}
          {totalFilteredCount === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t("expenses.noExpenses")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                {activeFiltersCount > 0
                  ? language === "pt"
                    ? "Nenhuma despesa corresponde aos filtros selecionados. Tente limpar os filtros."
                    : "No expenses match the selected filters. Try clearing your filters."
                  : t("dashboard.startExpenseHelper")}
              </p>
              {activeFiltersCount > 0 ? (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {t("expenses.filters.clear")}
                </button>
              ) : (
                <button
                  onClick={() => setIsAddFormOpen(true)}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {t("expenses.addButton")}
                </button>
              )}
            </div>
          ) : groupBy !== ExpenseGroupBy.NONE ? (
            <div>
              {paginatedGrouped.map((group) => (
                <div key={group.key} className="border-b last:border-b-0 border-slate-200/70 dark:border-slate-800">
                  <div className="bg-slate-100/70 dark:bg-slate-800/70 px-5 py-2.5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 font-semibold text-xs text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{group.icon}</span>
                      <span className="font-bold">
                        {getLocalizedGroupHeaderLabel(group.key, groupBy, group.label)}
                      </span>
                      {groupBy === ExpenseGroupBy.MONTH && group.key === currentMonthKey && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-600 text-white dark:bg-indigo-500 shadow-xs">
                          {language === "pt" ? "Mês Atual" : "Current"}
                        </span>
                      )}
                      {groupBy === ExpenseGroupBy.MONTH && group.key === currentInvoiceMonthKey && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-600 text-white dark:bg-purple-500 shadow-xs flex items-center gap-0.5">
                          <span>💳</span>
                          <span>{language === "pt" ? "Fatura Atual" : "Statement"}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold">
                        {group.count}{" "}
                        {group.count === 1
                          ? language === "pt"
                            ? "item"
                            : "item"
                          : language === "pt"
                          ? "itens"
                          : "items"}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400 text-xs">
                      {formatCurrency(group.totalAmount)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.expenses.map((expense) => renderExpenseRow(expense))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedExpenses.map((expense) => renderExpenseRow(expense))}
            </div>
          )}

          {/* ── List Pagination Controls Bar ─────────────────────────── */}
          {totalFilteredCount > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
              <div className="text-slate-500 dark:text-slate-400">
                {t("expenses.pagination.showing")}{" "}
                <strong className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                  {startIndex + 1}
                </strong>{" "}
                {t("expenses.pagination.to")}{" "}
                <strong className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                  {endIndex}
                </strong>{" "}
                {t("expenses.pagination.of")}{" "}
                <strong className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                  {totalFilteredCount}
                </strong>{" "}
                {t("expenses.pagination.expenses")}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* First page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t("expenses.pagination.first")}
                  >
                    «
                  </button>

                  {/* Previous page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t("expenses.pagination.prev")}
                  >
                    ‹
                  </button>

                  {/* Dynamic Page Numbers Window */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxButtons = 5;
                    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
                    let endPage = startPage + maxButtons - 1;

                    if (endPage > totalPages) {
                      endPage = totalPages;
                      startPage = Math.max(1, endPage - maxButtons + 1);
                    }

                    if (startPage > 1) {
                      pages.push(1);
                      if (startPage > 2) pages.push("...");
                    }

                    for (let p = startPage; p <= endPage; p++) {
                      pages.push(p);
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) pages.push("...");
                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) => {
                      if (typeof p === "string") {
                        return (
                          <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-400">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = p === safeCurrentPage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  {/* Next page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t("expenses.pagination.next")}
                  >
                    ›
                  </button>

                  {/* Last page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title={t("expenses.pagination.last")}
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
