/**
 * Core Data Models for Finance Planner Application
 *
 * This file defines the TypeScript interfaces for all financial data structures
 * used throughout the application.
 */

// =============================================================================
// ENUMS AND UTILITY TYPES
// =============================================================================

/**
 * Frequency options for recurring financial items
 */
export enum Frequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
  ONE_TIME = "one_time",
}

/**
 * Common expense categories
 */
export enum ExpenseCategory {
  HOUSING = "housing",
  TRANSPORTATION = "transportation",
  FOOD = "food",
  UTILITIES = "utilities",
  INSURANCE = "insurance",
  HEALTHCARE = "healthcare",
  ENTERTAINMENT = "entertainment",
  PERSONAL_CARE = "personal_care",
  EDUCATION = "education",
  DEBT_PAYMENTS = "debt_payments",
  SAVINGS = "savings",
  TRAVEL = "travel",
  SHOPPING = "shopping",
  KIDS = "kids",
  MISCELLANEOUS = "miscellaneous",
}

/**
 * Priority levels for goals and expenses
 */
export enum Priority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Goal categories for better organization
 */
export enum GoalCategory {
  EMERGENCY_FUND = "emergency_fund",
  RETIREMENT = "retirement",
  EDUCATION = "education",
  HOME_PURCHASE = "home_purchase",
  VACATION = "vacation",
  DEBT_PAYOFF = "debt_payoff",
  MAJOR_PURCHASE = "major_purchase",
  INVESTMENT = "investment",
  OTHER = "other",
}

/**
 * Goal types for allocation behavior
 */
export enum GoalType {
  FIXED_AMOUNT = "fixed_amount",
  OPEN_ENDED = "open_ended",
}

// =============================================================================
// CORE DATA INTERFACES
// =============================================================================

/**
 * Represents an income source
 */
export interface Income {
  /** Unique identifier for the income source */
  id: string;

  /** Name/description of the income source */
  name: string;

  /** Amount of income per frequency period */
  amount: number;

  /** How often this income is received */
  frequency: Frequency;

  /** Optional detailed description */
  description?: string;

  /** Start date for this income (ISO 8601 format) */
  startDate: string;

  /** End date for this income (ISO 8601 format) - null for ongoing */
  endDate?: string;

  /** Whether this income is active */
  isActive: boolean;

  /** When this record was created */
  createdAt: string;

  /** When this record was last updated */
  updatedAt: string;
}

export enum PaymentMethod {
  PIX = "pix",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  CASH = "cash",
}

export enum CreditCardAccount {
  INTER = "inter",
  XP = "xp",
}

/**
 * Represents a credit card account with configuration details
 */
export interface CreditCardAccountInfo {
  /** Unique identifier */
  id: string;
  /** Display name of the card */
  name: string;
  /** Day of the month the bill is due */
  dueDay: number;
  /** Day of the month the billing cycle closes */
  closingDay: number;
  /** Card color for UI display */
  color?: string;
  /** Whether this card is active */
  isActive: boolean;
  /** When this record was created */
  createdAt: string;
  /** When this record was last updated */
  updatedAt: string;
}

/**
 * Represents an expense item
 */
export interface Expense {
  /** Unique identifier for the expense */
  id: string;

  /** Name of the expense */
  name: string;

  /** Amount of the expense */
  amount: number;

  /** Category of expense */
  category: ExpenseCategory;

  /** Due date for this expense (ISO 8601 format) */
  dueDate: string;

  /** Payment method used */
  paymentMethod: PaymentMethod;

  /** If payment method is Credit Card, which account */
  creditCardAccount?: CreditCardAccount;

  /** Whether this expense is recurring */
  recurring: boolean;

  /** If recurring, the frequency of recurrence */
  frequency?: Frequency;

  /** For weekly recurring expenses, the custom interval (e.g., every X weeks) */
  recurringWeeksInterval?: number;

  /** Optional detailed description */
  description?: string;

  /** Priority level of this expense */
  priority: Priority;

  /** Whether this expense is active */
  isActive: boolean;

  /** Whether this expense is paid in installments */
  isInstallment?: boolean;

  /** Number of months for installment payments */
  installmentMonths?: number;

  /** Starting month for installment payments (YYYY-MM format) */
  installmentStartMonth?: string;

  /** When this record was created */
  createdAt: string;

  /** When this record was last updated */
  updatedAt: string;
}

/**
 * Configuration for forecast generation and display
 */
export interface ForecastConfig {
  /** Starting balance for forecast calculations */
  startingBalance: number;

  /** Start date for forecast (ISO 8601 format) - defaults to current month */
  startDate: string;

  /** Number of months to forecast */
  months: number;

  /** Whether to include goal contributions in projections */
  includeGoalContributions: boolean;

  /** Conservative mode reduces income by 10% and increases expenses by 10% */
  conservativeMode: boolean;

  /** When this configuration was last updated */
  updatedAt: string;
}

/**
 * Represents a financial goal
 */
export interface Goal {
  /** Unique identifier for the goal */
  id: string;

  /** Name of the goal */
  name: string;

  /** Target amount to reach */
  targetAmount: number;

  /** Target date to achieve this goal (ISO 8601 format) */
  targetDate: string;

  /** Current amount saved toward this goal */
  currentAmount: number;

  /** Optional detailed description */
  description?: string;

  /** Category of goal */
  category: GoalCategory;

  /** Priority level of this goal */
  priority: Priority;

  /** Whether this goal is active */
  isActive: boolean;

  /** Type of goal - fixed amount or open-ended */
  goalType: GoalType;

  /** Priority order for allocation (lower number = higher priority) */
  priorityOrder: number;

  /** When this record was created */
  createdAt: string;

  /** When this record was last updated */
  updatedAt: string;
}

/**
 * Represents a financial forecast for a specific month
 */
export interface Forecast {
  /** Unique identifier for the forecast */
  id: string;

  /** Month of the forecast (YYYY-MM format) */
  month: string;

  /** Projected balance at the end of the month */
  projectedBalance: number;

  /** Total projected income for the month */
  projectedIncome: number;

  /** Total projected expenses for the month */
  projectedExpenses: number;

  /** Projected contributions to goals */
  projectedGoalContributions: number;

  /** Starting balance for the month */
  startingBalance: number;

  /** Net change for the month (income - expenses - goal contributions) */
  netChange: number;

  /** When this forecast was generated */
  generatedAt: string;
}

// =============================================================================
// AGGREGATE INTERFACES
// =============================================================================

/**
 * Complete user financial plan
 */
export interface UserPlan {
  /** Unique identifier for the user plan */
  id: string;

  /** User's income sources */
  income: Income[];

  /** User's expenses */
  expenses: Expense[];

  /** User's financial goals */
  goals: Goal[];

  /** User's financial forecast */
  forecast: Forecast[];

  /** Current total balance */
  currentBalance: number;

  /** Forecast configuration settings */
  forecastConfig: ForecastConfig;

  /** User's credit card accounts */
  creditCardAccounts: CreditCardAccountInfo[];

  /** When this plan was created */
  createdAt: string;

  /** When this plan was last updated */
  updatedAt: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type for creating new records (without system-generated fields)
 */
export type CreateIncomeInput = Omit<Income, "id" | "createdAt" | "updatedAt">;
export type CreateExpenseInput = Omit<
  Expense,
  "id" | "createdAt" | "updatedAt"
>;
export type CreateGoalInput = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type CreateCreditCardAccountInput = Omit<CreditCardAccountInfo, "id" | "createdAt" | "updatedAt">;
export type UpdateCreditCardAccountInput = Partial<Omit<CreditCardAccountInfo, "id" | "createdAt">> & {
  id: string;
};

/**
 * Type for updating existing records (all fields optional except id)
 */
export type UpdateIncomeInput = Partial<Omit<Income, "id" | "createdAt">> & {
  id: string;
};
export type UpdateExpenseInput = Partial<Omit<Expense, "id" | "createdAt">> & {
  id: string;
};
export type UpdateGoalInput = Partial<Omit<Goal, "id" | "createdAt">> & {
  id: string;
};

/**
 * Financial summary type for dashboard display
 */
export interface FinancialSummary {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  totalGoalProgress: number;
  totalGoalTarget: number;
  currentBalance: number;
  projectedBalance: number;
  savingsRate: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  goalsByCategory: Record<GoalCategory, number>;
}

/**
 * Monthly suggestion for financial planning
 */
export interface MonthlySuggestion {
  id: string;
  title: string;
  description: string;
  category: "income" | "expense" | "goal" | "general";
  priority: Priority;
  actionable: boolean;
  estimatedImpact: number;
  createdAt: string;
}
