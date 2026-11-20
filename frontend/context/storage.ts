/**
 * Data Storage and Persistence
 *
 * Saves and loads the user plan through the backend API (`/api/plan/`), with migration of
 * older plans and structural validation of the loaded data.
 */

import { UserPlan } from "../types";
import { initialForecastConfig, defaultCreditCardAccounts } from "./initialState";
import { DEFAULT_EXPENSE_CATEGORIES, normalizeLegacyCategory } from "../utils/categoryRules";
import {
  normalizeBudget,
  withBackfilledPurchaseDate,
  withBudgetGoalDefaults,
} from "../utils/budget/normalize";

// =============================================================================
// USER PLAN PERSISTENCE
// =============================================================================

/**
 * Save user plan to database via API
 */
export async function saveUserPlan(userPlan: UserPlan): Promise<UserPlan> {
  try {
    // Generate a unique ID if this is the first save (default plan)
    const planToSave =
      userPlan.id === "default-plan"
        ? {
          ...userPlan,
          id: `user-plan-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          updatedAt: new Date().toISOString(),
        }
        : {
          ...userPlan,
          updatedAt: new Date().toISOString(),
        };

    const res = await fetch('/api/plan/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planToSave),
    });

    if (!res.ok) {
      throw new Error("Failed to save user plan parameters in API.");
    }

    console.log("✅ User plan saved successfully to DB");
    return planToSave;
  } catch (error) {
    console.error("❌ Failed to save user plan:", error);
    throw new Error("Failed to save user plan to storage");
  }
}

/**
 * Load user plan from database via API
 */
export async function loadUserPlan(): Promise<UserPlan | null> {
  try {
    const res = await fetch('/api/plan/');

    if (res.status === 404) {
      console.log("No saved user plan found in DB");
      return null;
    }

    if (!res.ok) {
      throw new Error("API returned an error code");
    }

    const userPlan = await res.json();

    // Migrate older data if needed
    const migratedUserPlan = migrateUserPlan(userPlan);

    // Validate the loaded data structure
    if (!isValidUserPlan(migratedUserPlan)) {
      console.warn("Loaded user plan failed validation");
      return null;
    }

    console.log("✅ User plan loaded successfully from DB");
    return migratedUserPlan;
  } catch (error) {
    console.error("❌ Failed to load user plan from DB:", error);
    return null;
  }
}
/**
 * Migrate older user plan data to include forecast configuration
 */
function migrateUserPlan(userPlan: any): UserPlan {
  // Create a deep copy to avoid mutating the original object
  const migratedUserPlan = { ...userPlan };

  // If forecastConfig is missing, add it with default values
  if (!migratedUserPlan.forecastConfig) {
    migratedUserPlan.forecastConfig = {
      ...initialForecastConfig,
      startingBalance: migratedUserPlan.currentBalance || 0,
    };
  }

  // If creditCardAccounts is missing or empty, populate with default accounts
  if (
    !Array.isArray(migratedUserPlan.creditCardAccounts) ||
    migratedUserPlan.creditCardAccounts.length === 0
  ) {
    migratedUserPlan.creditCardAccounts = defaultCreditCardAccounts;
  }

  // If expenseCategories is missing or empty, populate with default 9 base categories
  if (
    !Array.isArray(migratedUserPlan.expenseCategories) ||
    migratedUserPlan.expenseCategories.length === 0
  ) {
    migratedUserPlan.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
  }

  // Normalize legacy categories in expenses
  if (Array.isArray(migratedUserPlan.expenses)) {
    migratedUserPlan.expenses = migratedUserPlan.expenses.map((exp: any) =>
      // D4: cartão sem purchaseDate usa a data local do createdAt
      withBackfilledPurchaseDate({
        ...exp,
        category: normalizeLegacyCategory(exp.category, migratedUserPlan.expenseCategories),
      })
    );
  }

  // Metas sem os campos de budget: opt-in desligado, reserva automática
  if (Array.isArray(migratedUserPlan.goals)) {
    migratedUserPlan.goals = migratedUserPlan.goals.map((goal: any) => withBudgetGoalDefaults(goal));
  }

  // Budget mensal (undefined vindo do servidor => defaults)
  migratedUserPlan.budget = normalizeBudget(migratedUserPlan.budget);

  return migratedUserPlan as UserPlan;
}

/**
 * Validate user plan structure
 */
function isValidUserPlan(userPlan: any): userPlan is UserPlan {
  try {
    return (
      userPlan &&
      typeof userPlan === "object" &&
      typeof userPlan.id === "string" &&
      Array.isArray(userPlan.income) &&
      Array.isArray(userPlan.expenses) &&
      Array.isArray(userPlan.goals) &&
      Array.isArray(userPlan.forecast) &&
      typeof userPlan.currentBalance === "number" &&
      userPlan.forecastConfig &&
      typeof userPlan.forecastConfig === "object" &&
      typeof userPlan.forecastConfig.startingBalance === "number" &&
      typeof userPlan.forecastConfig.startDate === "string" &&
      typeof userPlan.forecastConfig.months === "number" &&
      typeof userPlan.forecastConfig.includeGoalContributions === "boolean" &&
      typeof userPlan.forecastConfig.conservativeMode === "boolean" &&
      typeof userPlan.forecastConfig.updatedAt === "string" &&
      (userPlan.budget == null || typeof userPlan.budget === "object") &&
      typeof userPlan.createdAt === "string" &&
      typeof userPlan.updatedAt === "string"
    );
  } catch {
    return false;
  }
}
