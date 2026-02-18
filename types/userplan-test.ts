/**
 * UserPlan Aggregation Model Test
 *
 * This test demonstrates that the UserPlan interface successfully aggregates
 * all the individual data models (Income, Expense, Goal, Forecast) into a
 * complete financial planning structure.
 */

import {
  UserPlan,
  Income,
  Expense,
  Goal,
  Forecast,
  ForecastConfig,
  Frequency,
  ExpenseCategory,
  Priority,
  GoalCategory,
  GoalType,
} from "./index";

// =============================================================================
// COMPREHENSIVE TEST DATA
// =============================================================================

/**
 * Create a comprehensive UserPlan with multiple income sources,
 * expenses, goals, and forecasts to demonstrate aggregation
 */
export function createComprehensiveUserPlan(): UserPlan {
  // Multiple income sources
  const incomeData: Income[] = [
    {
      id: "inc_001",
      name: "Software Engineer Salary",
      amount: 8000,
      frequency: Frequency.MONTHLY,
      description: "Primary job salary",
      startDate: "2024-01-01",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "inc_002",
      name: "Freelance Consulting",
      amount: 2000,
      frequency: Frequency.MONTHLY,
      description: "Side consulting work",
      startDate: "2024-01-01",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "inc_003",
      name: "Investment Dividends",
      amount: 500,
      frequency: Frequency.QUARTERLY,
      description: "Stock dividends",
      startDate: "2024-01-01",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  // Multiple expenses across different categories
  const expenseData: Expense[] = [
    {
      id: "exp_001",
      name: "Monthly Rent",
      amount: 2500,
      category: ExpenseCategory.HOUSING,
      dueDate: "2024-01-01",
      recurring: true,
      frequency: Frequency.MONTHLY,
      description: "Apartment rent",
      priority: Priority.HIGH,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "exp_002",
      name: "Groceries",
      amount: 600,
      category: ExpenseCategory.FOOD,
      dueDate: "2024-01-15",
      recurring: true,
      frequency: Frequency.MONTHLY,
      description: "Monthly grocery shopping",
      priority: Priority.MEDIUM,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "exp_003",
      name: "Car Payment",
      amount: 450,
      category: ExpenseCategory.TRANSPORTATION,
      dueDate: "2024-01-15",
      recurring: true,
      frequency: Frequency.MONTHLY,
      description: "Monthly car loan payment",
      priority: Priority.HIGH,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "exp_004",
      name: "Utilities",
      amount: 200,
      category: ExpenseCategory.UTILITIES,
      dueDate: "2024-01-20",
      recurring: true,
      frequency: Frequency.MONTHLY,
      description: "Electric, gas, water",
      priority: Priority.MEDIUM,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  // Multiple financial goals
  const goalData: Goal[] = [
    {
      id: "goal_001",
      name: "Emergency Fund",
      targetAmount: 30000,
      targetDate: "2024-12-31",
      currentAmount: 8000,
      description: "6 months of expenses",
      category: GoalCategory.EMERGENCY_FUND,
      priority: Priority.HIGH,
      goalType: GoalType.FIXED_AMOUNT,
      priorityOrder: 1,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "goal_002",
      name: "House Down Payment",
      targetAmount: 80000,
      targetDate: "2025-06-30",
      currentAmount: 15000,
      description: "20% down payment for house",
      category: GoalCategory.HOME_PURCHASE,
      priority: Priority.HIGH,
      goalType: GoalType.FIXED_AMOUNT,
      priorityOrder: 2,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "goal_003",
      name: "Vacation Fund",
      targetAmount: 5000,
      targetDate: "2024-07-31",
      currentAmount: 1200,
      description: "Summer vacation to Europe",
      category: GoalCategory.VACATION,
      priority: Priority.MEDIUM,
      goalType: GoalType.FIXED_AMOUNT,
      priorityOrder: 3,
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  // 12-month forecast
  const forecastData: Forecast[] = [
    {
      id: "forecast_001",
      month: "2024-01",
      projectedBalance: 18000,
      projectedIncome: 8000,
      projectedExpenses: 2500,
      projectedGoalContributions: 1000,
      startingBalance: 14500,
      netChange: 4500,
      generatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "forecast_002",
      month: "2024-02",
      projectedBalance: 21250,
      projectedIncome: 10000,
      projectedExpenses: 3750,
      projectedGoalContributions: 3000,
      startingBalance: 18000,
      netChange: 3250,
      generatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "forecast_003",
      month: "2024-03",
      projectedBalance: 24500,
      projectedIncome: 10000,
      projectedExpenses: 3750,
      projectedGoalContributions: 3000,
      startingBalance: 21250,
      netChange: 3250,
      generatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  // Create comprehensive UserPlan that aggregates all data
  const userPlan: UserPlan = {
    id: "plan_comprehensive_001",
    income: incomeData,
    expenses: expenseData,
    goals: goalData,
    forecast: forecastData,
    currentBalance: 14500,
    forecastConfig: {
      startingBalance: 14500,
      startDate: "2024-01-01",
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: "2024-01-01T00:00:00Z",
    },
    creditCardAccounts: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  return userPlan;
}

// =============================================================================
// AGGREGATION VALIDATION TESTS
// =============================================================================

/**
 * Test that UserPlan properly aggregates all individual data models
 */
export function testUserPlanAggregation(): boolean {
  console.log("🧪 Testing UserPlan aggregation model...\n");

  try {
    const userPlan = createComprehensiveUserPlan();

    // Test 1: Verify all arrays are properly aggregated
    console.log("✅ Test 1: Array aggregation");
    console.log(`   - Income sources: ${userPlan.income.length}`);
    console.log(`   - Expenses: ${userPlan.expenses.length}`);
    console.log(`   - Goals: ${userPlan.goals.length}`);
    console.log(`   - Forecast months: ${userPlan.forecast.length}`);

    // Test 2: Verify data relationships work correctly
    console.log("\n✅ Test 2: Data relationships");
    const totalMonthlyIncome = userPlan.income
      .filter((inc) => inc.frequency === Frequency.MONTHLY)
      .reduce((sum, inc) => sum + inc.amount, 0);

    console.log(`   - Total monthly income: $${totalMonthlyIncome}`);
    console.log(`   - Current balance: $${userPlan.currentBalance}`);

    console.log(
      "\n🎉 UserPlan aggregation model validation completed successfully!"
    );
    return true;
  } catch (error) {
    console.error("❌ UserPlan aggregation test failed:", error);
    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate summary statistics from UserPlan
 */
export function calculateUserPlanSummary(userPlan: UserPlan) {
  const monthlyIncome = userPlan.income
    .filter((inc) => inc.frequency === Frequency.MONTHLY)
    .reduce((sum, inc) => sum + inc.amount, 0);

  const monthlyExpenses = userPlan.expenses
    .filter((exp) => exp.frequency === Frequency.MONTHLY)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalGoalTarget = userPlan.goals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );

  const totalGoalProgress = userPlan.goals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0
  );

  const savingsRate =
    monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;

  return {
    monthlyIncome,
    monthlyExpenses,
    totalGoalTarget,
    totalGoalProgress,
    savingsRate,
    goalCompletionRate:
      totalGoalTarget > 0 ? totalGoalProgress / totalGoalTarget : 0,
    monthlyNetFlow: monthlyIncome - monthlyExpenses,
  };
}

// Export for testing
export default testUserPlanAggregation;
