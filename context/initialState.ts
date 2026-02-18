/**
 * Initial State for Financial Context
 *
 * This file defines the default/initial state values for the global
 * financial planning state management system.
 */

import { FinancialState, LoadingState, ErrorState } from "./types";
import {
  UserPlan,
  FinancialSummary,
  ForecastConfig,
  ExpenseCategory,
  GoalCategory,
  Frequency,
  Priority,
  GoalType,
} from "../types";

// =============================================================================
// INITIAL STATE DEFINITIONS
// =============================================================================

/**
 * Default forecast configuration
 */
export const initialForecastConfig: ForecastConfig = {
  startingBalance: 0,
  startDate: new Date().toISOString().slice(0, 7), // Current month (YYYY-MM)
  months: 12,
  includeGoalContributions: true,
  conservativeMode: false,
  updatedAt: new Date().toISOString(),
};

/**
 * Initial loading state - all loading flags set to false
 */
export const initialLoadingState: LoadingState = {
  isLoading: false,
  isLoadingIncome: false,
  isLoadingExpenses: false,
  isLoadingGoals: false,
  isLoadingForecast: false,
  isSaving: false,
};

/**
 * Initial error state - all errors cleared
 */
export const initialErrorState: ErrorState = {
  generalError: null,
  incomeError: null,
  expenseError: null,
  goalError: null,
  forecastError: null,
};

/**
 * Initial user plan with empty arrays and default values
 */
export const initialUserPlan: UserPlan = {
  id: "default-plan",
  income: [],
  expenses: [],
  goals: [],
  forecast: [],
  currentBalance: 0,
  forecastConfig: initialForecastConfig,
  creditCardAccounts: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Initial financial summary with zero values
 */
export const initialFinancialSummary: FinancialSummary = {
  totalMonthlyIncome: 0,
  totalMonthlyExpenses: 0,
  totalGoalProgress: 0,
  totalGoalTarget: 0,
  currentBalance: 0,
  projectedBalance: 0,
  savingsRate: 0,
  expensesByCategory: {
    [ExpenseCategory.HOUSING]: 0,
    [ExpenseCategory.TRANSPORTATION]: 0,
    [ExpenseCategory.FOOD]: 0,
    [ExpenseCategory.UTILITIES]: 0,
    [ExpenseCategory.INSURANCE]: 0,
    [ExpenseCategory.HEALTHCARE]: 0,
    [ExpenseCategory.ENTERTAINMENT]: 0,
    [ExpenseCategory.PERSONAL_CARE]: 0,
    [ExpenseCategory.EDUCATION]: 0,
    [ExpenseCategory.DEBT_PAYMENTS]: 0,
    [ExpenseCategory.SAVINGS]: 0,
    [ExpenseCategory.TRAVEL]: 0,
    [ExpenseCategory.SHOPPING]: 0,
    [ExpenseCategory.KIDS]: 0,
    [ExpenseCategory.MISCELLANEOUS]: 0,
  },
  goalsByCategory: {
    [GoalCategory.EMERGENCY_FUND]: 0,
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
 * Complete initial state for the financial context
 */
export const initialFinancialState: FinancialState = {
  // Core data
  userPlan: initialUserPlan,

  // Computed data
  financialSummary: initialFinancialSummary,

  // UI state
  loading: initialLoadingState,
  error: initialErrorState,

  // Meta information
  lastUpdated: new Date().toISOString(),
  hasUnsavedChanges: false,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a fresh initial state with current timestamps
 */
export function createFreshInitialState(): FinancialState {
  const now = new Date().toISOString();

  return {
    ...initialFinancialState,
    userPlan: {
      ...initialUserPlan,
      createdAt: now,
      updatedAt: now,
    },
    lastUpdated: now,
  };
}

/**
 * Reset state to initial values while preserving certain fields
 */
export function resetToInitialState(preserveId?: boolean): FinancialState {
  const fresh = createFreshInitialState();

  if (preserveId && initialFinancialState.userPlan.id !== "default-plan") {
    fresh.userPlan.id = initialFinancialState.userPlan.id;
  }

  return fresh;
}

/**
 * Merge partial state with initial state
 */
export function mergeWithInitialState(
  partialState: Partial<FinancialState>
): FinancialState {
  return {
    ...initialFinancialState,
    ...partialState,
    userPlan: {
      ...initialUserPlan,
      ...partialState.userPlan,
    },
    loading: {
      ...initialLoadingState,
      ...partialState.loading,
    },
    error: {
      ...initialErrorState,
      ...partialState.error,
    },
    financialSummary: {
      ...initialFinancialSummary,
      ...partialState.financialSummary,
    },
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate that a state object has all required properties
 */
export function validateState(state: unknown): state is FinancialState {
  try {
    if (!state || typeof state !== "object" || state === null) {
      return false;
    }

    const stateObj = state as Record<string, unknown>;

    return (
      "userPlan" in stateObj &&
      "financialSummary" in stateObj &&
      "loading" in stateObj &&
      "error" in stateObj &&
      "lastUpdated" in stateObj &&
      typeof stateObj.lastUpdated === "string" &&
      "hasUnsavedChanges" in stateObj &&
      typeof stateObj.hasUnsavedChanges === "boolean"
    );
  } catch {
    return false;
  }
}

/**
 * Get a safe state object, falling back to initial state if invalid
 */
export function getSafeState(potentialState: unknown): FinancialState {
  if (validateState(potentialState)) {
    return potentialState as FinancialState;
  }

  console.warn("Invalid state detected, falling back to initial state");
  return createFreshInitialState();
}
