import {
  UserPlan,
  Income,
  Expense,
  Goal,
  Frequency,
  ForecastConfig,
} from "@/types";
import { ForecastResult, generateForecast } from "./forecastCalculator";

/**
 * Export format options
 */
export type ExportFormat = "json" | "csv";

/**
 * Export metadata
 */
export interface ExportMetadata {
  exportedAt: string;
  version: string;
  appName: string;
  dataTypes: string[];
}

/**
 * Complete export data structure
 */
export interface ExportData {
  metadata: ExportMetadata;
  userPlan: UserPlan;
}

/**
 * CSV export options
 */
export interface CSVExportOptions {
  includeHeaders: boolean;
  delimiter: string;
  dateFormat: "iso" | "us" | "eu";
}

/**
 * Default CSV export options
 */
export const DEFAULT_CSV_OPTIONS: CSVExportOptions = {
  includeHeaders: true,
  delimiter: ",",
  dateFormat: "iso",
};

/**
 * Serialize user plan data to JSON format
 */
export function serializeToJSON(userPlan: UserPlan): string {
  const exportData: ExportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      appName: "Finance Planner",
      dataTypes: ["income", "expenses", "goals", "forecast"],
    },
    userPlan: {
      ...userPlan,
      // Ensure dates are properly serialized
      createdAt: userPlan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Serialize user plan data to CSV format
 */
export function serializeToCSV(
  userPlan: UserPlan,
  options: CSVExportOptions = DEFAULT_CSV_OPTIONS
): string {
  const csvSections: string[] = [];

  // Add metadata section
  csvSections.push("# Finance Planner Export");
  csvSections.push(`# Exported: ${new Date().toISOString()}`);
  csvSections.push(`# Version: 1.0.0`);
  csvSections.push("");

  // Export Income data
  if (userPlan.income && userPlan.income.length > 0) {
    csvSections.push("## INCOME");
    csvSections.push(serializeIncomeToCSV(userPlan.income, options));
    csvSections.push("");
  }

  // Export Expenses data
  if (userPlan.expenses && userPlan.expenses.length > 0) {
    csvSections.push("## EXPENSES");
    csvSections.push(serializeExpensesToCSV(userPlan.expenses, options));
    csvSections.push("");
  }

  // Export Goals data
  if (userPlan.goals && userPlan.goals.length > 0) {
    csvSections.push("## GOALS");
    csvSections.push(serializeGoalsToCSV(userPlan.goals, options));
    csvSections.push("");
  }

  // Export Summary
  csvSections.push("## SUMMARY");
  csvSections.push(serializeSummaryToCSV(userPlan, options));

  return csvSections.join("\n");
}

/**
 * Serialize income data to CSV
 */
function serializeIncomeToCSV(
  income: Income[],
  options: CSVExportOptions
): string {
  const headers = [
    "ID",
    "Name",
    "Amount",
    "Frequency",
    "Description",
    "Start Date",
    "End Date",
    "Is Active",
    "Created At",
    "Updated At",
  ];

  const rows = income.map((item) => [
    item.id,
    escapeCSVValue(item.name),
    item.amount.toString(),
    item.frequency,
    escapeCSVValue(item.description || ""),
    formatDate(item.startDate, options.dateFormat),
    item.endDate ? formatDate(item.endDate, options.dateFormat) : "",
    item.isActive ? "Yes" : "No",
    formatDate(item.createdAt, options.dateFormat),
    formatDate(item.updatedAt, options.dateFormat),
  ]);

  return formatCSVSection(headers, rows, options);
}

/**
 * Serialize expenses data to CSV
 */
function serializeExpensesToCSV(
  expenses: Expense[],
  options: CSVExportOptions
): string {
  const headers = [
    "ID",
    "Name",
    "Amount",
    "Category",
    "Due Date",
    "Recurring",
    "Frequency",
    "Description",
    "Priority",
    "Is Active",
    "Created At",
    "Updated At",
  ];

  const rows = expenses.map((item) => [
    item.id,
    escapeCSVValue(item.name),
    item.amount.toString(),
    item.category,
    formatDate(item.dueDate, options.dateFormat),
    item.recurring ? "Yes" : "No",
    item.frequency || "",
    escapeCSVValue(item.description || ""),
    item.priority,
    item.isActive ? "Yes" : "No",
    formatDate(item.createdAt, options.dateFormat),
    formatDate(item.updatedAt, options.dateFormat),
  ]);

  return formatCSVSection(headers, rows, options);
}

/**
 * Serialize goals data to CSV
 */
function serializeGoalsToCSV(goals: Goal[], options: CSVExportOptions): string {
  const headers = [
    "ID",
    "Name",
    "Target Amount",
    "Current Amount",
    "Target Date",
    "Description",
    "Category",
    "Priority",
    "Is Active",
    "Progress %",
    "Created At",
    "Updated At",
  ];

  const rows = goals.map((item) => [
    item.id,
    escapeCSVValue(item.name),
    item.targetAmount.toString(),
    item.currentAmount.toString(),
    formatDate(item.targetDate, options.dateFormat),
    escapeCSVValue(item.description || ""),
    item.category,
    item.priority,
    item.isActive ? "Yes" : "No",
    ((item.currentAmount / item.targetAmount) * 100).toFixed(2) + "%",
    formatDate(item.createdAt, options.dateFormat),
    formatDate(item.updatedAt, options.dateFormat),
  ]);

  return formatCSVSection(headers, rows, options);
}

/**
 * Serialize summary data to CSV
 */
function serializeSummaryToCSV(
  userPlan: UserPlan,
  options: CSVExportOptions
): string {
  const totalIncome =
    userPlan.income?.reduce((sum, income) => {
      if (!income.isActive) return sum;
      return sum + calculateMonthlyAmount(income.amount, income.frequency);
    }, 0) || 0;

  const totalExpenses =
    userPlan.expenses?.reduce((sum, expense) => {
      if (!expense.isActive) return sum;
      return (
        sum +
        calculateMonthlyAmount({
          amount: expense.amount,
          frequency: expense.frequency || Frequency.MONTHLY,
          recurring: expense.recurring,
          recurringWeeksInterval: expense.recurringWeeksInterval,
        })
      );
    }, 0) || 0;

  const totalGoals =
    userPlan.goals?.reduce((sum, goal) => sum + goal.targetAmount, 0) || 0;
  const totalSaved =
    userPlan.goals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;

  const headers = ["Metric", "Value"];
  const rows = [
    ["Total Monthly Income", `$${totalIncome.toFixed(2)}`],
    ["Total Monthly Expenses", `$${totalExpenses.toFixed(2)}`],
    ["Monthly Net Income", `$${(totalIncome - totalExpenses).toFixed(2)}`],
    ["Total Goal Targets", `$${totalGoals.toFixed(2)}`],
    ["Total Saved Towards Goals", `$${totalSaved.toFixed(2)}`],
    ["Current Balance", `$${userPlan.currentBalance.toFixed(2)}`],
    [
      "Savings Rate",
      `${
        totalIncome > 0
          ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(2)
          : 0
      }%`,
    ],
    [
      "Active Income Sources",
      userPlan.income?.filter((i) => i.isActive).length.toString() || "0",
    ],
    [
      "Active Expenses",
      userPlan.expenses?.filter((e) => e.isActive).length.toString() || "0",
    ],
    [
      "Active Goals",
      userPlan.goals?.filter((g) => g.isActive).length.toString() || "0",
    ],
  ];

  return formatCSVSection(headers, rows, options);
}

/**
 * Calculate monthly amount based on frequency
 */
// Overloaded function to handle both income (simple) and expense (complex) calculations
function calculateMonthlyAmount(amount: number, frequency: Frequency): number;
function calculateMonthlyAmount(expense: {
  amount: number;
  frequency: Frequency;
  recurring?: boolean;
  recurringWeeksInterval?: number;
}): number;
function calculateMonthlyAmount(
  amountOrExpense:
    | number
    | {
        amount: number;
        frequency: Frequency;
        recurring?: boolean;
        recurringWeeksInterval?: number;
      },
  frequency?: Frequency
): number {
  // Handle simple amount + frequency case (for income)
  if (typeof amountOrExpense === "number" && frequency) {
    const amount = amountOrExpense;
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
  }

  // Handle expense object case
  const expense = amountOrExpense as {
    amount: number;
    frequency: Frequency;
    recurring?: boolean;
    recurringWeeksInterval?: number;
  };

  // Handle one-time expenses (not recurring)
  if (!expense.recurring) {
    return expense.amount;
  }

  switch (expense.frequency) {
    case Frequency.DAILY:
      return expense.amount * 30.44;
    case Frequency.WEEKLY:
      // Handle custom weekly intervals
      if (
        expense.recurringWeeksInterval &&
        expense.recurringWeeksInterval > 1
      ) {
        const weeksPerMonth = 4.33;
        const occurrencesPerMonth =
          weeksPerMonth / expense.recurringWeeksInterval;
        return expense.amount * occurrencesPerMonth;
      }
      return expense.amount * 4.33;
    case Frequency.BIWEEKLY:
      return expense.amount * 2.17;
    case Frequency.MONTHLY:
      return expense.amount;
    case Frequency.QUARTERLY:
      return expense.amount / 3;
    case Frequency.YEARLY:
      return expense.amount / 12;
    case Frequency.ONE_TIME:
      return expense.amount;
    default:
      return expense.amount;
  }
}

/**
 * Format CSV section with headers and rows
 */
function formatCSVSection(
  headers: string[],
  rows: string[][],
  options: CSVExportOptions
): string {
  const lines: string[] = [];

  if (options.includeHeaders) {
    lines.push(headers.join(options.delimiter));
  }

  rows.forEach((row) => {
    lines.push(row.join(options.delimiter));
  });

  return lines.join("\n");
}

/**
 * Escape CSV values that contain special characters
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";

  // If value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format date according to specified format
 */
function formatDate(dateString: string, format: "iso" | "us" | "eu"): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  switch (format) {
    case "us":
      return date.toLocaleDateString("en-US");
    case "eu":
      return date.toLocaleDateString("en-GB");
    case "iso":
    default:
      return date.toISOString().split("T")[0];
  }
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  format: ExportFormat,
  prefix: string = "financial-plan"
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `${prefix}-${timestamp}.${format}`;
}

/**
 * Validate export data before serialization
 */
export function validateExportData(userPlan: UserPlan): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!userPlan) {
    errors.push("User plan is required");
    return { isValid: false, errors };
  }

  if (!userPlan.id) {
    errors.push("User plan ID is required");
  }

  // Validate income data
  if (userPlan.income) {
    userPlan.income.forEach((income, index) => {
      if (!income.id) errors.push(`Income item ${index + 1} is missing ID`);
      if (!income.name) errors.push(`Income item ${index + 1} is missing name`);
      if (income.amount < 0)
        errors.push(`Income item ${index + 1} has negative amount`);
    });
  }

  // Validate expenses data
  if (userPlan.expenses) {
    userPlan.expenses.forEach((expense, index) => {
      if (!expense.id) errors.push(`Expense item ${index + 1} is missing ID`);
      if (!expense.name)
        errors.push(`Expense item ${index + 1} is missing name`);
      if (expense.amount < 0)
        errors.push(`Expense item ${index + 1} has negative amount`);
    });
  }

  // Validate goals data
  if (userPlan.goals) {
    userPlan.goals.forEach((goal, index) => {
      if (!goal.id) errors.push(`Goal item ${index + 1} is missing ID`);
      if (!goal.name) errors.push(`Goal item ${index + 1} is missing name`);
      if (goal.targetAmount <= 0)
        errors.push(`Goal item ${index + 1} has invalid target amount`);
      if (goal.currentAmount < 0)
        errors.push(`Goal item ${index + 1} has negative current amount`);
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Monthly Goal Allocation Export Data
 */
export interface MonthlyGoalAllocationData {
  month: string;
  monthLabel: string;
  goalBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
    progressPercent?: number;
    newTotal?: number;
    targetAmount?: number;
    goalType?: string;
    isCompleted?: boolean;
  }>;
  totalAllocation: number;
  surplus: number;
  remainingSurplus: number;
}

/**
 * Export monthly goal allocation schedule to CSV
 */
export function exportGoalAllocationToCSV(
  userPlan: UserPlan,
  options: CSVExportOptions = DEFAULT_CSV_OPTIONS
): string {
  // Use the same forecast configuration as the forecast page
  const forecastConfig = userPlan.forecastConfig || {
    startingBalance: userPlan.currentBalance || 0,
    startDate: new Date().toISOString().slice(0, 7),
    months: 12,
    includeGoalContributions: true,
    conservativeMode: false,
    updatedAt: new Date().toISOString(),
  };

  const convertToUtilsConfig = (config: ForecastConfig) => ({
    months: config.months,
    startingBalance: config.startingBalance,
    startDate: config.startDate
      ? new Date(config.startDate + "-01")
      : undefined,
    includeGoalContributions: config.includeGoalContributions,
    conservativeMode: config.conservativeMode,
  });

  const forecastResult: ForecastResult = generateForecast(
    userPlan,
    convertToUtilsConfig(forecastConfig)
  );

  // Create a map to track cumulative allocations for each goal
  const goalTracker = new Map<string, number>();
  userPlan.goals.forEach((goal) => {
    goalTracker.set(goal.id, goal.currentAmount);
  });

  const allocationData: MonthlyGoalAllocationData[] =
    forecastResult.monthlyForecasts.map((month) => {
      const surplus = month.income - month.expenses;

      // Calculate percentage progress for each goal allocation in this month
      const enhancedGoalBreakdown = month.goalBreakdown.map(
        (goalAllocation) => {
          // Find the corresponding goal
          const goal = userPlan.goals.find((g) => g.id === goalAllocation.id);
          if (!goal)
            return {
              ...goalAllocation,
              progressPercent: 0,
              newTotal: 0,
              targetAmount: 0,
              goalType: "fixed_amount",
              isCompleted: false,
            };

          // Update the tracker with this month's allocation
          const currentAmount = goalTracker.get(goal.id) || 0;
          const newTotal = currentAmount + goalAllocation.amount;
          goalTracker.set(goal.id, newTotal);

          // Calculate percentage progress
          const progressPercent =
            goal.goalType === "fixed_amount"
              ? Math.min(100, (newTotal / goal.targetAmount) * 100)
              : 0; // Open-ended goals don't have a percentage

          return {
            ...goalAllocation,
            progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
            newTotal: newTotal,
            targetAmount: goal.targetAmount,
            goalType: goal.goalType,
            isCompleted:
              goal.goalType === "fixed_amount" && newTotal >= goal.targetAmount,
          };
        }
      );

      return {
        month: month.month,
        monthLabel: formatMonth(month.month),
        goalBreakdown: enhancedGoalBreakdown,
        totalAllocation: month.goalContributions,
        surplus,
        remainingSurplus: Math.max(0, surplus - month.goalContributions),
      };
    });

  const csvSections: string[] = [];

  // Add metadata section
  csvSections.push("# Monthly Goal Allocation Schedule Export");
  csvSections.push(`# Exported: ${new Date().toISOString()}`);
  csvSections.push(`# Period: ${allocationData.length} months`);
  csvSections.push("");

  // Main allocation table
  csvSections.push("## MONTHLY ALLOCATION SCHEDULE");
  const headers = [
    "Month",
    "Month Name",
    "Goal Allocations",
    "Total Allocation",
    "Available Surplus",
    "Remaining Surplus",
    "Guidance",
  ];

  const rows = allocationData.map((monthData) => [
    monthData.month,
    escapeCSVValue(monthData.monthLabel),
    escapeCSVValue(
      monthData.goalBreakdown
        .map((goal) => `${goal.name}: ${formatCurrency(goal.amount)}`)
        .join("; ") || "No allocations"
    ),
    formatCurrency(monthData.totalAllocation),
    formatCurrency(monthData.surplus),
    formatCurrency(monthData.remainingSurplus),
    monthData.goalBreakdown.length > 0
      ? "Goals funded"
      : monthData.surplus > 0
      ? "Surplus available"
      : "No surplus",
  ]);

  csvSections.push(formatCSVSection(headers, rows, options));
  csvSections.push("");

  // Detailed goal breakdown
  csvSections.push("## DETAILED GOAL BREAKDOWN");
  const detailHeaders = [
    "Month",
    "Goal Name",
    "Allocation Amount",
    "Progress %",
    "New Total",
    "Target Amount",
    "Goal Type",
    "Status",
  ];
  const detailRows: string[][] = [];

  allocationData.forEach((monthData) => {
    if (monthData.goalBreakdown.length > 0) {
      monthData.goalBreakdown.forEach((goal) => {
        detailRows.push([
          monthData.month,
          escapeCSVValue(goal.name),
          formatCurrency(goal.amount),
          goal.progressPercent ? `${goal.progressPercent}%` : "N/A",
          goal.newTotal ? formatCurrency(goal.newTotal) : "N/A",
          goal.targetAmount ? formatCurrency(goal.targetAmount) : "N/A",
          goal.goalType === "fixed_amount" ? "Fixed Amount" : "Open-ended",
          goal.isCompleted ? "Completed" : "In Progress",
        ]);
      });
    } else {
      detailRows.push([
        monthData.month,
        "No allocations",
        formatCurrency(0),
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        "N/A",
      ]);
    }
  });

  csvSections.push(formatCSVSection(detailHeaders, detailRows, options));
  csvSections.push("");

  // Summary statistics
  csvSections.push("## SUMMARY STATISTICS");
  const totalAllocations = allocationData.reduce(
    (sum, month) => sum + month.totalAllocation,
    0
  );
  const averageMonthlyAllocation = totalAllocations / allocationData.length;
  const totalSurplus = allocationData.reduce(
    (sum, month) => sum + month.surplus,
    0
  );
  const totalRemainingSurplus = allocationData.reduce(
    (sum, month) => sum + month.remainingSurplus,
    0
  );

  const summaryHeaders = ["Metric", "Value"];
  const summaryRows = [
    ["Total Allocated to Goals", formatCurrency(totalAllocations)],
    ["Average Monthly Allocation", formatCurrency(averageMonthlyAllocation)],
    ["Total Available Surplus", formatCurrency(totalSurplus)],
    ["Total Remaining Surplus", formatCurrency(totalRemainingSurplus)],
    [
      "Allocation Efficiency",
      `${
        totalSurplus > 0
          ? ((totalAllocations / totalSurplus) * 100).toFixed(1)
          : 0
      }%`,
    ],
    [
      "Months with Allocations",
      allocationData.filter((m) => m.totalAllocation > 0).length.toString(),
    ],
    [
      "Goals in Schedule",
      Array.from(
        new Set(
          allocationData.flatMap((m) => m.goalBreakdown.map((g) => g.name))
        )
      ).length.toString(),
    ],
  ];

  csvSections.push(formatCSVSection(summaryHeaders, summaryRows, options));

  return csvSections.join("\n");
}

/**
 * Export monthly goal allocation schedule to JSON
 */
export function exportGoalAllocationToJSON(userPlan: UserPlan): string {
  // Use the same forecast configuration as the forecast page
  const forecastConfig = userPlan.forecastConfig || {
    startingBalance: userPlan.currentBalance || 0,
    startDate: new Date().toISOString().slice(0, 7),
    months: 12,
    includeGoalContributions: true,
    conservativeMode: false,
    updatedAt: new Date().toISOString(),
  };

  const convertToUtilsConfig = (config: ForecastConfig) => ({
    months: config.months,
    startingBalance: config.startingBalance,
    startDate: config.startDate
      ? new Date(config.startDate + "-01")
      : undefined,
    includeGoalContributions: config.includeGoalContributions,
    conservativeMode: config.conservativeMode,
  });

  const forecastResult = generateForecast(
    userPlan,
    convertToUtilsConfig(forecastConfig)
  );

  // Create a map to track cumulative allocations for each goal
  const goalTracker = new Map<string, number>();
  userPlan.goals.forEach((goal) => {
    goalTracker.set(goal.id, goal.currentAmount);
  });

  const allocationData: MonthlyGoalAllocationData[] =
    forecastResult.monthlyForecasts.map((month) => {
      const surplus = month.income - month.expenses;

      // Calculate percentage progress for each goal allocation in this month
      const enhancedGoalBreakdown = month.goalBreakdown.map(
        (goalAllocation) => {
          // Find the corresponding goal
          const goal = userPlan.goals.find((g) => g.id === goalAllocation.id);
          if (!goal)
            return {
              ...goalAllocation,
              progressPercent: 0,
              newTotal: 0,
              targetAmount: 0,
              goalType: "fixed_amount",
              isCompleted: false,
            };

          // Update the tracker with this month's allocation
          const currentAmount = goalTracker.get(goal.id) || 0;
          const newTotal = currentAmount + goalAllocation.amount;
          goalTracker.set(goal.id, newTotal);

          // Calculate percentage progress
          const progressPercent =
            goal.goalType === "fixed_amount"
              ? Math.min(100, (newTotal / goal.targetAmount) * 100)
              : 0; // Open-ended goals don't have a percentage

          return {
            ...goalAllocation,
            progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
            newTotal: newTotal,
            targetAmount: goal.targetAmount,
            goalType: goal.goalType,
            isCompleted:
              goal.goalType === "fixed_amount" && newTotal >= goal.targetAmount,
          };
        }
      );

      return {
        month: month.month,
        monthLabel: formatMonth(month.month),
        goalBreakdown: enhancedGoalBreakdown,
        totalAllocation: month.goalContributions,
        surplus,
        remainingSurplus: Math.max(0, surplus - month.goalContributions),
      };
    });

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      appName: "Finance Planner",
      dataType: "monthly-goal-allocation",
      period: `${allocationData.length} months`,
    },
    summary: {
      totalAllocated: allocationData.reduce(
        (sum, month) => sum + month.totalAllocation,
        0
      ),
      averageMonthlyAllocation:
        allocationData.reduce((sum, month) => sum + month.totalAllocation, 0) /
        allocationData.length,
      totalSurplus: allocationData.reduce(
        (sum, month) => sum + month.surplus,
        0
      ),
      allocationEfficiency: (() => {
        const total = allocationData.reduce(
          (sum, month) => sum + month.surplus,
          0
        );
        const allocated = allocationData.reduce(
          (sum, month) => sum + month.totalAllocation,
          0
        );
        return total > 0 ? (allocated / total) * 100 : 0;
      })(),
    },
    monthlyAllocations: allocationData,
    goalProgress: forecastResult.goalProgress,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Helper function to format month for display
 */
function formatMonth(monthKey: string): string {
  const date = new Date(monthKey + "-01");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

/**
 * Helper function to format currency values
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
