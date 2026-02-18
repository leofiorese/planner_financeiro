/**
 * Financial Context Provider
 *
 * This file contains the React Context Provider that manages the global financial state
 * using useReducer. It provides state, dispatch, and convenience functions to child components.
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import {
  FinancialState,
  FinancialContextValue,
  FinancialProviderProps,
  ErrorState,
} from "./types";
import { enhancedFinancialReducer } from "./reducer";
import { createFreshInitialState, mergeWithInitialState } from "./initialState";
import * as actions from "./actions";
import {
  CreateIncomeInput,
  CreateExpenseInput,
  CreateGoalInput,
  UpdateIncomeInput,
  UpdateExpenseInput,
  UpdateGoalInput,
  Income,
  Expense,
  Goal,
  ForecastConfig,
  CreateCreditCardAccountInput,
  UpdateCreditCardAccountInput,
  CreditCardAccountInfo,
} from "../types";

// =============================================================================
// CONTEXT CREATION
// =============================================================================

/**
 * Financial Context - provides access to financial state and actions
 */
const FinancialContext = createContext<FinancialContextValue | undefined>(
  undefined
);

/**
 * Custom hook to access the Financial Context
 * Throws error if used outside of FinancialProvider
 */
export function useFinancialContext(): FinancialContextValue {
  const context = useContext(FinancialContext);

  if (context === undefined) {
    throw new Error(
      "useFinancialContext must be used within a FinancialProvider"
    );
  }

  return context;
}

/**
 * Financial Provider Component
 *
 * This component provides financial state management to its children using React Context
 * and useReducer. It includes all the convenience functions for managing financial data.
 */
export function FinancialProvider({
  children,
  initialState,
}: FinancialProviderProps) {
  // Initialize state with provided initial state or fresh state
  const [state, dispatch] = useReducer(
    enhancedFinancialReducer,
    initialState
      ? mergeWithInitialState(initialState)
      : createFreshInitialState()
  );

  // Auto-load user plan on mount (for any page)
  useEffect(() => {
    // Load user plan if we have the default state (no real data loaded yet)
    if (
      state.userPlan.id === "default-plan" &&
      state.userPlan.income.length === 0 &&
      state.userPlan.expenses.length === 0 &&
      state.userPlan.goals.length === 0
    ) {
      const loadData = async () => {
        try {
          dispatch(actions.setLoading(true));
          dispatch(actions.clearError("generalError"));

          // Import storage function dynamically to avoid SSR issues
          const { loadUserPlan: loadFromStorage } = await import("./storage");
          const loadedPlan = await loadFromStorage();

          if (loadedPlan) {
            dispatch(actions.loadSuccess(loadedPlan));
          } else {
            dispatch(actions.setLoading(false));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load user plan";
          dispatch(actions.loadError(errorMessage));
        }
      };

      loadData();
    }
  }, []); // Empty dependency array - only run on mount

  // Auto-save user plan when data changes
  useEffect(() => {
    // Only auto-save if:
    // 1. We have real data (not default empty state) OR we have default plan with actual data
    // 2. We're not currently loading
    // 3. We have unsaved changes
    const hasRealData =
      state.userPlan.id !== "default-plan" ||
      state.userPlan.income.length > 0 ||
      state.userPlan.expenses.length > 0 ||
      state.userPlan.goals.length > 0;

    if (
      hasRealData &&
      !state.loading.isLoading &&
      !state.loading.isSaving &&
      state.hasUnsavedChanges
    ) {
      const saveData = async () => {
        try {
          const { saveUserPlan: saveToStorage } = await import("./storage");
          const savedPlan = await saveToStorage(state.userPlan);

          // If the ID changed (first save), update the state
          if (savedPlan.id !== state.userPlan.id) {
            dispatch(actions.setUserPlan(savedPlan));
          }

          dispatch(actions.saveSuccess());
        } catch (error) {
          console.error("Auto-save failed:", error);
          // Don't dispatch error to avoid disrupting user experience
        }
      };

      // Debounce auto-save to avoid excessive saves
      const timeoutId = setTimeout(saveData, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [
    state.userPlan,
    state.hasUnsavedChanges,
    state.loading.isLoading,
    state.loading.isSaving,
  ]);

  // Helper function to generate unique IDs
  const generateId = useCallback((prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // =============================================================================
  // CONVENIENCE FUNCTIONS FOR INCOME
  // =============================================================================

  const addIncome = useCallback(
    async (incomeInput: CreateIncomeInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingIncome(true));
        dispatch(actions.clearError("incomeError"));

        const newIncome: Income = {
          id: generateId("income"),
          ...incomeInput,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.addIncome(newIncome));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add income";
        dispatch(actions.setIncomeError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingIncome(false));
      }
    },
    [generateId]
  );

  const updateIncome = useCallback(
    async (incomeInput: UpdateIncomeInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingIncome(true));
        dispatch(actions.clearError("incomeError"));

        const existingIncome = state.userPlan.income.find(
          (inc) => inc.id === incomeInput.id
        );
        if (!existingIncome) {
          throw new Error("Income not found");
        }

        const updatedIncome: Income = {
          ...existingIncome,
          ...incomeInput,
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.updateIncome(updatedIncome));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update income";
        dispatch(actions.setIncomeError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingIncome(false));
      }
    },
    [state.userPlan.income]
  );

  const deleteIncome = useCallback(async (incomeId: string): Promise<void> => {
    try {
      dispatch(actions.setLoadingIncome(true));
      dispatch(actions.clearError("incomeError"));

      dispatch(actions.deleteIncome(incomeId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete income";
      dispatch(actions.setIncomeError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoadingIncome(false));
    }
  }, []);

  // =============================================================================
  // CONVENIENCE FUNCTIONS FOR EXPENSES
  // =============================================================================

  const addExpense = useCallback(
    async (expenseInput: CreateExpenseInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingExpenses(true));
        dispatch(actions.clearError("expenseError"));

        const newExpense: Expense = {
          id: generateId("expense"),
          ...expenseInput,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.addExpense(newExpense));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add expense";
        dispatch(actions.setExpenseError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingExpenses(false));
      }
    },
    [generateId]
  );

  const updateExpense = useCallback(
    async (expenseInput: UpdateExpenseInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingExpenses(true));
        dispatch(actions.clearError("expenseError"));

        const existingExpense = state.userPlan.expenses.find(
          (exp) => exp.id === expenseInput.id
        );
        if (!existingExpense) {
          throw new Error("Expense not found");
        }

        const updatedExpense: Expense = {
          ...existingExpense,
          ...expenseInput,
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.updateExpense(updatedExpense));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update expense";
        dispatch(actions.setExpenseError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingExpenses(false));
      }
    },
    [state.userPlan.expenses]
  );

  const deleteExpense = useCallback(
    async (expenseId: string): Promise<void> => {
      try {
        dispatch(actions.setLoadingExpenses(true));
        dispatch(actions.clearError("expenseError"));

        dispatch(actions.deleteExpense(expenseId));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete expense";
        dispatch(actions.setExpenseError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingExpenses(false));
      }
    },
    []
  );

  // =============================================================================
  // CONVENIENCE FUNCTIONS FOR GOALS
  // =============================================================================

  const addGoal = useCallback(
    async (goalInput: CreateGoalInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingGoals(true));
        dispatch(actions.clearError("goalError"));

        const newGoal: Goal = {
          id: generateId("goal"),
          ...goalInput,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.addGoal(newGoal));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to add goal";
        dispatch(actions.setGoalError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingGoals(false));
      }
    },
    [generateId]
  );

  const updateGoal = useCallback(
    async (goalInput: UpdateGoalInput): Promise<void> => {
      try {
        dispatch(actions.setLoadingGoals(true));
        dispatch(actions.clearError("goalError"));

        const existingGoal = state.userPlan.goals.find(
          (goal) => goal.id === goalInput.id
        );
        if (!existingGoal) {
          throw new Error("Goal not found");
        }

        const updatedGoal: Goal = {
          ...existingGoal,
          ...goalInput,
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.updateGoal(updatedGoal));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update goal";
        dispatch(actions.setGoalError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingGoals(false));
      }
    },
    [state.userPlan.goals]
  );

  const deleteGoal = useCallback(async (goalId: string): Promise<void> => {
    try {
      dispatch(actions.setLoadingGoals(true));
      dispatch(actions.clearError("goalError"));

      dispatch(actions.deleteGoal(goalId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete goal";
      dispatch(actions.setGoalError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoadingGoals(false));
    }
  }, []);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const regenerateForecast = useCallback(async (): Promise<void> => {
    try {
      dispatch(actions.setLoadingForecast(true));
      dispatch(actions.clearError("forecastError"));

      dispatch(actions.regenerateForecast());
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to regenerate forecast";
      dispatch(actions.setForecastError(errorMessage));
      throw error;
    } finally {
      dispatch(actions.setLoadingForecast(false));
    }
  }, []);

  const updateCurrentBalance = useCallback(
    async (balance: number): Promise<void> => {
      try {
        dispatch(actions.setSaving(true));
        dispatch(actions.clearError("generalError"));

        dispatch(actions.updateCurrentBalance(balance));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update balance";
        dispatch(actions.setGeneralError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setSaving(false));
      }
    },
    []
  );

  const updateForecastConfig = useCallback(
    async (config: Partial<ForecastConfig>): Promise<void> => {
      try {
        dispatch(actions.setLoadingForecast(true));
        dispatch(actions.clearError("forecastError"));

        dispatch(actions.updateForecastConfig(config));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update forecast config";
        dispatch(actions.setForecastError(errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoadingForecast(false));
      }
    },
    []
  );

  const saveUserPlan = useCallback(async (): Promise<void> => {
    try {
      dispatch(actions.setSaving(true));
      dispatch(actions.clearError("generalError"));

      // Import storage function dynamically to avoid SSR issues
      const { saveUserPlan: saveToStorage } = await import("./storage");
      const savedPlan = await saveToStorage(state.userPlan);

      // If the ID changed (first save), update the state
      if (savedPlan.id !== state.userPlan.id) {
        dispatch(actions.setUserPlan(savedPlan));
      }

      dispatch(actions.saveSuccess());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save user plan";
      dispatch(actions.saveError(errorMessage));
      throw error;
    }
  }, [state.userPlan]);

  const loadUserPlan = useCallback(async (): Promise<void> => {
    try {
      dispatch(actions.setLoading(true));
      dispatch(actions.clearError("generalError"));

      // Import storage function dynamically to avoid SSR issues
      const { loadUserPlan: loadFromStorage } = await import("./storage");
      const loadedPlan = await loadFromStorage();

      if (loadedPlan) {
        dispatch(actions.loadSuccess(loadedPlan));
      } else {
        dispatch(actions.setLoading(false));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load user plan";
      dispatch(actions.loadError(errorMessage));
      throw error;
    }
  }, []);

  const resetAll = useCallback((): void => {
    dispatch(actions.resetState());
  }, []);

  const clearError = useCallback((errorType?: keyof ErrorState): void => {
    dispatch(actions.clearError(errorType));
  }, []);

  // =============================================================================
  // CONVENIENCE FUNCTIONS FOR CREDIT CARD ACCOUNTS
  // =============================================================================

  const addCreditCardAccount = useCallback(
    async (
      input: CreateCreditCardAccountInput
    ): Promise<void> => {
      try {
        dispatch(actions.setLoading(true));

        const newAccount: CreditCardAccountInfo = {
          id: generateId("card"),
          ...input,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.addCreditCardAccount(newAccount));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to add credit card account";
        dispatch(actions.setError("generalError", errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    [generateId]
  );

  const updateCreditCardAccount = useCallback(
    async (
      input: UpdateCreditCardAccountInput
    ): Promise<void> => {
      try {
        dispatch(actions.setLoading(true));

        const existingAccount = state.userPlan.creditCardAccounts?.find(
          (acc) => acc.id === input.id
        );

        if (!existingAccount) {
          throw new Error("Credit card account not found");
        }

        const updatedAccount: CreditCardAccountInfo = {
          ...existingAccount,
          ...input,
          updatedAt: new Date().toISOString(),
        };

        dispatch(actions.updateCreditCardAccount(updatedAccount));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to update credit card account";
        dispatch(actions.setError("generalError", errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    [state.userPlan.creditCardAccounts]
  );

  const deleteCreditCardAccount = useCallback(
    async (cardId: string): Promise<void> => {
      try {
        dispatch(actions.setLoading(true));
        dispatch(actions.deleteCreditCardAccount(cardId));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete credit card account";
        dispatch(actions.setError("generalError", errorMessage));
        throw error;
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    []
  );

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: FinancialContextValue = {
    state,
    dispatch,
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    addGoal,
    updateGoal,
    deleteGoal,
    regenerateForecast,
    updateCurrentBalance,
    updateForecastConfig,
    saveUserPlan,
    loadUserPlan,
    resetAll,
    clearError,
    addCreditCardAccount,
    updateCreditCardAccount,
    deleteCreditCardAccount,
  };

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

export function useFinancialState(): FinancialState {
  const { state } = useFinancialContext();
  return state;
}

export function useFinancialActions() {
  const {
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    addGoal,
    updateGoal,
    deleteGoal,
    regenerateForecast,
    updateCurrentBalance,
    updateForecastConfig,
    saveUserPlan,
    loadUserPlan,
    resetAll,
    clearError,
    addCreditCardAccount,
    updateCreditCardAccount,
    deleteCreditCardAccount,
  } = useFinancialContext();

  return {
    addIncome,
    updateIncome,
    deleteIncome,
    addExpense,
    updateExpense,
    deleteExpense,
    addGoal,
    updateGoal,
    deleteGoal,
    regenerateForecast,
    updateCurrentBalance,
    updateForecastConfig,
    saveUserPlan,
    loadUserPlan,
    resetAll,
    clearError,
    addCreditCardAccount,
    updateCreditCardAccount,
    deleteCreditCardAccount,
  };
}

export function useLoadingState() {
  const { state } = useFinancialContext();
  return state.loading;
}

export function useErrorState() {
  const { state } = useFinancialContext();
  return state.error;
}

export function useFinancialSummary() {
  const { state } = useFinancialContext();
  return state.financialSummary;
}
