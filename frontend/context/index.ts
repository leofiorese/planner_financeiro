/**
 * Context Module Exports
 *
 * This file provides a central export point for all context-related
 * types, components, hooks, and utilities.
 */

// Export all types and interfaces
export type {
  FinancialState,
  FinancialAction,
  FinancialActionType,
  FinancialContextValue,
  FinancialProviderProps,
  LoadingState,
  ErrorState,
} from "./types";

// Export the main provider and hooks
export {
  FinancialProvider,
  useFinancialContext,
  useFinancialState,
  useFinancialActions,
  useLoadingState,
  useErrorState,
  useFinancialSummary,
} from "./FinancialProvider";

// Export reducer functions
export { financialReducer, enhancedFinancialReducer } from "./reducer";

// Export action creators
export * as actions from "./actions";

// Export initial state utilities
export {
  initialFinancialState,
  initialLoadingState,
  initialErrorState,
  initialUserPlan,
  initialFinancialSummary,
  createFreshInitialState,
  resetToInitialState,
  mergeWithInitialState,
  validateState,
  getSafeState,
} from "./initialState";
