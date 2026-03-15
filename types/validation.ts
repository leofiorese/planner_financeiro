/**
 * Validation file for TypeScript interfaces
 *
 * This file creates dummy data objects to validate that all interfaces
 * are correctly defined and compile without errors.
 */

import {
  Income,
  Expense,
  Goal,
  Forecast,
  UserPlan,
  Frequency,
  ExpenseCategory,
  Priority,
  GoalCategory,
  CreateIncomeInput,
  CreateExpenseInput,
  CreateGoalInput,
  UpdateIncomeInput,
  UpdateExpenseInput,
  UpdateGoalInput,
  FinancialSummary,
  MonthlySuggestion,
  GoalType,
  ForecastConfig,
  PaymentMethod,
} from "./index";

// =============================================================================
// DUMMY DATA FOR TESTING
// =============================================================================

/**
 * Sample income data
 */
export const sampleIncome: Income = {
  id: "inc_001",
  name: "Software Engineer Salary",
  amount: 8000,
  frequency: Frequency.MONTHLY,
  description: "Monthly salary from tech company",
  startDate: "2024-01-01",
  endDate: undefined,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/**
 * Sample expense data
 */
export const sampleExpense: Expense = {
  id: "exp_001",
  name: "Monthly Rent",
  amount: 2500,
  category: ExpenseCategory.HOUSING,
  dueDate: "2024-01-01",
  paymentMethod: PaymentMethod.PIX,
  recurring: true,
  frequency: Frequency.MONTHLY,
  description: "Monthly apartment rent",
  priority: Priority.HIGH,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/**
 * Sample goal data
 */
export const sampleGoal: Goal = {
  id: "goal_001",
  name: "Emergency Fund",
  targetAmount: 25000,
  targetDate: "2024-12-31",
  currentAmount: 5000,
  description: "6 months of expenses for emergency situations",
  category: GoalCategory.EMERGENCY_FUND,
  priority: Priority.HIGH,
  isActive: true,
  goalType: GoalType.FIXED_AMOUNT,
  priorityOrder: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/**
 * Sample forecast data
 */
export const sampleForecast: Forecast = {
  id: "forecast_001",
  month: "2024-01",
  projectedBalance: 15000,
  projectedIncome: 8000,
  projectedExpenses: 4500,
  projectedGoalContributions: 1000,
  startingBalance: 12500,
  netChange: 2500,
  generatedAt: "2024-01-01T00:00:00Z",
};

/**
 * Sample user plan data
 */
export const sampleUserPlan: UserPlan = {
  id: "plan_001",
  income: [sampleIncome],
  expenses: [sampleExpense],
  goals: [sampleGoal],
  forecast: [sampleForecast],
  currentBalance: 12500,
  forecastConfig: {
    startingBalance: 12500,
    startDate: "2024-01",
    months: 12,
    includeGoalContributions: true,
    conservativeMode: false,
    updatedAt: "2024-01-01T00:00:00Z",
  },
  creditCardAccounts: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// =============================================================================
// TESTING CREATE INPUT TYPES
// =============================================================================

/**
 * Test create income input type
 */
export const createIncomeInput: CreateIncomeInput = {
  name: "Freelance Work",
  amount: 1500,
  frequency: Frequency.MONTHLY,
  description: "Monthly freelance consulting",
  startDate: "2024-01-01",
  isActive: true,
};

/**
 * Test create expense input type
 */
export const createExpenseInput: CreateExpenseInput = {
  name: "Groceries",
  amount: 400,
  category: ExpenseCategory.FOOD,
  dueDate: "2024-01-15",
  paymentMethod: PaymentMethod.PIX,
  recurring: true,
  frequency: Frequency.MONTHLY,
  description: "Monthly grocery shopping",
  priority: Priority.MEDIUM,
  isActive: true,
};

/**
 * Test create goal input type
 */
export const createGoalInput: CreateGoalInput = {
  name: "Vacation Fund",
  targetAmount: 5000,
  targetDate: "2024-06-30",
  currentAmount: 0,
  description: "Summer vacation to Europe",
  category: GoalCategory.VACATION,
  priority: Priority.MEDIUM,
  isActive: true,
  goalType: GoalType.FIXED_AMOUNT,
  priorityOrder: 2,
};

// =============================================================================
// TESTING UPDATE INPUT TYPES
// =============================================================================

/**
 * Test update income input type
 */
export const updateIncomeInput: UpdateIncomeInput = {
  id: "inc_001",
  amount: 8500,
  updatedAt: "2024-01-15T00:00:00Z",
};

/**
 * Test update expense input type
 */
export const updateExpenseInput: UpdateExpenseInput = {
  id: "exp_001",
  amount: 2600,
  updatedAt: "2024-01-15T00:00:00Z",
};

/**
 * Test update goal input type
 */
export const updateGoalInput: UpdateGoalInput = {
  id: "goal_001",
  currentAmount: 6000,
  updatedAt: "2024-01-15T00:00:00Z",
};

// =============================================================================
// TESTING UTILITY TYPES
// =============================================================================

/**
 * Test financial summary type
 */
export const sampleFinancialSummary: FinancialSummary = {
  totalMonthlyIncome: 8000,
  totalMonthlyExpenses: 4500,
  totalGoalProgress: 5000,
  totalGoalTarget: 25000,
  currentBalance: 12500,
  projectedBalance: 15000,
  savingsRate: 0.4375, // (8000 - 4500) / 8000
  expensesByCategory: {
    [ExpenseCategory.HOUSING]: 2500,
    [ExpenseCategory.FOOD]: 400,
    [ExpenseCategory.TRANSPORTATION]: 300,
    [ExpenseCategory.UTILITIES]: 200,
    [ExpenseCategory.INSURANCE]: 150,
    [ExpenseCategory.HEALTHCARE]: 100,
    [ExpenseCategory.ENTERTAINMENT]: 200,
    [ExpenseCategory.PERSONAL_CARE]: 100,
    [ExpenseCategory.EDUCATION]: 0,
    [ExpenseCategory.DEBT_PAYMENTS]: 500,
    [ExpenseCategory.SAVINGS]: 0,
    [ExpenseCategory.TRAVEL]: 0,
    [ExpenseCategory.SHOPPING]: 0,
    [ExpenseCategory.KIDS]: 0,
    [ExpenseCategory.MISCELLANEOUS]: 50,
    [ExpenseCategory.TAXES]: 0,
  },
  goalsByCategory: {
    [GoalCategory.EMERGENCY_FUND]: 5000,
    [GoalCategory.RETIREMENT]: 0,
    [GoalCategory.EDUCATION]: 0,
    [GoalCategory.HOME_PURCHASE]: 0,
    [GoalCategory.VACATION]: 0,
    [GoalCategory.DEBT_PAYOFF]: 0,
    [GoalCategory.MAJOR_PURCHASE]: 0,
    [GoalCategory.INVESTMENT]: 0,
    [GoalCategory.OTHER]: 0,
  },
};

/**
 * Test monthly suggestion type
 */
export const sampleMonthlySuggestion: MonthlySuggestion = {
  id: "suggestion_001",
  title: "Reduce Entertainment Spending",
  description:
    "Consider reducing entertainment expenses by $50/month to increase emergency fund contributions",
  category: "expense",
  priority: Priority.MEDIUM,
  actionable: true,
  estimatedImpact: 600, // $50 * 12 months
  createdAt: "2024-01-01T00:00:00Z",
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate all data structures compile correctly
 */
export function validateDataStructures(): boolean {
  try {
    // Test all interfaces can be instantiated
    const testIncome: Income = sampleIncome;
    const testExpense: Expense = sampleExpense;
    const testGoal: Goal = sampleGoal;
    const testForecast: Forecast = sampleForecast;
    const testUserPlan: UserPlan = sampleUserPlan;

    // Test create input types
    const testCreateIncome: CreateIncomeInput = createIncomeInput;
    const testCreateExpense: CreateExpenseInput = createExpenseInput;
    const testCreateGoal: CreateGoalInput = createGoalInput;

    // Test update input types
    const testUpdateIncome: UpdateIncomeInput = updateIncomeInput;
    const testUpdateExpense: UpdateExpenseInput = updateExpenseInput;
    const testUpdateGoal: UpdateGoalInput = updateGoalInput;

    // Test utility types
    const testFinancialSummary: FinancialSummary = sampleFinancialSummary;
    const testMonthlySuggestion: MonthlySuggestion = sampleMonthlySuggestion;

    // All validations passed
    console.log("✅ All TypeScript interfaces validated successfully!");
    console.log("✅ Sample data structures created without errors");
    console.log("✅ Create and Update input types work correctly");
    console.log("✅ Utility types compile successfully");

    return true;
  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}

// Export validation function for testing
export default validateDataStructures;
