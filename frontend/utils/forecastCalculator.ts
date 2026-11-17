/**
 * Financial Forecast Calculator
 *
 * This utility calculates financial projections based on current income, expenses, and goals.
 * It generates month-by-month forecasts considering recurring transactions and goal contributions.
 */

import {
  Income,
  Expense,
  Goal,
  Frequency,
  Forecast,
  UserPlan,
  Priority,
  GoalType,
} from "@/types";
import {
  calculateMonthlyAmount as calculateExpenseMonthlyAmount,
  getExpensesForMonth,
} from "./expenseOperations";
import {
  calculateOverlappingAmount,
  detectOverlappingCycles,
  getInstallmentProgressDisplay,
} from "./installmentCalculator";

/**
 * Configuration for forecast calculation
 */
export interface ForecastConfig {
  /** Number of months to project (default: 12) */
  months: number;
  /** Starting balance (default: 0) */
  startingBalance: number;
  /** Starting date for projection (default: current date) */
  startDate?: Date;
  /** Whether to include goal contributions in projections */
  includeGoalContributions: boolean;
  /** Conservative mode reduces income by 10% and increases expenses by 10% */
  conservativeMode: boolean;
}

/**
 * Detailed monthly forecast data
 */
export interface MonthlyForecast {
  /** Month identifier (YYYY-MM) */
  month: string;
  /** Starting balance for the month */
  startingBalance: number;
  /** Total income for the month */
  income: number;
  /** Total expenses for the month */
  expenses: number;
  /** Goal contributions for the month */
  goalContributions: number;
  /** Net change (income - expenses - goal contributions) */
  netChange: number;
  /** Ending balance for the month */
  endingBalance: number;
  /** Breakdown by income sources */
  incomeBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  /** Breakdown by expense categories */
  expenseBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
    installmentInfo?: {
      currentMonth: number;
      totalMonths: number;
      isInstallment: boolean;
    };
  }>;
  /** Breakdown by goal contributions */
  goalBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
}

/**
 * Complete forecast result
 */
export interface ForecastResult {
  /** Monthly forecasts */
  monthlyForecasts: MonthlyForecast[];
  /** Summary statistics */
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalGoalContributions: number;
    finalBalance: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    averageMonthlyNet: number;
    lowestBalance: number;
    highestBalance: number;
    monthsWithNegativeBalance: number;
  };
  /** Goal progress projections */
  goalProgress: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    projectedAmount: number;
    projectedProgress: number;
    estimatedCompletionMonth?: string;
    onTrack: boolean;
    goalType: GoalType;
    averageMonthlyAllocation: number;
  }>;
}

/**
 * Convert frequency to monthly multiplier
 */
export function getMonthlyMultiplier(frequency: Frequency): number {
  switch (frequency) {
    case Frequency.DAILY:
      return 30.44; // Average days per month
    case Frequency.WEEKLY:
      return 4.33; // Average weeks per month
    case Frequency.BIWEEKLY:
      return 2.17; // Average bi-weeks per month
    case Frequency.MONTHLY:
      return 1;
    case Frequency.QUARTERLY:
      return 1 / 3;
    case Frequency.YEARLY:
      return 1 / 12;
    case Frequency.ONE_TIME:
      return 0; // Handled separately
    default:
      return 1;
  }
}

/**
 * Calculate monthly amount from frequency
 */
export function calculateMonthlyAmount(
  amount: number,
  frequency: Frequency
): number {
  // Handle one-time income/expense separately since they use the full amount
  if (frequency === Frequency.ONE_TIME) {
    return amount;
  }
  return amount * getMonthlyMultiplier(frequency);
}

/**
 * Check if an income is active for a given month
 */
export function isIncomeActiveInMonth(
  income: Income,
  monthDate: Date
): boolean {
  // Check if the income is active
  if (!income.isActive) return false;

  const startDate = new Date(income.startDate);
  const endDate = income.endDate ? new Date(income.endDate) : null;

  // For one-time income, only active in the specific month of the start date
  if (income.frequency === Frequency.ONE_TIME) {
    const incomeMonth = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );
    const forecastMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    return incomeMonth.getTime() === forecastMonth.getTime();
  }

  // For recurring income, check if it's within the active period
  // Check if the month is after the start date
  if (monthDate < startDate) return false;

  // Check if the month is before the end date (if exists)
  if (endDate && monthDate > endDate) return false;

  return true;
}

/**
 * Check if an expense is active for a given month
 */
export function isExpenseActiveInMonth(
  expense: Expense,
  monthDate: Date
): boolean {
  // Check if the expense is active
  if (!expense.isActive) return false;

  // Handle installment expenses
  if (
    expense.isInstallment &&
    expense.installmentStartMonth &&
    expense.installmentMonths
  ) {
    // Create dates in UTC to avoid timezone issues
    const startDate = new Date(
      expense.installmentStartMonth + "-01T00:00:00.000Z"
    );
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + expense.installmentMonths - 1); // Fix: should be -1 because we include the start month

    const currentMonthStart = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    // Convert to UTC for consistent comparison
    const currentMonthUTC = new Date(
      Date.UTC(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 1)
    );

    const isActive = currentMonthUTC >= startDate && currentMonthUTC <= endDate;

    // Add debug logging for installments
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Installment Check: ${expense.name}`);
      console.log(`   StartMonth: ${expense.installmentStartMonth}`);
      console.log(`   StartDate: ${startDate.toISOString()}`);
      console.log(
        `   StartDate Local: ${startDate.getUTCFullYear()}-${String(
          startDate.getUTCMonth() + 1
        ).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`
      );
      console.log(`   EndDate: ${endDate.toISOString()}`);
      console.log(`   CurrentMonth: ${currentMonthUTC.toISOString()}`);
      console.log(
        `   CurrentMonth Local: ${currentMonthUTC.getUTCFullYear()}-${String(
          currentMonthUTC.getUTCMonth() + 1
        ).padStart(2, "0")}-${String(currentMonthUTC.getUTCDate()).padStart(
          2,
          "0"
        )}`
      );
      console.log(
        `   Comparison: ${currentMonthUTC.getTime()} >= ${startDate.getTime()} && ${currentMonthUTC.getTime()} <= ${endDate.getTime()}`
      );
      console.log(`   IsActive: ${isActive}`);
    }

    // Fix: should be <= endDate to include the last month
    return isActive;
  }

  // For recurring expenses, check frequency to determine if active in this month
  if (expense.recurring && expense.frequency) {
    const dueDate = new Date(expense.dueDate);
    const forecastMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    const dueDateMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);

    switch (expense.frequency) {
      case Frequency.YEARLY:
        // Yearly expenses only happen in the month of the due date each year
        return forecastMonth.getMonth() === dueDateMonth.getMonth();

      case Frequency.QUARTERLY:
        // Quarterly expenses happen every 3 months from the due date month
        const monthsDiff =
          (forecastMonth.getFullYear() - dueDateMonth.getFullYear()) * 12 +
          (forecastMonth.getMonth() - dueDateMonth.getMonth());
        return monthsDiff >= 0 && monthsDiff % 3 === 0;

      case Frequency.MONTHLY:
        // Monthly expenses happen every month
        return true;

      case Frequency.WEEKLY:
      case Frequency.BIWEEKLY:
      case Frequency.DAILY:
        // These happen frequently enough to be considered monthly
        return true;

      default:
        return true;
    }
  }

  // For one-time expenses, check if the due date falls in the target month.
  // The dueDate is already the billing due date (calculated by the expense form),
  // so we simply compare its year+month to the forecast month.
  const dueDate = new Date(expense.dueDate);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd   = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return dueDate >= monthStart && dueDate <= monthEnd;
}

/**
 * Calculate goal contribution for a month based on target date and remaining amount
 */
export function calculateGoalContribution(
  goal: Goal,
  currentMonth: Date
): number {
  if (!goal.isActive) return 0;

  const targetDate = new Date(goal.targetDate);
  const remainingAmount = goal.targetAmount - goal.currentAmount;

  // If goal is already completed
  if (remainingAmount <= 0) return 0;

  // If target date has passed
  if (targetDate < currentMonth) return 0;

  // Calculate months until target
  const monthsUntilTarget = Math.max(
    1,
    Math.ceil(
      (targetDate.getTime() - currentMonth.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  // Calculate required monthly contribution
  const requiredMonthlyContribution = remainingAmount / monthsUntilTarget;

  // Apply priority multiplier (higher priority gets more aggressive saving)
  let priorityMultiplier = 1;
  switch (goal.priority) {
    case Priority.CRITICAL:
      priorityMultiplier = 1.2;
      break;
    case Priority.HIGH:
      priorityMultiplier = 1.1;
      break;
    case Priority.MEDIUM:
      priorityMultiplier = 1;
      break;
    case Priority.LOW:
      priorityMultiplier = 0.8;
      break;
  }

  return Math.max(0, requiredMonthlyContribution * priorityMultiplier);
}

/**
 * Round allocation amount to nearest thousand (ending with 000) for easier real-life usage
 */
function roundToThousand(amount: number): number {
  // If amount is less than 1000, round to nearest 100 instead
  if (amount < 1000) {
    return Math.round(amount / 100) * 100;
  }
  // Round to nearest thousand
  return Math.round(amount / 1000) * 1000;
}

/**
 * Calculate smart goal allocations based on priority and surplus cash
 */
export function calculateSmartGoalAllocations(
  goals: Goal[],
  availableSurplus: number,
  currentMonth: Date
): Array<{ id: string; name: string; amount: number }> {
  // Filter active goals and sort by priority order
  const activeGoals = goals
    .filter((goal) => goal.isActive)
    .sort((a, b) => (a.priorityOrder || 999) - (b.priorityOrder || 999));

  const allocations: Array<{ id: string; name: string; amount: number }> = [];
  let remainingSurplus = availableSurplus;

  // Add debug logging
  if (process.env.NODE_ENV === "development") {
    console.log(
      `Smart goal allocation: Available surplus = ${availableSurplus}, Active goals = ${activeGoals.length}`
    );
  }

  // Calculate balance-based allocation multiplier
  // Higher balances allow for more aggressive goal allocation
  const balanceMultiplier = Math.min(
    2.0,
    Math.max(1.0, availableSurplus / 10000)
  ); // Scale based on surplus amount

  for (const goal of activeGoals) {
    if (remainingSurplus <= 0) break;

    // Check if goal is already complete (for fixed amount goals)
    if (
      goal.goalType === GoalType.FIXED_AMOUNT &&
      goal.currentAmount >= goal.targetAmount
    ) {
      continue;
    }

    // Calculate required amount for this goal
    let requiredAmount = 0;

    if (goal.goalType === GoalType.FIXED_AMOUNT) {
      // For fixed amount goals, calculate remaining amount needed
      const remainingAmount = goal.targetAmount - goal.currentAmount;
      if (remainingAmount <= 0) continue;

      // Calculate months until target
      const targetDate = new Date(goal.targetDate);
      const monthsUntilTarget = Math.max(
        1,
        Math.ceil(
          (targetDate.getTime() - currentMonth.getTime()) /
          (1000 * 60 * 60 * 24 * 30.44)
        )
      );

      // If target date is in the past, use aggressive allocation
      if (targetDate < currentMonth) {
        // Allocate up to 60% of remaining surplus for overdue goals (increased from 50%)
        requiredAmount = Math.min(
          remainingAmount,
          remainingSurplus * 0.6 * balanceMultiplier
        );
      } else {
        // Calculate required monthly contribution
        const monthlyRequired = remainingAmount / monthsUntilTarget;

        // Don't allocate more than needed for this month, but ensure minimum progress
        // Increase base allocation when balance is higher
        const minAllocationPercent = Math.min(0.2, 0.1 * balanceMultiplier); // 10-20% based on balance
        requiredAmount = Math.min(
          remainingAmount,
          Math.max(monthlyRequired, remainingSurplus * minAllocationPercent)
        );
      }
    } else {
      // For open-ended goals, allocate based on priority and available surplus
      // Use a percentage of remaining surplus based on priority and balance
      const priorityMultiplier = getPriorityMultiplier(goal.priority);
      const baseAllocation = remainingSurplus * 0.15 * balanceMultiplier; // Scale with balance
      requiredAmount = baseAllocation * priorityMultiplier;
    }

    // Apply priority-based minimum allocation with balance consideration
    const priorityMultiplier = getPriorityMultiplier(goal.priority);
    const minimumAllocation = Math.min(
      remainingSurplus * 0.05 * priorityMultiplier * balanceMultiplier,
      remainingSurplus
    );

    // Don't allocate more than available surplus, but ensure minimum for high priority
    let allocation = Math.max(
      minimumAllocation,
      Math.min(requiredAmount, remainingSurplus)
    );

    // For fixed amount goals, ensure we never allocate more than remaining needed
    if (goal.goalType === GoalType.FIXED_AMOUNT) {
      const remainingNeeded = goal.targetAmount - goal.currentAmount;
      allocation = Math.min(allocation, remainingNeeded);
    }

    // Round allocation to nearest thousand (ending with 000) for easier real-life usage
    allocation = roundToThousand(allocation);

    // Ensure we don't exceed available surplus after rounding
    allocation = Math.min(allocation, remainingSurplus);

    if (allocation > 0) {
      allocations.push({
        id: goal.id,
        name: goal.name,
        amount: allocation,
      });
      remainingSurplus -= allocation;

      // Add debug logging
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Allocated ${allocation} to goal ${goal.name
          } (balance multiplier: ${balanceMultiplier.toFixed(
            2
          )}), remaining surplus: ${remainingSurplus}`
        );
      }
    }
  }

  return allocations;
}

/**
 * Get priority multiplier for goal allocation
 */
function getPriorityMultiplier(priority: Priority): number {
  switch (priority) {
    case Priority.CRITICAL:
      return 1.5;
    case Priority.HIGH:
      return 1.2;
    case Priority.MEDIUM:
      return 1.0;
    case Priority.LOW:
      return 0.7;
    default:
      return 1.0;
  }
}

/**
 * Calculate forecast completion date for a goal
 */
export function calculateGoalCompletionForecast(
  goal: Goal,
  monthlyAllocation: number
): { estimatedCompletionMonth?: string; isAchievable: boolean } {
  if (goal.goalType === GoalType.OPEN_ENDED) {
    return { isAchievable: true }; // Open-ended goals are always "achievable"
  }

  const remainingAmount = goal.targetAmount - goal.currentAmount;
  if (remainingAmount <= 0) {
    return { isAchievable: true }; // Already completed
  }

  if (monthlyAllocation <= 0) {
    return { isAchievable: false }; // No allocation means not achievable
  }

  // Calculate months needed to complete
  const monthsNeeded = Math.ceil(remainingAmount / monthlyAllocation);

  // Calculate estimated completion date
  const currentDate = new Date();
  const completionDate = new Date(currentDate);
  completionDate.setMonth(completionDate.getMonth() + monthsNeeded);

  const estimatedCompletionMonth = `${completionDate.getFullYear()}-${(
    completionDate.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}`;

  // Check if achievable by target date
  const targetDate = new Date(goal.targetDate);
  const isAchievable = completionDate <= targetDate;

  return { estimatedCompletionMonth, isAchievable };
}

/**
 * Generate financial forecast
 */
export function generateForecast(
  userPlan: UserPlan,
  config: Partial<ForecastConfig> = {}
): ForecastResult {
  const defaultConfig: ForecastConfig = {
    months: 12,
    startingBalance: userPlan.currentBalance || 0,
    startDate: new Date(),
    includeGoalContributions: true,
    conservativeMode: false,
  };

  const finalConfig = { ...defaultConfig, ...config };
  const monthlyForecasts: MonthlyForecast[] = [];
  let currentBalance = finalConfig.startingBalance;

  // Create a copy of goals with running totals to track progress
  const goalTracker = new Map<string, { goal: Goal; currentAmount: number }>();
  userPlan.goals.forEach((goal) => {
    goalTracker.set(goal.id, { goal, currentAmount: goal.currentAmount });
  });

  // Add debug logging for forecast configuration
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Forecast Generation Started");
    console.log("Config:", finalConfig);
    console.log("User Plan Summary:", {
      income: userPlan.income.length,
      expenses: userPlan.expenses.length,
      goals: userPlan.goals.length,
      currentBalance: userPlan.currentBalance,
    });
  }

  // Generate forecasts for each month
  for (let monthIndex = 0; monthIndex < finalConfig.months; monthIndex++) {
    const currentDate = new Date(finalConfig.startDate || new Date());
    currentDate.setDate(1); // Set to first day of month BEFORE adding months to avoid overflow
    currentDate.setMonth(currentDate.getMonth() + monthIndex);

    const monthKey = `${currentDate.getFullYear()}-${(
      currentDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;

    // Store starting balance for this month
    const monthStartingBalance = currentBalance;

    // Add debug logging for each month
    if (process.env.NODE_ENV === "development") {
      console.log(`\n📅 Processing ${monthKey}:`);
      console.log(`Starting balance: ${monthStartingBalance}`);
    }

    // Calculate income for this month
    const incomeBreakdown: Array<{ id: string; name: string; amount: number }> =
      [];
    let totalIncome = 0;

    for (const income of userPlan.income) {
      if (isIncomeActiveInMonth(income, currentDate)) {
        let monthlyAmount = calculateMonthlyAmount(
          income.amount,
          income.frequency
        );

        // Apply conservative mode adjustment
        if (finalConfig.conservativeMode) {
          monthlyAmount *= 0.9; // Reduce income by 10%
        }

        incomeBreakdown.push({
          id: income.id,
          name: income.name,
          amount: monthlyAmount,
        });
        totalIncome += monthlyAmount;

        // Add debug logging for income
        if (process.env.NODE_ENV === "development") {
          console.log(`  💰 Income: ${income.name} = ${monthlyAmount}`);
        }
      }
    }

    // Calculate expenses for this month
    const expenseBreakdown: Array<{
      id: string;
      name: string;
      amount: number;
      installmentInfo?: {
        currentMonth: number;
        totalMonths: number;
        isInstallment: boolean;
      };
    }> = [];
    let totalExpenses = 0;

    // Use the same filtering logic as expense calendar for consistency
    const monthExpenses = getExpensesForMonth(userPlan.expenses, currentDate);

    for (const expense of monthExpenses) {
      // Add debug logging for expense processing
      if (process.env.NODE_ENV === "development") {
        console.log(`  🔍 Processing expense: ${expense.name}`);
        console.log(`     Amount: ${expense.amount}`);
        console.log(`     IsInstallment: ${expense.isInstallment}`);
        console.log(
          `     InstallmentStartMonth: ${expense.installmentStartMonth}`
        );
        console.log(`     InstallmentMonths: ${expense.installmentMonths}`);
      }

      // Use the unified calculation from expenseOperations for all expense types
      // This ensures consistency with the expense calendar and other modules
      let monthlyAmount = calculateExpenseMonthlyAmount(expense, currentDate);

      // Add debug logging for all expense calculations
      if (process.env.NODE_ENV === "development") {
        const expenseType = expense.isInstallment
          ? "Installment"
          : expense.recurring
            ? `Recurring (${expense.frequency})`
            : "One-time";
        console.log(
          `  📦 Unified expense ${expense.name}: Amount=${monthlyAmount} [${expenseType}]`
        );
      }

      // Validate the calculated amount
      if (monthlyAmount < 0) {
        console.warn(
          `⚠️  Negative expense amount calculated for ${expense.name}: ${monthlyAmount}`
        );
        monthlyAmount = 0;
      }

      // Apply conservative mode adjustment
      if (finalConfig.conservativeMode) {
        monthlyAmount *= 1.1; // Increase expenses by 10%
      }

      // Calculate installment progress if applicable
      let installmentInfo = undefined;
      if (
        expense.isInstallment &&
        expense.installmentStartMonth &&
        expense.installmentMonths
      ) {
        // Calculate the current month number for this installment
        const startDate = new Date(
          expense.installmentStartMonth + "-01T00:00:00.000Z"
        );
        const currentMonthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const currentMonthUTC = new Date(
          Date.UTC(
            currentMonthStart.getFullYear(),
            currentMonthStart.getMonth(),
            1
          )
        );

        // Calculate months from start
        const monthsFromStart = Math.floor(
          (currentMonthUTC.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 30.44)
        );

        const currentMonth = Math.min(
          monthsFromStart + 1,
          expense.installmentMonths
        );

        if (currentMonth >= 1 && currentMonth <= expense.installmentMonths) {
          installmentInfo = {
            currentMonth: currentMonth,
            totalMonths: expense.installmentMonths,
            isInstallment: true,
          };
        }
      }

      expenseBreakdown.push({
        id: expense.id,
        name: expense.name,
        amount: monthlyAmount,
        installmentInfo: installmentInfo,
      });
      totalExpenses += monthlyAmount;
    }

    // Calculate available cash after essential expenses
    const availableCashAfterExpenses =
      currentBalance + totalIncome - totalExpenses;

    // Add debug logging for cash flow
    if (process.env.NODE_ENV === "development") {
      console.log(
        `  📊 Cash Flow: Income=${totalIncome}, Expenses=${totalExpenses}, Available=${availableCashAfterExpenses}`
      );
    }

    // Calculate goal contributions for this month
    const goalBreakdown: Array<{ id: string; name: string; amount: number }> =
      [];
    let totalGoalContributions = 0;

    if (finalConfig.includeGoalContributions) {
      // Only allocate to goals if we have positive cash flow or sufficient balance
      const surplusForGoals = totalIncome - totalExpenses;

      if (surplusForGoals > 0 || availableCashAfterExpenses > 0) {
        // Use the minimum of surplus or available cash for goal allocation
        const availableForGoals = Math.max(
          0,
          Math.min(surplusForGoals, availableCashAfterExpenses)
        );

        if (availableForGoals > 0) {
          // Create goals with updated current amounts for allocation calculation
          const goalsWithUpdatedAmounts = Array.from(goalTracker.values()).map(
            (entry) => ({
              ...entry.goal,
              currentAmount: entry.currentAmount,
            })
          );

          // Use smart goal allocation based on priority
          const smartAllocations = calculateSmartGoalAllocations(
            goalsWithUpdatedAmounts,
            availableForGoals,
            currentDate
          );

          goalBreakdown.push(...smartAllocations);
          totalGoalContributions = smartAllocations.reduce(
            (sum, allocation) => sum + allocation.amount,
            0
          );

          // Ensure we don't allocate more than available
          if (totalGoalContributions > availableForGoals) {
            const scaleFactor = availableForGoals / totalGoalContributions;
            goalBreakdown.forEach((allocation) => {
              allocation.amount *= scaleFactor;
              // Round again after scaling to maintain clean amounts
              allocation.amount = roundToThousand(allocation.amount);
            });
            // Recalculate total after rounding
            totalGoalContributions = goalBreakdown.reduce(
              (sum, allocation) => sum + allocation.amount,
              0
            );

            if (process.env.NODE_ENV === "development") {
              console.log(
                `  🎯 Goal allocations scaled by ${scaleFactor.toFixed(
                  2
                )}, total after rounding: ${totalGoalContributions}`
              );
            }
          }

          // Update goal tracker with this month's allocations
          goalBreakdown.forEach((allocation) => {
            const goalEntry = goalTracker.get(allocation.id);
            if (goalEntry) {
              goalEntry.currentAmount += allocation.amount;

              // Add debug logging for goal progress
              if (process.env.NODE_ENV === "development") {
                const progress =
                  goalEntry.goal.goalType === GoalType.FIXED_AMOUNT
                    ? (goalEntry.currentAmount / goalEntry.goal.targetAmount) *
                    100
                    : 0;
                console.log(
                  `    - ${allocation.name}: ${allocation.amount} (progress: ${goalEntry.currentAmount
                  }/${goalEntry.goal.targetAmount}, ${progress.toFixed(1)}%)`
                );
              }
            }
          });

          // Add debug logging for goal allocations
          if (process.env.NODE_ENV === "development") {
            console.log(
              `  🎯 Goal allocations: Total=${totalGoalContributions}, Available=${availableForGoals}`
            );
          }
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `  🎯 No goal allocations: Surplus=${surplusForGoals}, Available=${availableCashAfterExpenses}`
          );
        }
      }
    }

    // Calculate net change and ending balance
    const netChange = totalIncome - totalExpenses - totalGoalContributions;
    const endingBalance = monthStartingBalance + netChange;

    // Add debug logging for final calculations
    if (process.env.NODE_ENV === "development") {
      console.log(
        `  📈 Final: NetChange=${netChange}, EndingBalance=${endingBalance}`
      );
    }

    // Create monthly forecast
    const monthlyForecast: MonthlyForecast = {
      month: monthKey,
      startingBalance: monthStartingBalance,
      income: totalIncome,
      expenses: totalExpenses,
      goalContributions: totalGoalContributions,
      netChange,
      endingBalance,
      incomeBreakdown,
      expenseBreakdown,
      goalBreakdown,
    };

    monthlyForecasts.push(monthlyForecast);

    // Update current balance for next month
    currentBalance = endingBalance;
  }

  // Add debug logging for summary
  if (process.env.NODE_ENV === "development") {
    console.log("\n📋 Forecast Summary:");
    console.log(`Total months: ${monthlyForecasts.length}`);
    console.log(`Starting balance: ${finalConfig.startingBalance}`);
    console.log(`Final balance: ${currentBalance}`);
  }

  // Calculate summary statistics
  const totalIncome = monthlyForecasts.reduce(
    (sum, month) => sum + month.income,
    0
  );
  const totalExpenses = monthlyForecasts.reduce(
    (sum, month) => sum + month.expenses,
    0
  );
  const totalGoalContributions = monthlyForecasts.reduce(
    (sum, month) => sum + month.goalContributions,
    0
  );
  const finalBalance =
    monthlyForecasts[monthlyForecasts.length - 1]?.endingBalance || 0;

  const balances = monthlyForecasts.map((month) => month.endingBalance);
  const lowestBalance = Math.min(...balances);
  const highestBalance = Math.max(...balances);
  const monthsWithNegativeBalance = balances.filter(
    (balance) => balance < 0
  ).length;

  const summary = {
    totalIncome,
    totalExpenses,
    totalGoalContributions,
    finalBalance,
    averageMonthlyIncome: totalIncome / finalConfig.months,
    averageMonthlyExpenses: totalExpenses / finalConfig.months,
    averageMonthlyNet:
      (totalIncome - totalExpenses - totalGoalContributions) /
      finalConfig.months,
    lowestBalance,
    highestBalance,
    monthsWithNegativeBalance,
  };

  // Calculate goal progress projections
  const goalProgress = userPlan.goals.map((goal) => {
    const totalContributions = monthlyForecasts.reduce((sum, month) => {
      const contribution = month.goalBreakdown.find((g) => g.id === goal.id);
      return sum + (contribution?.amount || 0);
    }, 0);

    const projectedAmount = goal.currentAmount + totalContributions;
    const projectedProgress =
      goal.targetAmount > 0 ? (projectedAmount / goal.targetAmount) * 100 : 0;

    // Calculate average monthly allocation for completion forecast
    const averageMonthlyAllocation = totalContributions / finalConfig.months;
    const completionForecast = calculateGoalCompletionForecast(
      goal,
      averageMonthlyAllocation
    );

    // Find estimated completion month from actual allocations
    let estimatedCompletionMonth: string | undefined;
    let accumulatedContributions = goal.currentAmount;

    for (const month of monthlyForecasts) {
      const contribution = month.goalBreakdown.find((g) => g.id === goal.id);
      if (contribution) {
        accumulatedContributions += contribution.amount;
        if (
          goal.goalType === GoalType.FIXED_AMOUNT &&
          accumulatedContributions >= goal.targetAmount
        ) {
          estimatedCompletionMonth = month.month;
          break;
        }
      }
    }

    // Use completion forecast if no specific month found
    if (
      !estimatedCompletionMonth &&
      completionForecast.estimatedCompletionMonth
    ) {
      estimatedCompletionMonth = completionForecast.estimatedCompletionMonth;
    }

    // Determine if goal is on track
    let onTrack: boolean;

    if (goal.goalType === GoalType.OPEN_ENDED) {
      // Open-ended goals are always considered on track
      onTrack = true;
    } else if (goal.currentAmount >= goal.targetAmount) {
      // Goal is already completed - always on track regardless of target date
      onTrack = true;
    } else if (projectedAmount >= goal.targetAmount) {
      // Goal will be completed by the forecast period - on track
      onTrack = true;
    } else {
      // Use completion forecast logic for incomplete goals
      onTrack = completionForecast.isAchievable;
    }

    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      projectedAmount,
      projectedProgress,
      estimatedCompletionMonth,
      onTrack,
      goalType: goal.goalType,
      averageMonthlyAllocation,
    };
  });

  return {
    monthlyForecasts,
    summary,
    goalProgress,
  };
}

/**
 * Convert forecast result to legacy Forecast format for compatibility
 */
export function convertToLegacyForecast(
  forecastResult: ForecastResult
): Forecast[] {
  return forecastResult.monthlyForecasts.map((month) => ({
    id: `forecast-${month.month}`,
    month: month.month,
    projectedBalance: month.endingBalance,
    projectedIncome: month.income,
    projectedExpenses: month.expenses,
    projectedGoalContributions: month.goalContributions,
    startingBalance: month.startingBalance,
    netChange: month.netChange,
    generatedAt: new Date().toISOString(),
  }));
}

/**
 * Monthly calendar data structure for forecast display
 */
export interface MonthlyForecastCalendarData {
  /** Month identifier (YYYY-MM) */
  month: string;
  /** Human-readable month label */
  monthLabel: string;
  /** Total income for the month */
  totalIncome: number;
  /** Total expenses for the month */
  totalExpenses: number;
  /** Total goal contributions for the month */
  totalGoalContributions: number;
  /** Net change for the month */
  netChange: number;
  /** Ending balance for the month */
  endingBalance: number;
  /** Starting balance for the month */
  startingBalance: number;
  /** Complete monthly forecast data */
  forecastData: MonthlyForecast;
}

/**
 * Aggregate forecast data for calendar view
 * Maps the detailed forecast data into a monthly summary format suitable for calendar components
 */
export function aggregateForecastForCalendar(
  forecastResult: ForecastResult,
  startDate?: Date,
  monthsToShow: number = 12
): MonthlyForecastCalendarData[] {
  const months: MonthlyForecastCalendarData[] = [];

  // Use the existing forecast data or generate based on startDate if needed
  const monthlyForecasts = forecastResult.monthlyForecasts.slice(
    0,
    monthsToShow
  );

  for (const monthForecast of monthlyForecasts) {
    const date = new Date(monthForecast.month + "-01");
    const monthLabel = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    const calendarData: MonthlyForecastCalendarData = {
      month: monthForecast.month,
      monthLabel,
      totalIncome: monthForecast.income,
      totalExpenses: monthForecast.expenses,
      totalGoalContributions: monthForecast.goalContributions,
      netChange: monthForecast.netChange,
      endingBalance: monthForecast.endingBalance,
      startingBalance: monthForecast.startingBalance,
      forecastData: monthForecast,
    };

    months.push(calendarData);
  }

  return months;
}

/**
 * Default forecast configuration
 */
export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  months: 12,
  startingBalance: 0,
  includeGoalContributions: true,
  conservativeMode: false,
};
