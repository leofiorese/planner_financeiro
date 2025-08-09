/**
 * Centralized Installment Calculator Utility
 *
 * This module provides unified functions for handling overlapping recurring installment cycle
 * calculations across the application. It serves as the single source of truth for complex
 * installment logic, improving maintainability and ensuring data consistency.
 */

import { Expense, Frequency } from "@/types";

/**
 * Detects if an expense involves overlapping installment cycles
 *
 * Overlapping cycles occur when:
 * - The expense is both recurring and an installment
 * - The installment period is longer than the recurring cycle period
 * - This causes multiple installment cycles to run simultaneously in some months
 *
 * @param expense - The expense to analyze
 * @returns true if the expense has overlapping installment cycles
 */
export function detectOverlappingCycles(expense: Expense): boolean {
  // Must be both recurring and installment to have overlapping cycles
  if (!expense.recurring || !expense.isInstallment) {
    return false;
  }

  // Must have required installment properties
  if (!expense.installmentMonths || !expense.installmentStartMonth) {
    return false;
  }

  // Currently we only handle weekly recurring with custom intervals
  if (
    expense.frequency !== Frequency.WEEKLY ||
    !expense.recurringWeeksInterval
  ) {
    return false;
  }

  // Calculate cycle length in months
  const cycleLength = Math.round(expense.recurringWeeksInterval / 4.33);

  // Overlapping occurs when installment period is longer than cycle period
  return expense.installmentMonths > cycleLength;
}

/**
 * Calculates and formats the installment progress display string
 *
 * For non-overlapping cycles: "X/Y" format
 * For overlapping cycles: "X/Y + A/B" format showing multiple concurrent installments
 *
 * @param expense - The expense to calculate progress for
 * @param month - The specific month to calculate progress for
 * @returns formatted progress string (e.g., "4/4 + 1/4") or null if not applicable
 */
export function getInstallmentProgressDisplay(
  expense: Expense,
  month: Date
): string | null {
  // Only applicable to installment expenses
  if (
    !expense.isInstallment ||
    !expense.installmentMonths ||
    !expense.installmentStartMonth
  ) {
    return null;
  }

  // Check if this expense has overlapping cycles
  if (detectOverlappingCycles(expense)) {
    return calculateOverlappingProgress(expense, month);
  } else {
    return calculateSimpleProgress(expense, month);
  }
}

/**
 * Calculates the monetary amount for an expense in a specific month,
 * accounting for overlapping cycle multipliers
 *
 * @param expense - The expense to calculate amount for
 * @param month - The specific month to calculate for
 * @returns the monetary amount for the given month
 */
export function calculateOverlappingAmount(
  expense: Expense,
  month: Date
): number {
  // For non-installment expenses, return 0 (should be handled elsewhere)
  if (!expense.isInstallment || !expense.installmentMonths) {
    return 0;
  }

  // Base installment amount per month
  const baseInstallmentAmount = expense.amount / expense.installmentMonths;

  // Check if this expense has overlapping cycles
  if (detectOverlappingCycles(expense)) {
    const multiplier = calculateCycleMultiplier(expense, month);
    return baseInstallmentAmount * multiplier;
  } else {
    return baseInstallmentAmount;
  }
}

/**
 * Calculate progress for simple (non-overlapping) installment expenses
 */
function calculateSimpleProgress(expense: Expense, month: Date): string {
  if (!expense.installmentStartMonth || !expense.installmentMonths) {
    return "0/0";
  }

  // For recurring installment expenses without overlapping
  if (expense.recurring && expense.frequency) {
    // Use the original due date as reference for the recurring cycle
    const expenseStartDate = new Date(expense.dueDate);
    const monthsSinceStart =
      (month.getFullYear() - expenseStartDate.getFullYear()) * 12 +
      (month.getMonth() - expenseStartDate.getMonth());

    if (
      expense.frequency === Frequency.WEEKLY &&
      expense.recurringWeeksInterval
    ) {
      const cycleLength = Math.round(expense.recurringWeeksInterval / 4.33);
      const monthsIntoCycle = monthsSinceStart % cycleLength;
      const currentMonth = Math.min(
        Math.max(monthsIntoCycle + 1, 1),
        expense.installmentMonths
      );
      return `${currentMonth}/${expense.installmentMonths}`;
    }
  }

  // For non-recurring installment expenses
  const startDate = new Date(
    expense.installmentStartMonth + "-01T00:00:00.000Z"
  );
  const currentMonthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const currentMonthUTC = new Date(
    Date.UTC(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 1)
  );

  const monthsDiff =
    (currentMonthUTC.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (currentMonthUTC.getUTCMonth() - startDate.getUTCMonth()) +
    1; // +1 because we start counting from 1

  const currentMonth = Math.min(
    Math.max(monthsDiff, 1),
    expense.installmentMonths
  );
  return `${currentMonth}/${expense.installmentMonths}`;
}

/**
 * Calculate progress for overlapping installment cycles
 */
function calculateOverlappingProgress(expense: Expense, month: Date): string {
  if (!expense.recurringWeeksInterval || !expense.installmentMonths) {
    return "0/0";
  }

  const expenseStartDate = new Date(expense.dueDate);
  const monthsSinceStart =
    (month.getFullYear() - expenseStartDate.getFullYear()) * 12 +
    (month.getMonth() - expenseStartDate.getMonth());

  const cycleLength = Math.round(expense.recurringWeeksInterval / 4.33);

  const progressParts = [];

  // Check for overlapping cycles when installment period > cycle length
  if (expense.installmentMonths > cycleLength && monthsSinceStart > 0) {
    // Calculate which cycle we're in
    const currentCycleNumber = Math.floor(monthsSinceStart / cycleLength);
    const monthsIntoCycle = monthsSinceStart % cycleLength;

    // Check if we're completing a previous cycle
    if (currentCycleNumber > 0) {
      const prevCycleStart = (currentCycleNumber - 1) * cycleLength;
      const monthsFromPrevCycleStart = monthsSinceStart - prevCycleStart;

      // If we're still within installment period of previous cycle
      if (monthsFromPrevCycleStart <= expense.installmentMonths) {
        progressParts.push(
          `${monthsFromPrevCycleStart + 1}/${expense.installmentMonths}`
        );
      }
    }

    // Check if we're starting a new cycle (when monthsIntoCycle === 0)
    if (monthsIntoCycle === 0 && currentCycleNumber > 0) {
      progressParts.push(`1/${expense.installmentMonths}`);
    }

    // If we found overlapping cycles, return combined progress
    if (progressParts.length > 1) {
      return progressParts.join(" + ");
    }
  }

  // Regular single cycle progress if no overlaps detected
  const monthsIntoCycle = monthsSinceStart % cycleLength;
  const currentMonth = Math.min(
    Math.max(monthsIntoCycle + 1, 1),
    expense.installmentMonths
  );
  return `${currentMonth}/${expense.installmentMonths}`;
}

/**
 * Calculate the cycle multiplier for overlapping installment expenses
 * This determines how many concurrent installment cycles are running in a given month
 */
function calculateCycleMultiplier(expense: Expense, month: Date): number {
  if (!expense.recurringWeeksInterval || !expense.installmentMonths) {
    return 1;
  }

  const expenseStartDate = new Date(expense.dueDate);
  const monthsSinceStart =
    (month.getFullYear() - expenseStartDate.getFullYear()) * 12 +
    (month.getMonth() - expenseStartDate.getMonth());

  const cycleLength = Math.round(expense.recurringWeeksInterval / 4.33);

  // Check for overlapping cycles when installment period > cycle length
  if (expense.installmentMonths > cycleLength && monthsSinceStart > 0) {
    const progressParts = [];

    // Calculate which cycle we're in
    const currentCycleNumber = Math.floor(monthsSinceStart / cycleLength);
    const monthsIntoCycle = monthsSinceStart % cycleLength;

    // Check if we're completing a previous cycle
    if (currentCycleNumber > 0) {
      const prevCycleStart = (currentCycleNumber - 1) * cycleLength;
      const monthsFromPrevCycleStart = monthsSinceStart - prevCycleStart;

      // If we're still within installment period of previous cycle
      if (monthsFromPrevCycleStart <= expense.installmentMonths) {
        progressParts.push(
          `${monthsFromPrevCycleStart + 1}/${expense.installmentMonths}`
        );
      }
    }

    // Check if we're starting a new cycle (when monthsIntoCycle === 0)
    if (monthsIntoCycle === 0 && currentCycleNumber > 0) {
      progressParts.push(`1/${expense.installmentMonths}`);
    }

    // Return the number of concurrent cycles (multiplier)
    if (progressParts.length > 1) {
      return progressParts.length;
    }
  }

  // Default to single cycle
  return 1;
}
