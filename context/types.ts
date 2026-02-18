/**
 * TypeScript interfaces for Financial Context State Management
 *
 * This file defines the complete state management structure for the finance planner,
 * including state shape, actions, and reducer interfaces.
 */

import {
  Income,
  Expense,
  Goal,
  Forecast,
  UserPlan,
  CreateIncomeInput,
  CreateExpenseInput,
  CreateGoalInput,
  UpdateIncomeInput,
  UpdateExpenseInput,
  UpdateGoalInput,
  FinancialSummary,
  ForecastConfig,
  CreditCardAccountInfo,
  CreateCreditCardAccountInput,
  UpdateCreditCardAccountInput,
} from "../types";

// =============================================================================
// LOADING AND ERROR STATES
// =============================================================================

/**
 * Loading states for different operations
 */
export interface LoadingState {
  isLoading: boolean;
  isLoadingIncome: boolean;
  isLoadingExpenses: boolean;
  isLoadingGoals: boolean;
  isLoadingForecast: boolean;
  isSaving: boolean;
}

/**
 * Error states for different operations
 */
export interface ErrorState {
  generalError: string | null;
  incomeError: string | null;
  expenseError: string | null;
  goalError: string | null;
  forecastError: string | null;
}

// =============================================================================
// GLOBAL STATE INTERFACE
// =============================================================================

/**
 * Complete global state for the finance planner application
 */
export interface FinancialState {
  // Core data
  userPlan: UserPlan;

  // Computed data
  financialSummary: FinancialSummary;

  // UI state
  loading: LoadingState;
  error: ErrorState;

  // Meta information
  lastUpdated: string;
  hasUnsavedChanges: boolean;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Action type constants for the reducer
 */
export enum FinancialActionType {
  // State initialization
  INITIALIZE_STATE = "INITIALIZE_STATE",
  RESET_STATE = "RESET_STATE",

  // Loading states
  SET_LOADING = "SET_LOADING",
  SET_LOADING_INCOME = "SET_LOADING_INCOME",
  SET_LOADING_EXPENSES = "SET_LOADING_EXPENSES",
  SET_LOADING_GOALS = "SET_LOADING_GOALS",
  SET_LOADING_FORECAST = "SET_LOADING_FORECAST",
  SET_SAVING = "SET_SAVING",

  // Error states
  SET_ERROR = "SET_ERROR",
  CLEAR_ERROR = "CLEAR_ERROR",

  // Income actions
  ADD_INCOME = "ADD_INCOME",
  UPDATE_INCOME = "UPDATE_INCOME",
  DELETE_INCOME = "DELETE_INCOME",
  SET_INCOME_LIST = "SET_INCOME_LIST",

  // Expense actions
  ADD_EXPENSE = "ADD_EXPENSE",
  UPDATE_EXPENSE = "UPDATE_EXPENSE",
  DELETE_EXPENSE = "DELETE_EXPENSE",
  SET_EXPENSE_LIST = "SET_EXPENSE_LIST",

  // Goal actions
  ADD_GOAL = "ADD_GOAL",
  UPDATE_GOAL = "UPDATE_GOAL",
  DELETE_GOAL = "DELETE_GOAL",
  SET_GOAL_LIST = "SET_GOAL_LIST",

  // Forecast actions
  SET_FORECAST = "SET_FORECAST",
  REGENERATE_FORECAST = "REGENERATE_FORECAST",
  UPDATE_FORECAST_CONFIG = "UPDATE_FORECAST_CONFIG",

  // UserPlan actions
  SET_USER_PLAN = "SET_USER_PLAN",
  UPDATE_CURRENT_BALANCE = "UPDATE_CURRENT_BALANCE",

  // Data persistence
  SAVE_SUCCESS = "SAVE_SUCCESS",
  SAVE_ERROR = "SAVE_ERROR",
  LOAD_SUCCESS = "LOAD_SUCCESS",
  LOAD_ERROR = "LOAD_ERROR",

  // UI state
  MARK_UNSAVED_CHANGES = "MARK_UNSAVED_CHANGES",
  MARK_SAVED = "MARK_SAVED",

  // Credit card account actions
  ADD_CREDIT_CARD_ACCOUNT = "ADD_CREDIT_CARD_ACCOUNT",
  UPDATE_CREDIT_CARD_ACCOUNT = "UPDATE_CREDIT_CARD_ACCOUNT",
  DELETE_CREDIT_CARD_ACCOUNT = "DELETE_CREDIT_CARD_ACCOUNT",
}

// =============================================================================
// ACTION INTERFACES
// =============================================================================

/**
 * Base action interface
 */
export interface BaseAction {
  type: FinancialActionType;
  payload?: any;
}

/**
 * State initialization actions
 */
export interface InitializeStateAction extends BaseAction {
  type: FinancialActionType.INITIALIZE_STATE;
  payload: Partial<FinancialState>;
}

export interface ResetStateAction extends BaseAction {
  type: FinancialActionType.RESET_STATE;
}

/**
 * Loading state actions
 */
export interface SetLoadingAction extends BaseAction {
  type: FinancialActionType.SET_LOADING;
  payload: boolean;
}

export interface SetLoadingSpecificAction extends BaseAction {
  type:
  | FinancialActionType.SET_LOADING_INCOME
  | FinancialActionType.SET_LOADING_EXPENSES
  | FinancialActionType.SET_LOADING_GOALS
  | FinancialActionType.SET_LOADING_FORECAST
  | FinancialActionType.SET_SAVING;
  payload: boolean;
}

/**
 * Error state actions
 */
export interface SetErrorAction extends BaseAction {
  type: FinancialActionType.SET_ERROR;
  payload: {
    errorType: keyof ErrorState;
    message: string;
  };
}

export interface ClearErrorAction extends BaseAction {
  type: FinancialActionType.CLEAR_ERROR;
  payload?: keyof ErrorState;
}

/**
 * Income actions
 */
export interface AddIncomeAction extends BaseAction {
  type: FinancialActionType.ADD_INCOME;
  payload: Income;
}

export interface UpdateIncomeAction extends BaseAction {
  type: FinancialActionType.UPDATE_INCOME;
  payload: Income;
}

export interface DeleteIncomeAction extends BaseAction {
  type: FinancialActionType.DELETE_INCOME;
  payload: string; // income id
}

export interface SetIncomeListAction extends BaseAction {
  type: FinancialActionType.SET_INCOME_LIST;
  payload: Income[];
}

/**
 * Expense actions
 */
export interface AddExpenseAction extends BaseAction {
  type: FinancialActionType.ADD_EXPENSE;
  payload: Expense;
}

export interface UpdateExpenseAction extends BaseAction {
  type: FinancialActionType.UPDATE_EXPENSE;
  payload: Expense;
}

export interface DeleteExpenseAction extends BaseAction {
  type: FinancialActionType.DELETE_EXPENSE;
  payload: string; // expense id
}

export interface SetExpenseListAction extends BaseAction {
  type: FinancialActionType.SET_EXPENSE_LIST;
  payload: Expense[];
}

/**
 * Goal actions
 */
export interface AddGoalAction extends BaseAction {
  type: FinancialActionType.ADD_GOAL;
  payload: Goal;
}

export interface UpdateGoalAction extends BaseAction {
  type: FinancialActionType.UPDATE_GOAL;
  payload: Goal;
}

export interface DeleteGoalAction extends BaseAction {
  type: FinancialActionType.DELETE_GOAL;
  payload: string; // goal id
}

export interface SetGoalListAction extends BaseAction {
  type: FinancialActionType.SET_GOAL_LIST;
  payload: Goal[];
}

/**
 * Forecast actions
 */
export interface SetForecastAction extends BaseAction {
  type: FinancialActionType.SET_FORECAST;
  payload: Forecast[];
}

export interface RegenerateForecastAction extends BaseAction {
  type: FinancialActionType.REGENERATE_FORECAST;
}

export interface UpdateForecastConfigAction extends BaseAction {
  type: FinancialActionType.UPDATE_FORECAST_CONFIG;
  payload: Partial<ForecastConfig>;
}

/**
 * UserPlan actions
 */
export interface SetUserPlanAction extends BaseAction {
  type: FinancialActionType.SET_USER_PLAN;
  payload: UserPlan;
}

export interface UpdateCurrentBalanceAction extends BaseAction {
  type: FinancialActionType.UPDATE_CURRENT_BALANCE;
  payload: number;
}

/**
 * Data persistence actions
 */
export interface SaveSuccessAction extends BaseAction {
  type: FinancialActionType.SAVE_SUCCESS;
}

export interface SaveErrorAction extends BaseAction {
  type: FinancialActionType.SAVE_ERROR;
  payload: string;
}

export interface LoadSuccessAction extends BaseAction {
  type: FinancialActionType.LOAD_SUCCESS;
  payload: UserPlan;
}

export interface LoadErrorAction extends BaseAction {
  type: FinancialActionType.LOAD_ERROR;
  payload: string;
}

/**
 * UI state actions
 */
export interface MarkUnsavedChangesAction extends BaseAction {
  type: FinancialActionType.MARK_UNSAVED_CHANGES;
}

export interface MarkSavedAction extends BaseAction {
  type: FinancialActionType.MARK_SAVED;
}

/**
 * Credit card account actions
 */
export interface AddCreditCardAccountAction extends BaseAction {
  type: FinancialActionType.ADD_CREDIT_CARD_ACCOUNT;
  payload: CreditCardAccountInfo;
}

export interface UpdateCreditCardAccountAction extends BaseAction {
  type: FinancialActionType.UPDATE_CREDIT_CARD_ACCOUNT;
  payload: CreditCardAccountInfo;
}

export interface DeleteCreditCardAccountAction extends BaseAction {
  type: FinancialActionType.DELETE_CREDIT_CARD_ACCOUNT;
  payload: string; // credit card account id
}

// =============================================================================
// UNION TYPES
// =============================================================================

/**
 * Union type for all possible actions
 */
export type FinancialAction =
  | InitializeStateAction
  | ResetStateAction
  | SetLoadingAction
  | SetLoadingSpecificAction
  | SetErrorAction
  | ClearErrorAction
  | AddIncomeAction
  | UpdateIncomeAction
  | DeleteIncomeAction
  | SetIncomeListAction
  | AddExpenseAction
  | UpdateExpenseAction
  | DeleteExpenseAction
  | SetExpenseListAction
  | AddGoalAction
  | UpdateGoalAction
  | DeleteGoalAction
  | SetGoalListAction
  | SetForecastAction
  | RegenerateForecastAction
  | UpdateForecastConfigAction
  | SetUserPlanAction
  | UpdateCurrentBalanceAction
  | SaveSuccessAction
  | SaveErrorAction
  | LoadSuccessAction
  | LoadErrorAction
  | MarkUnsavedChangesAction
  | MarkSavedAction
  | AddCreditCardAccountAction
  | UpdateCreditCardAccountAction
  | DeleteCreditCardAccountAction;

// =============================================================================
// CONTEXT INTERFACES
// =============================================================================

/**
 * Context value interface that components will consume
 */
export interface FinancialContextValue {
  // State
  state: FinancialState;

  // Dispatch function
  dispatch: React.Dispatch<FinancialAction>;

  // Convenience functions for income
  addIncome: (income: CreateIncomeInput) => Promise<void>;
  updateIncome: (income: UpdateIncomeInput) => Promise<void>;
  deleteIncome: (incomeId: string) => Promise<void>;

  // Convenience functions for expenses
  addExpense: (expense: CreateExpenseInput) => Promise<void>;
  updateExpense: (expense: UpdateExpenseInput) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;

  // Convenience functions for goals
  addGoal: (goal: CreateGoalInput) => Promise<void>;
  updateGoal: (goal: UpdateGoalInput) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Utility functions
  regenerateForecast: () => Promise<void>;
  updateCurrentBalance: (balance: number) => Promise<void>;
  updateForecastConfig: (config: Partial<ForecastConfig>) => Promise<void>;
  saveUserPlan: () => Promise<void>;
  loadUserPlan: () => Promise<void>;
  resetAll: () => void;

  // Error handling
  clearError: (errorType?: keyof ErrorState) => void;

  // Convenience functions for credit card accounts
  addCreditCardAccount: (input: CreateCreditCardAccountInput) => Promise<void>;
  updateCreditCardAccount: (input: UpdateCreditCardAccountInput) => Promise<void>;
  deleteCreditCardAccount: (cardId: string) => Promise<void>;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Type for action creators
 */
export type ActionCreator<T extends FinancialAction> = (
  payload?: T["payload"]
) => T;

/**
 * Type for async action creators
 */
export type AsyncActionCreator<T> = (
  ...args: any[]
) => (dispatch: React.Dispatch<FinancialAction>) => Promise<T>;

/**
 * Provider props interface
 */
export interface FinancialProviderProps {
  children: React.ReactNode;
  initialState?: Partial<FinancialState>;
}
