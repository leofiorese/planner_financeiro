/**
 * Action Creators for Financial Context
 *
 * This file contains action creator functions that return properly typed
 * action objects for the financial state reducer.
 */

import {
  FinancialActionType,
  FinancialAction,
  InitializeStateAction,
  ResetStateAction,
  SetLoadingAction,
  SetLoadingSpecificAction,
  SetErrorAction,
  ClearErrorAction,
  AddIncomeAction,
  UpdateIncomeAction,
  DeleteIncomeAction,
  SetIncomeListAction,
  AddExpenseAction,
  UpdateExpenseAction,
  DeleteExpenseAction,
  SetExpenseListAction,
  AddGoalAction,
  UpdateGoalAction,
  DeleteGoalAction,
  SetGoalListAction,
  SetForecastAction,
  RegenerateForecastAction,
  UpdateForecastConfigAction,
  SetUserPlanAction,
  UpdateCurrentBalanceAction,
  SaveSuccessAction,
  SaveErrorAction,
  LoadSuccessAction,
  LoadErrorAction,
  MarkUnsavedChangesAction,
  MarkSavedAction,
  AddCreditCardAccountAction,
  UpdateCreditCardAccountAction,
  DeleteCreditCardAccountAction,
  FinancialState,
  ErrorState,
} from "./types";
import {
  Income,
  Expense,
  Goal,
  Forecast,
  UserPlan,
  ForecastConfig,
  CreditCardAccountInfo,
} from "../types";

// =============================================================================
// STATE INITIALIZATION ACTION CREATORS
// =============================================================================

/**
 * Initialize the state with provided values
 */
export const initializeState = (
  partialState: Partial<FinancialState>
): InitializeStateAction => ({
  type: FinancialActionType.INITIALIZE_STATE,
  payload: partialState,
});

/**
 * Reset the state to initial values
 */
export const resetState = (): ResetStateAction => ({
  type: FinancialActionType.RESET_STATE,
});

// =============================================================================
// LOADING STATE ACTION CREATORS
// =============================================================================

/**
 * Set general loading state
 */
export const setLoading = (isLoading: boolean): SetLoadingAction => ({
  type: FinancialActionType.SET_LOADING,
  payload: isLoading,
});

/**
 * Set income loading state
 */
export const setLoadingIncome = (
  isLoading: boolean
): SetLoadingSpecificAction => ({
  type: FinancialActionType.SET_LOADING_INCOME,
  payload: isLoading,
});

/**
 * Set expenses loading state
 */
export const setLoadingExpenses = (
  isLoading: boolean
): SetLoadingSpecificAction => ({
  type: FinancialActionType.SET_LOADING_EXPENSES,
  payload: isLoading,
});

/**
 * Set goals loading state
 */
export const setLoadingGoals = (
  isLoading: boolean
): SetLoadingSpecificAction => ({
  type: FinancialActionType.SET_LOADING_GOALS,
  payload: isLoading,
});

/**
 * Set forecast loading state
 */
export const setLoadingForecast = (
  isLoading: boolean
): SetLoadingSpecificAction => ({
  type: FinancialActionType.SET_LOADING_FORECAST,
  payload: isLoading,
});

/**
 * Set saving state
 */
export const setSaving = (isSaving: boolean): SetLoadingSpecificAction => ({
  type: FinancialActionType.SET_SAVING,
  payload: isSaving,
});

// =============================================================================
// ERROR STATE ACTION CREATORS
// =============================================================================

/**
 * Set an error for a specific error type
 */
export const setError = (
  errorType: keyof ErrorState,
  message: string
): SetErrorAction => ({
  type: FinancialActionType.SET_ERROR,
  payload: { errorType, message },
});

/**
 * Clear a specific error or all errors
 */
export const clearError = (errorType?: keyof ErrorState): ClearErrorAction => ({
  type: FinancialActionType.CLEAR_ERROR,
  payload: errorType,
});

// =============================================================================
// INCOME ACTION CREATORS
// =============================================================================

/**
 * Add a new income source
 */
export const addIncome = (income: Income): AddIncomeAction => ({
  type: FinancialActionType.ADD_INCOME,
  payload: income,
});

/**
 * Update an existing income source
 */
export const updateIncome = (income: Income): UpdateIncomeAction => ({
  type: FinancialActionType.UPDATE_INCOME,
  payload: income,
});

/**
 * Delete an income source
 */
export const deleteIncome = (incomeId: string): DeleteIncomeAction => ({
  type: FinancialActionType.DELETE_INCOME,
  payload: incomeId,
});

/**
 * Set the entire income list
 */
export const setIncomeList = (incomeList: Income[]): SetIncomeListAction => ({
  type: FinancialActionType.SET_INCOME_LIST,
  payload: incomeList,
});

// =============================================================================
// EXPENSE ACTION CREATORS
// =============================================================================

/**
 * Add a new expense
 */
export const addExpense = (expense: Expense): AddExpenseAction => ({
  type: FinancialActionType.ADD_EXPENSE,
  payload: expense,
});

/**
 * Update an existing expense
 */
export const updateExpense = (expense: Expense): UpdateExpenseAction => ({
  type: FinancialActionType.UPDATE_EXPENSE,
  payload: expense,
});

/**
 * Delete an expense
 */
export const deleteExpense = (expenseId: string): DeleteExpenseAction => ({
  type: FinancialActionType.DELETE_EXPENSE,
  payload: expenseId,
});

/**
 * Set the entire expense list
 */
export const setExpenseList = (
  expenseList: Expense[]
): SetExpenseListAction => ({
  type: FinancialActionType.SET_EXPENSE_LIST,
  payload: expenseList,
});

// =============================================================================
// GOAL ACTION CREATORS
// =============================================================================

/**
 * Add a new goal
 */
export const addGoal = (goal: Goal): AddGoalAction => ({
  type: FinancialActionType.ADD_GOAL,
  payload: goal,
});

/**
 * Update an existing goal
 */
export const updateGoal = (goal: Goal): UpdateGoalAction => ({
  type: FinancialActionType.UPDATE_GOAL,
  payload: goal,
});

/**
 * Delete a goal
 */
export const deleteGoal = (goalId: string): DeleteGoalAction => ({
  type: FinancialActionType.DELETE_GOAL,
  payload: goalId,
});

/**
 * Set the entire goal list
 */
export const setGoalList = (goalList: Goal[]): SetGoalListAction => ({
  type: FinancialActionType.SET_GOAL_LIST,
  payload: goalList,
});

// =============================================================================
// FORECAST ACTION CREATORS
// =============================================================================

/**
 * Set the forecast data
 */
export const setForecast = (forecast: Forecast[]): SetForecastAction => ({
  type: FinancialActionType.SET_FORECAST,
  payload: forecast,
});

/**
 * Trigger forecast regeneration
 */
export const regenerateForecast = (): RegenerateForecastAction => ({
  type: FinancialActionType.REGENERATE_FORECAST,
});

/**
 * Update forecast configuration
 */
export const updateForecastConfig = (
  config: Partial<ForecastConfig>
): UpdateForecastConfigAction => ({
  type: FinancialActionType.UPDATE_FORECAST_CONFIG,
  payload: config,
});

// =============================================================================
// USER PLAN ACTION CREATORS
// =============================================================================

/**
 * Set the entire user plan
 */
export const setUserPlan = (userPlan: UserPlan): SetUserPlanAction => ({
  type: FinancialActionType.SET_USER_PLAN,
  payload: userPlan,
});

/**
 * Update the current balance
 */
export const updateCurrentBalance = (
  balance: number
): UpdateCurrentBalanceAction => ({
  type: FinancialActionType.UPDATE_CURRENT_BALANCE,
  payload: balance,
});

// =============================================================================
// DATA PERSISTENCE ACTION CREATORS
// =============================================================================

/**
 * Mark save operation as successful
 */
export const saveSuccess = (): SaveSuccessAction => ({
  type: FinancialActionType.SAVE_SUCCESS,
});

/**
 * Mark save operation as failed
 */
export const saveError = (error: string): SaveErrorAction => ({
  type: FinancialActionType.SAVE_ERROR,
  payload: error,
});

/**
 * Mark load operation as successful
 */
export const loadSuccess = (userPlan: UserPlan): LoadSuccessAction => ({
  type: FinancialActionType.LOAD_SUCCESS,
  payload: userPlan,
});

/**
 * Mark load operation as failed
 */
export const loadError = (error: string): LoadErrorAction => ({
  type: FinancialActionType.LOAD_ERROR,
  payload: error,
});

// =============================================================================
// UI STATE ACTION CREATORS
// =============================================================================

/**
 * Mark that there are unsaved changes
 */
export const markUnsavedChanges = (): MarkUnsavedChangesAction => ({
  type: FinancialActionType.MARK_UNSAVED_CHANGES,
});

/**
 * Mark that all changes are saved
 */
export const markSaved = (): MarkSavedAction => ({
  type: FinancialActionType.MARK_SAVED,
});

// =============================================================================
// CONVENIENCE ACTION CREATORS
// =============================================================================

/**
 * Set loading state for multiple operations
 */
export const setMultipleLoadingStates = (
  loadingStates: Partial<{
    income: boolean;
    expenses: boolean;
    goals: boolean;
    forecast: boolean;
    saving: boolean;
  }>
) => {
  const actions: FinancialAction[] = [];

  if (loadingStates.income !== undefined) {
    actions.push(setLoadingIncome(loadingStates.income));
  }
  if (loadingStates.expenses !== undefined) {
    actions.push(setLoadingExpenses(loadingStates.expenses));
  }
  if (loadingStates.goals !== undefined) {
    actions.push(setLoadingGoals(loadingStates.goals));
  }
  if (loadingStates.forecast !== undefined) {
    actions.push(setLoadingForecast(loadingStates.forecast));
  }
  if (loadingStates.saving !== undefined) {
    actions.push(setSaving(loadingStates.saving));
  }

  return actions;
};

/**
 * Clear all errors
 */
export const clearAllErrors = (): ClearErrorAction => ({
  type: FinancialActionType.CLEAR_ERROR,
});

/**
 * Set general error (shorthand for general error type)
 */
export const setGeneralError = (message: string): SetErrorAction =>
  setError("generalError", message);

/**
 * Set income error (shorthand)
 */
export const setIncomeError = (message: string): SetErrorAction =>
  setError("incomeError", message);

/**
 * Set expense error (shorthand)
 */
export const setExpenseError = (message: string): SetErrorAction =>
  setError("expenseError", message);

/**
 * Set goal error (shorthand)
 */
export const setGoalError = (message: string): SetErrorAction =>
  setError("goalError", message);

/**
 * Set forecast error (shorthand)
 */
export const setForecastError = (message: string): SetErrorAction =>
  setError("forecastError", message);

// =============================================================================
// CREDIT CARD ACCOUNT ACTION CREATORS
// =============================================================================

/**
 * Add a new credit card account
 */
export const addCreditCardAccount = (account: CreditCardAccountInfo): AddCreditCardAccountAction => ({
  type: FinancialActionType.ADD_CREDIT_CARD_ACCOUNT,
  payload: account,
});

/**
 * Update an existing credit card account
 */
export const updateCreditCardAccount = (account: CreditCardAccountInfo): UpdateCreditCardAccountAction => ({
  type: FinancialActionType.UPDATE_CREDIT_CARD_ACCOUNT,
  payload: account,
});

/**
 * Delete a credit card account
 */
export const deleteCreditCardAccount = (cardId: string): DeleteCreditCardAccountAction => ({
  type: FinancialActionType.DELETE_CREDIT_CARD_ACCOUNT,
  payload: cardId,
});
