/**
 * Expense Operations Utilities
 *
 * Provides utility functions for expense categorization, sorting, grouping, and calendar operations.
 */

import { Expense, ExpenseCategory, Priority, Frequency } from "@/types";
import {
  calculateOverlappingAmount,
  detectOverlappingCycles,
} from "./installmentCalculator";

// =============================================================================
// EXPENSE TYPE CATEGORIZATION
// =============================================================================

/**
 * Computed expense types based on existing expense properties
 */
export enum ExpenseType {
  ONE_TIME = "one_time",
  RECURRING = "recurring",
  INSTALLMENT = "installment",
}

/**
 * Determines the expense type based on existing expense properties
 */
export function getExpenseType(expense: Expense): ExpenseType {
  if (expense.isInstallment) {
    return ExpenseType.INSTALLMENT;
  }
  if (expense.recurring) {
    return ExpenseType.RECURRING;
  }
  return ExpenseType.ONE_TIME;
}

/**
 * Gets a human-readable label for an expense type
 */
export function getExpenseTypeLabel(type: ExpenseType): string {
  switch (type) {
    case ExpenseType.ONE_TIME:
      return "One-time";
    case ExpenseType.RECURRING:
      return "Recurring";
    case ExpenseType.INSTALLMENT:
      return "Installment";
    default:
      return "Unknown";
  }
}

/**
 * Gets an icon for an expense type
 */
export function getExpenseTypeIcon(type: ExpenseType): string {
  switch (type) {
    case ExpenseType.ONE_TIME:
      return "📝";
    case ExpenseType.RECURRING:
      return "🔄";
    case ExpenseType.INSTALLMENT:
      return "📅";
    default:
      return "❓";
  }
}

// =============================================================================
// SORTING UTILITIES
// =============================================================================

/**
 * Available sorting options for expenses
 */
export enum ExpenseSortBy {
  DATE_ASC = "date_asc",
  DATE_DESC = "date_desc",
  AMOUNT_ASC = "amount_asc",
  AMOUNT_DESC = "amount_desc",
  NAME_ASC = "name_asc",
  NAME_DESC = "name_desc",
  PRIORITY_ASC = "priority_asc",
  PRIORITY_DESC = "priority_desc",
}

/**
 * Gets a human-readable label for a sort option
 */
export function getSortByLabel(sortBy: ExpenseSortBy): string {
  switch (sortBy) {
    case ExpenseSortBy.DATE_ASC:
      return "Date (Oldest First)";
    case ExpenseSortBy.DATE_DESC:
      return "Date (Newest First)";
    case ExpenseSortBy.AMOUNT_ASC:
      return "Amount (Low to High)";
    case ExpenseSortBy.AMOUNT_DESC:
      return "Amount (High to Low)";
    case ExpenseSortBy.NAME_ASC:
      return "Name (A to Z)";
    case ExpenseSortBy.NAME_DESC:
      return "Name (Z to A)";
    case ExpenseSortBy.PRIORITY_ASC:
      return "Priority (Low to High)";
    case ExpenseSortBy.PRIORITY_DESC:
      return "Priority (High to Low)";
    default:
      return "Unknown";
  }
}

/**
 * Priority order for sorting (used internally)
 */
const PRIORITY_ORDER = {
  [Priority.LOW]: 1,
  [Priority.MEDIUM]: 2,
  [Priority.HIGH]: 3,
  [Priority.CRITICAL]: 4,
};

/**
 * Sorts expenses based on the specified criteria
 */
export function sortExpenses(
  expenses: Expense[],
  sortBy: ExpenseSortBy
): Expense[] {
  const expensesCopy = [...expenses];

  switch (sortBy) {
    case ExpenseSortBy.DATE_ASC:
      return expensesCopy.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    case ExpenseSortBy.DATE_DESC:
      return expensesCopy.sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );

    case ExpenseSortBy.AMOUNT_ASC:
      return expensesCopy.sort((a, b) => a.amount - b.amount);

    case ExpenseSortBy.AMOUNT_DESC:
      return expensesCopy.sort((a, b) => b.amount - a.amount);

    case ExpenseSortBy.NAME_ASC:
      return expensesCopy.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

    case ExpenseSortBy.NAME_DESC:
      return expensesCopy.sort((a, b) =>
        b.name.toLowerCase().localeCompare(a.name.toLowerCase())
      );

    case ExpenseSortBy.PRIORITY_ASC:
      return expensesCopy.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );

    case ExpenseSortBy.PRIORITY_DESC:
      return expensesCopy.sort(
        (a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
      );

    default:
      return expensesCopy;
  }
}

// =============================================================================
// GROUPING UTILITIES
// =============================================================================

/**
 * Available grouping options for expenses
 */
export enum ExpenseGroupBy {
  NONE = "none",
  TYPE = "type",
  CATEGORY = "category",
  PRIORITY = "priority",
  MONTH = "month",
}

/**
 * Gets a human-readable label for a grouping option
 */
export function getGroupByLabel(groupBy: ExpenseGroupBy): string {
  switch (groupBy) {
    case ExpenseGroupBy.NONE:
      return "No Grouping";
    case ExpenseGroupBy.TYPE:
      return "By Expense Type";
    case ExpenseGroupBy.CATEGORY:
      return "By Category";
    case ExpenseGroupBy.PRIORITY:
      return "By Priority";
    case ExpenseGroupBy.MONTH:
      return "By Month";
    default:
      return "Unknown";
  }
}

/**
 * Interface for grouped expenses
 */
export interface ExpenseGroup {
  key: string;
  label: string;
  icon: string;
  expenses: Expense[];
  totalAmount: number;
  count: number;
}

/**
 * Groups expenses based on the specified criteria
 */
export function groupExpenses(
  expenses: Expense[],
  groupBy: ExpenseGroupBy
): ExpenseGroup[] {
  if (groupBy === ExpenseGroupBy.NONE) {
    return [
      {
        key: "all",
        label: "All Expenses",
        icon: "📋",
        expenses,
        totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
        count: expenses.length,
      },
    ];
  }

  const groups = new Map<string, Expense[]>();

  expenses.forEach((expense) => {
    let groupKey: string;

    switch (groupBy) {
      case ExpenseGroupBy.TYPE:
        groupKey = getExpenseType(expense);
        break;

      case ExpenseGroupBy.CATEGORY:
        groupKey = expense.category;
        break;

      case ExpenseGroupBy.PRIORITY:
        groupKey = expense.priority;
        break;

      case ExpenseGroupBy.MONTH:
        const date = new Date(expense.dueDate);
        groupKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
        break;

      default:
        groupKey = "unknown";
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(expense);
  });

  return Array.from(groups.entries())
    .map(([key, groupExpenses]) => {
      let label: string;
      let icon: string;

      switch (groupBy) {
        case ExpenseGroupBy.TYPE:
          label = getExpenseTypeLabel(key as ExpenseType);
          icon = getExpenseTypeIcon(key as ExpenseType);
          break;

        case ExpenseGroupBy.CATEGORY:
          label = getCategoryLabel(key as ExpenseCategory);
          icon = getCategoryIcon(key as ExpenseCategory);
          break;

        case ExpenseGroupBy.PRIORITY:
          label = key.charAt(0).toUpperCase() + key.slice(1);
          icon = getPriorityIcon(key as Priority);
          break;

        case ExpenseGroupBy.MONTH:
          const [year, month] = key.split("-");
          const date = new Date(parseInt(year), parseInt(month) - 1);
          label = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });
          icon = "📅";
          break;

        default:
          label = key;
          icon = "❓";
      }

      return {
        key,
        label,
        icon,
        expenses: groupExpenses,
        totalAmount: groupExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        count: groupExpenses.length,
      };
    })
    .sort((a, b) => {
      // Sort groups by label for consistent ordering
      return a.label.localeCompare(b.label);
    });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets category label (same as in expenses page)
 */
function getCategoryLabel(category: ExpenseCategory): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Gets category icon (same as in expenses page)
 */
function getCategoryIcon(category: ExpenseCategory): string {
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
}

/**
 * Gets priority icon
 */
function getPriorityIcon(priority: Priority): string {
  switch (priority) {
    case Priority.LOW:
      return "🟢";
    case Priority.MEDIUM:
      return "🟡";
    case Priority.HIGH:
      return "🟠";
    case Priority.CRITICAL:
      return "🔴";
    default:
      return "⚪";
  }
}

// =============================================================================
// MONTHLY CALENDAR UTILITIES
// =============================================================================

/**
 * Interface for monthly expense data
 */
export interface MonthlyExpenseData {
  month: string; // YYYY-MM format
  monthLabel: string; // e.g., "January 2024"
  expenses: Expense[];
  totalAmount: number;
  expenseTypeBreakdown: {
    oneTime: { count: number; amount: number };
    recurring: { count: number; amount: number };
    installment: { count: number; amount: number };
  };
}

/**
 * Aggregates expenses by month for calendar view
 * Properly handles recurring and installment expenses across multiple months
 */
export function aggregateExpensesByMonth(
  expenses: Expense[],
  startDate?: Date,
  monthsToShow: number = 12
): MonthlyExpenseData[] {
  const start = startDate || new Date();
  const months: MonthlyExpenseData[] = [];

  for (let i = 0; i < monthsToShow; i++) {
    const currentDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const monthKey = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthLabel = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    // Get expenses applicable to this month
    const monthExpenses = getExpensesForMonth(expenses, currentDate);

    // Calculate breakdown by expense type
    const breakdown = {
      oneTime: { count: 0, amount: 0 },
      recurring: { count: 0, amount: 0 },
      installment: { count: 0, amount: 0 },
    };

    monthExpenses.forEach((expense) => {
      const type = getExpenseType(expense);
      const monthlyAmount = calculateMonthlyAmount(expense, currentDate);

      switch (type) {
        case ExpenseType.ONE_TIME:
          breakdown.oneTime.count++;
          breakdown.oneTime.amount += monthlyAmount;
          break;
        case ExpenseType.RECURRING:
          breakdown.recurring.count++;
          breakdown.recurring.amount += monthlyAmount;
          break;
        case ExpenseType.INSTALLMENT:
          breakdown.installment.count++;
          breakdown.installment.amount += monthlyAmount;
          break;
      }
    });

    months.push({
      month: monthKey,
      monthLabel,
      expenses: monthExpenses,
      totalAmount: monthExpenses.reduce(
        (sum, exp) => sum + calculateMonthlyAmount(exp),
        0
      ),
      expenseTypeBreakdown: breakdown,
    });
  }

  return months;
}

/**
 * Helper function to get expenses that apply to a specific month
 * Handles recurring and installment expenses properly
 */
function getExpensesForMonth(
  expenses: Expense[],
  targetMonth: Date
): Expense[] {
  const targetYear = targetMonth.getFullYear();
  const targetMonthIndex = targetMonth.getMonth();

  return expenses.filter((expense) => {
    if (!expense.isActive) return false;

    const expenseDate = new Date(expense.dueDate);
    const expenseYear = expenseDate.getFullYear();
    const expenseMonthIndex = expenseDate.getMonth();

    // For installment-only expenses (not recurring)
    if (
      expense.isInstallment &&
      expense.installmentStartMonth &&
      expense.installmentMonths &&
      (!expense.recurring || !expense.frequency)
    ) {
      // Parse installment start month (YYYY-MM format)
      const [startYear, startMonth] = expense.installmentStartMonth.split("-");
      const startDate = new Date(
        parseInt(startYear),
        parseInt(startMonth) - 1,
        1
      );
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + expense.installmentMonths - 1);

      // Compare year and month only (ignore day)
      const targetYearMonth = targetYear * 12 + targetMonthIndex;
      const startYearMonth =
        startDate.getFullYear() * 12 + startDate.getMonth();
      const endYearMonth = endDate.getFullYear() * 12 + endDate.getMonth();

      return (
        targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth
      );
    }

    // For recurring installment expenses, we need special handling
    if (
      expense.recurring &&
      expense.frequency &&
      expense.isInstallment &&
      expense.installmentStartMonth &&
      expense.installmentMonths
    ) {
      // Parse installment start month (YYYY-MM format)
      const [startYear, startMonth] = expense.installmentStartMonth.split("-");
      const startDate = new Date(
        parseInt(startYear),
        parseInt(startMonth) - 1,
        1
      );
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + expense.installmentMonths - 1);

      // Compare year and month only (ignore day)
      const targetYearMonth = targetYear * 12 + targetMonthIndex;
      const startYearMonth =
        startDate.getFullYear() * 12 + startDate.getMonth();
      const endYearMonth = endDate.getFullYear() * 12 + endDate.getMonth();

      const isInInstallmentPeriod =
        targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth;

      // IGNORE the original installment period logic
      // For recurring installments, we need to calculate recurring cycles

      // Use the original due date as reference for the recurring cycle
      const expenseStartDate = new Date(expense.dueDate);
      const expenseStartMonth = new Date(
        expenseStartDate.getFullYear(),
        expenseStartDate.getMonth(),
        1
      );

      if (targetMonth.getTime() < expenseStartMonth.getTime()) {
        return false; // Before the expense starts
      }

      // NEW LOGIC: Each recurring cycle creates a new installment period
      if (
        expense.frequency === Frequency.WEEKLY &&
        expense.recurringWeeksInterval &&
        expense.recurringWeeksInterval > 1
      ) {
        // Calculate total months since the expense started
        const monthsSinceStart =
          (targetYear - expenseStartDate.getFullYear()) * 12 +
          (targetMonthIndex - expenseStartDate.getMonth());

        // Convert the recurring interval from weeks to approximate months
        const cycleLength = Math.round(expense.recurringWeeksInterval / 4.33); // weeks to months

        // Calculate which cycle we're in and position within cycle
        const cycleNumber = Math.floor(monthsSinceStart / cycleLength);
        const monthsIntoCycle = monthsSinceStart % cycleLength;

        // Show if we're within the first installmentMonths of this cycle
        return monthsIntoCycle < expense.installmentMonths;
      }

      // For other frequencies, similar logic would apply
      return false;
    }

    // For regular recurring expenses (no installments)
    if (expense.recurring && expense.frequency) {
      // Recurring expenses should appear if:
      // 1. The target month is after or equal to the expense start date
      // 2. The frequency pattern matches this month

      if (
        targetYear < expenseYear ||
        (targetYear === expenseYear && targetMonthIndex < expenseMonthIndex)
      ) {
        return false; // Before the expense starts
      }

      switch (expense.frequency) {
        case Frequency.MONTHLY:
          return true; // Every month after start date

        case Frequency.QUARTERLY:
          const monthsSinceStart =
            (targetYear - expenseYear) * 12 +
            (targetMonthIndex - expenseMonthIndex);
          return monthsSinceStart % 3 === 0;

        case Frequency.YEARLY:
          return targetMonthIndex === expenseMonthIndex;

        case Frequency.WEEKLY:
          // Handle custom weekly intervals
          if (
            expense.recurringWeeksInterval &&
            expense.recurringWeeksInterval > 1
          ) {
            // Use UTC dates to avoid timezone issues - same logic as calculateMonthlyAmount
            const expenseStartDate = new Date(expense.dueDate);
            const expenseYear = expenseStartDate.getFullYear();
            const expenseMonthIndex = expenseStartDate.getMonth();
            const targetYear = targetMonth.getFullYear();
            const targetMonthIndex = targetMonth.getMonth();

            // Create UTC dates for consistent calculation across timezones
            const startDateUTC = new Date(
              Date.UTC(expenseYear, expenseMonthIndex, 1)
            );
            const targetDateUTC = new Date(
              Date.UTC(targetYear, targetMonthIndex, 1)
            );

            // Calculate difference in milliseconds and convert to weeks
            const timeDiffMs = targetDateUTC.getTime() - startDateUTC.getTime();
            const weeksDiff = Math.floor(
              timeDiffMs / (7 * 24 * 60 * 60 * 1000)
            );

            // Check if this month aligns with the X-week cycle
            // Since months aren't exactly equal weeks, we need to check if this month
            // is within the first month of a new cycle (12-week intervals)
            const cycleNumber = Math.floor(
              weeksDiff / expense.recurringWeeksInterval
            );
            const weeksSinceLastCycle =
              weeksDiff - cycleNumber * expense.recurringWeeksInterval;

            // Consider it a recurring month if we're within the first 4 weeks of a cycle
            // (allowing for monthly boundaries that don't align perfectly with weeks)
            const isRecurringMonth = weeksDiff >= 0 && weeksSinceLastCycle <= 3;

            return isRecurringMonth;
          }
          return true; // Default weekly behavior

        case Frequency.BIWEEKLY:
        case Frequency.DAILY:
          return true; // These occur frequently enough to show every month

        default:
          return true;
      }
    }

    // For one-time expenses, check exact month match
    return expenseYear === targetYear && expenseMonthIndex === targetMonthIndex;
  });
}

/**
 * Calculates monthly equivalent amount for an expense (same logic as expenses page)
 */
export function calculateMonthlyAmount(
  expense: Expense,
  targetMonth?: Date
): number {
  // Handle installment expenses using centralized logic
  if (expense.isInstallment && expense.installmentMonths) {
    // For recurring installment expenses, check if we're past the installment period
    if (
      expense.recurring &&
      expense.frequency &&
      targetMonth &&
      expense.installmentStartMonth
    ) {
      const [startYear, startMonth] = expense.installmentStartMonth.split("-");
      const startDate = new Date(
        parseInt(startYear),
        parseInt(startMonth) - 1,
        1
      );
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + expense.installmentMonths - 1);

      const targetYear = targetMonth.getFullYear();
      const targetMonthIndex = targetMonth.getMonth();
      const targetYearMonth = targetYear * 12 + targetMonthIndex;
      const endYearMonth = endDate.getFullYear() * 12 + endDate.getMonth();

      // For recurring installments, we never use the "full amount for recurring calculation"
      // Instead, each recurring cycle has its own installment period
      // Use centralized calculation for overlapping cycles
      if (detectOverlappingCycles(expense)) {
        return calculateOverlappingAmount(expense, targetMonth);
      } else {
        return expense.amount / expense.installmentMonths;
      }
    } else {
      // Regular installment (not recurring) or no target month provided
      // Use centralized calculation if it detects overlapping cycles
      if (targetMonth && detectOverlappingCycles(expense)) {
        return calculateOverlappingAmount(expense, targetMonth);
      } else {
        return expense.amount / expense.installmentMonths;
      }
    }
  }

  // Handle one-time expenses (not recurring)
  if (!expense.recurring) {
    return expense.amount; // Show full amount for one-time expenses
  }

  if (!expense.frequency) return expense.amount;

  switch (expense.frequency) {
    case Frequency.DAILY:
      return expense.amount * 30.44;
    case Frequency.WEEKLY:
      // Handle custom weekly intervals
      if (
        expense.recurringWeeksInterval &&
        expense.recurringWeeksInterval > 1
      ) {
        // If we have a target month, check if the expense occurs in that month
        if (targetMonth) {
          // Use the same logic as getExpensesForMonth for custom weekly intervals
          const expenseDate = new Date(expense.dueDate);
          const expenseYear = expenseDate.getFullYear();
          const expenseMonthIndex = expenseDate.getMonth();
          const targetYear = targetMonth.getFullYear();
          const targetMonthIndex = targetMonth.getMonth();

          // Check if target month is before expense starts
          if (
            targetYear < expenseYear ||
            (targetYear === expenseYear && targetMonthIndex < expenseMonthIndex)
          ) {
            return 0; // Before the expense starts
          }

          // Use UTC dates to avoid timezone issues - best practice for date calculations
          // Create UTC dates for consistent calculation across timezones
          const startDateUTC = new Date(
            Date.UTC(expenseYear, expenseMonthIndex, 1)
          );
          const targetDateUTC = new Date(
            Date.UTC(targetYear, targetMonthIndex, 1)
          );

          // Calculate difference in milliseconds and convert to weeks
          const timeDiffMs = targetDateUTC.getTime() - startDateUTC.getTime();
          const weeksDiff = Math.floor(timeDiffMs / (7 * 24 * 60 * 60 * 1000));

          // Check if this month aligns with the X-week cycle
          // Since months aren't exactly equal weeks, we need to check if this month
          // is within the first month of a new cycle (12-week intervals)
          const cycleNumber = Math.floor(
            weeksDiff / expense.recurringWeeksInterval
          );
          const weeksSinceLastCycle =
            weeksDiff - cycleNumber * expense.recurringWeeksInterval;

          // Consider it a recurring month if we're within the first 4 weeks of a cycle

          const isRecurringMonth = weeksDiff >= 0 && weeksSinceLastCycle <= 3;

          return isRecurringMonth ? expense.amount : 0;
        } else {
          // No target month provided, calculate average monthly amount
          const weeksPerMonth = 4.33;
          const occurrencesPerMonth =
            weeksPerMonth / expense.recurringWeeksInterval;
          return expense.amount * occurrencesPerMonth;
        }
      }
      return expense.amount * 4.33; // Default weekly (every week)
    case Frequency.BIWEEKLY:
      return expense.amount * 2.17;
    case Frequency.MONTHLY:
      return expense.amount;
    case Frequency.QUARTERLY:
      return expense.amount / 3;
    case Frequency.YEARLY:
      return expense.amount / 12;
    case Frequency.ONE_TIME:
      return expense.amount; // Show full amount for one-time expenses
    default:
      return expense.amount;
  }
}
