/**
 * Financial State Reducer
 *
 * This file contains the main reducer function that handles all state transitions
 * for the financial planning application. It processes actions and returns new state.
 */

import { FinancialState, FinancialAction, FinancialActionType } from "./types";
import {
  initialErrorState,
  createFreshInitialState,
  mergeWithInitialState,
} from "./initialState";
import {
  UserPlan,
  FinancialSummary,
  ExpenseCategory,
  GoalCategory,
  Frequency,
} from "../types";
import { calculateMonthlyAmount } from "../utils/expenseOperations";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate financial summary from user plan data
 */
function calculateFinancialSummary(userPlan: UserPlan): FinancialSummary {
  // Calculate total monthly income
  const totalMonthlyIncome = userPlan.income
    .filter((income) => income.isActive)
    .reduce((total, income) => {
      switch (income.frequency) {
        case Frequency.MONTHLY:
          return total + income.amount;
        case Frequency.WEEKLY:
          return total + income.amount * 4.33; // Average weeks per month
        case Frequency.BIWEEKLY:
          return total + income.amount * 2.17; // Average bi-weeks per month
        case Frequency.DAILY:
          return total + income.amount * 30.44; // Average days per month
        case Frequency.QUARTERLY:
          return total + income.amount / 3;
        case Frequency.YEARLY:
          return total + income.amount / 12;
        default:
          return total;
      }
    }, 0);

  // Calculate total monthly expenses using unified calculation
  const totalMonthlyExpenses = userPlan.expenses
    .filter((expense) => expense.isActive)
    .reduce((total, expense) => {
      // Use the unified calculation function for consistency
      const monthlyAmount = calculateMonthlyAmount(expense);
      return total + monthlyAmount;
    }, 0);

  // Calculate goal progress
  const totalGoalProgress = userPlan.goals
    .filter((goal) => goal.isActive)
    .reduce((total, goal) => total + goal.currentAmount, 0);

  const totalGoalTarget = userPlan.goals
    .filter((goal) => goal.isActive)
    .reduce((total, goal) => total + goal.targetAmount, 0);

  // Calculate savings rate
  const savingsRate =
    totalMonthlyIncome > 0
      ? ((totalMonthlyIncome - totalMonthlyExpenses) / totalMonthlyIncome) * 100
      : 0;

  // Calculate projected balance (next month)
  const projectedBalance =
    userPlan.currentBalance + totalMonthlyIncome - totalMonthlyExpenses;

  // Calculate expenses by category using unified calculation
  const expensesByCategory = userPlan.expenses
    .filter((expense) => expense.isActive)
    .reduce((categoryTotals, expense) => {
      // Use the unified calculation function for consistency
      const monthlyAmount = calculateMonthlyAmount(expense);

      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + monthlyAmount;
      return categoryTotals;
    }, {} as Record<ExpenseCategory, number>);

  // Ensure all categories are present
  Object.values(ExpenseCategory).forEach((category) => {
    if (!(category in expensesByCategory)) {
      expensesByCategory[category] = 0;
    }
  });

  // Calculate goals by category
  const goalsByCategory = userPlan.goals
    .filter((goal) => goal.isActive)
    .reduce((categoryTotals, goal) => {
      categoryTotals[goal.category] =
        (categoryTotals[goal.category] || 0) + goal.currentAmount;
      return categoryTotals;
    }, {} as Record<GoalCategory, number>);

  // Ensure all categories are present
  Object.values(GoalCategory).forEach((category) => {
    if (!(category in goalsByCategory)) {
      goalsByCategory[category] = 0;
    }
  });

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    totalGoalProgress,
    totalGoalTarget,
    currentBalance: userPlan.currentBalance,
    projectedBalance,
    savingsRate,
    expensesByCategory,
    goalsByCategory,
  };
}

/**
 * Update the user plan's updatedAt timestamp
 */
function updateUserPlanTimestamp(userPlan: UserPlan): UserPlan {
  return {
    ...userPlan,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Update the entire state with new user plan and calculated summary
 */
function updateStateWithUserPlan(
  state: FinancialState,
  userPlan: UserPlan
): FinancialState {
  const updatedUserPlan = updateUserPlanTimestamp(userPlan);
  const financialSummary = calculateFinancialSummary(updatedUserPlan);

  return {
    ...state,
    userPlan: updatedUserPlan,
    financialSummary,
    lastUpdated: new Date().toISOString(),
    hasUnsavedChanges: true,
  };
}

// =============================================================================
// MAIN REDUCER FUNCTION
// =============================================================================

/**
 * Main reducer function for financial state management
 */
export function financialReducer(
  state: FinancialState,
  action: FinancialAction
): FinancialState {
  switch (action.type) {
    // State initialization
    case FinancialActionType.INITIALIZE_STATE:
      return mergeWithInitialState(action.payload);

    case FinancialActionType.RESET_STATE:
      return createFreshInitialState();

    // Loading states
    case FinancialActionType.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, isLoading: action.payload },
      };

    case FinancialActionType.SET_LOADING_INCOME:
      return {
        ...state,
        loading: { ...state.loading, isLoadingIncome: action.payload },
      };

    case FinancialActionType.SET_LOADING_EXPENSES:
      return {
        ...state,
        loading: { ...state.loading, isLoadingExpenses: action.payload },
      };

    case FinancialActionType.SET_LOADING_GOALS:
      return {
        ...state,
        loading: { ...state.loading, isLoadingGoals: action.payload },
      };

    case FinancialActionType.SET_LOADING_FORECAST:
      return {
        ...state,
        loading: { ...state.loading, isLoadingForecast: action.payload },
      };

    case FinancialActionType.SET_SAVING:
      return {
        ...state,
        loading: { ...state.loading, isSaving: action.payload },
      };

    // Error states
    case FinancialActionType.SET_ERROR:
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.errorType]: action.payload.message,
        },
      };

    case FinancialActionType.CLEAR_ERROR:
      if (action.payload) {
        // Clear specific error
        return {
          ...state,
          error: {
            ...state.error,
            [action.payload]: null,
          },
        };
      } else {
        // Clear all errors
        return {
          ...state,
          error: initialErrorState,
        };
      }

    // Income actions
    case FinancialActionType.ADD_INCOME:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        income: [...state.userPlan.income, action.payload],
      });

    case FinancialActionType.UPDATE_INCOME:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        income: state.userPlan.income.map((income) =>
          income.id === action.payload.id ? action.payload : income
        ),
      });

    case FinancialActionType.DELETE_INCOME:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        income: state.userPlan.income.filter(
          (income) => income.id !== action.payload
        ),
      });

    case FinancialActionType.SET_INCOME_LIST:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        income: action.payload,
      });

    // Expense actions
    case FinancialActionType.ADD_EXPENSE:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        expenses: [...state.userPlan.expenses, action.payload],
      });

    case FinancialActionType.UPDATE_EXPENSE:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        expenses: state.userPlan.expenses.map((expense) =>
          expense.id === action.payload.id ? action.payload : expense
        ),
      });

    case FinancialActionType.DELETE_EXPENSE:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        expenses: state.userPlan.expenses.filter(
          (expense) => expense.id !== action.payload
        ),
      });

    case FinancialActionType.SET_EXPENSE_LIST:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        expenses: action.payload,
      });

    // Goal actions
    case FinancialActionType.ADD_GOAL:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        goals: [...state.userPlan.goals, action.payload],
      });

    case FinancialActionType.UPDATE_GOAL:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        goals: state.userPlan.goals.map((goal) =>
          goal.id === action.payload.id ? action.payload : goal
        ),
      });

    case FinancialActionType.DELETE_GOAL:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        goals: state.userPlan.goals.filter(
          (goal) => goal.id !== action.payload
        ),
      });

    case FinancialActionType.SET_GOAL_LIST:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        goals: action.payload,
      });

    // Forecast actions
    case FinancialActionType.SET_FORECAST:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        forecast: action.payload,
      });

    case FinancialActionType.REGENERATE_FORECAST:
      // This would trigger forecast regeneration (handled by middleware/effects)
      return {
        ...state,
        loading: { ...state.loading, isLoadingForecast: true },
      };

    case FinancialActionType.UPDATE_FORECAST_CONFIG:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        forecastConfig: {
          ...state.userPlan.forecastConfig,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        },
      });

    // UserPlan actions
    case FinancialActionType.SET_USER_PLAN:
      return updateStateWithUserPlan(state, action.payload);

    case FinancialActionType.UPDATE_CURRENT_BALANCE:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        currentBalance: action.payload,
      });

    // Data persistence actions
    case FinancialActionType.SAVE_SUCCESS:
      return {
        ...state,
        hasUnsavedChanges: false,
        loading: { ...state.loading, isSaving: false },
        error: { ...state.error, generalError: null },
      };

    case FinancialActionType.SAVE_ERROR:
      return {
        ...state,
        loading: { ...state.loading, isSaving: false },
        error: { ...state.error, generalError: action.payload },
      };

    case FinancialActionType.LOAD_SUCCESS:
      return {
        ...updateStateWithUserPlan(state, action.payload),
        loading: { ...state.loading, isLoading: false },
        error: { ...state.error, generalError: null },
        hasUnsavedChanges: false, // Just loaded, so no unsaved changes
      };

    case FinancialActionType.LOAD_ERROR:
      return {
        ...state,
        loading: { ...state.loading, isLoading: false },
        error: { ...state.error, generalError: action.payload },
      };

    // UI state actions
    case FinancialActionType.MARK_UNSAVED_CHANGES:
      return {
        ...state,
        hasUnsavedChanges: true,
      };

    case FinancialActionType.MARK_SAVED:
      return {
        ...state,
        hasUnsavedChanges: false,
      };

    // Credit Card Account actions
    case FinancialActionType.ADD_CREDIT_CARD_ACCOUNT:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        creditCardAccounts: [
          ...(state.userPlan.creditCardAccounts || []),
          action.payload,
        ],
      });

    case FinancialActionType.UPDATE_CREDIT_CARD_ACCOUNT:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        creditCardAccounts: (state.userPlan.creditCardAccounts || []).map(
          (account) =>
            account.id === action.payload.id ? action.payload : account
        ),
      });

    case FinancialActionType.DELETE_CREDIT_CARD_ACCOUNT:
      return updateStateWithUserPlan(state, {
        ...state.userPlan,
        creditCardAccounts: (state.userPlan.creditCardAccounts || []).filter(
          (account) => account.id !== action.payload
        ),
      });

    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn("Unknown action type:", (action as any).type);
      return state;
  }
}

// =============================================================================
// REDUCER MIDDLEWARE/ENHANCERS
// =============================================================================

/**
 * Enhanced reducer that includes logging and error handling
 */
export function enhancedFinancialReducer(
  state: FinancialState,
  action: FinancialAction
): FinancialState {
  try {
    // Log actions in development
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Financial Action:", action.type, action.payload);
    }

    const newState = financialReducer(state, action);

    // Log state changes in development
    if (process.env.NODE_ENV === "development") {
      console.log("📊 State Updated:", {
        action: action.type,
        hasUnsavedChanges: newState.hasUnsavedChanges,
        currentBalance: newState.userPlan.currentBalance,
        totalIncome: newState.financialSummary.totalMonthlyIncome,
        totalExpenses: newState.financialSummary.totalMonthlyExpenses,
      });
    }

    return newState;
  } catch (error) {
    console.error("❌ Reducer Error:", error);

    // Return state with error set
    return {
      ...state,
      error: {
        ...state.error,
        generalError:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}
