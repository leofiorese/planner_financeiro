/**
 * PARTIAL COPY of frontend/utils/categoryRules.ts -- keep in sync.
 * Only DEFAULT_EXPENSE_CATEGORIES and normalizeLegacyCategory are needed by routes/plan.ts.
 */
import { ExpenseCategory, ExpenseCategoryConfig } from "../types";

/**
 * The 9 base system categories in their default sequence:
 * 1. Casa; 2. Transporte; 3. Alimentação; 4. Contas e Serviços;
 * 5. Saúde; 6. Lazer / Compras; 7. Educação / Livros; 8. Viagem; 9. Outros / Diversos.
 */
export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  {
    id: ExpenseCategory.HOUSING,
    name: "Casa",
    emoji: "🏠",
    color: "#ef4444",
    order: 0,
    isDefault: true,
  },
  {
    id: ExpenseCategory.TRANSPORTATION,
    name: "Transporte",
    emoji: "🚗",
    color: "#f97316",
    order: 1,
    isDefault: true,
  },
  {
    id: ExpenseCategory.FOOD,
    name: "Alimentação",
    emoji: "🍽️",
    color: "#f59e0b",
    order: 2,
    isDefault: true,
  },
  {
    id: ExpenseCategory.UTILITIES,
    name: "Contas e Serviços",
    emoji: "💡",
    color: "#10b981",
    order: 3,
    isDefault: true,
  },
  {
    id: ExpenseCategory.HEALTHCARE,
    name: "Saúde",
    emoji: "🏥",
    color: "#3b82f6",
    order: 4,
    isDefault: true,
  },
  {
    id: ExpenseCategory.ENTERTAINMENT,
    name: "Lazer / Compras",
    emoji: "🛍️",
    color: "#8b5cf6",
    order: 5,
    isDefault: true,
  },
  {
    id: ExpenseCategory.EDUCATION,
    name: "Educação / Livros",
    emoji: "📚",
    color: "#14b8a6",
    order: 6,
    isDefault: true,
  },
  {
    id: ExpenseCategory.TRAVEL,
    name: "Viagem",
    emoji: "✈️",
    color: "#84cc16",
    order: 7,
    isDefault: true,
  },
  {
    id: ExpenseCategory.MISCELLANEOUS,
    name: "Outros / Diversos",
    emoji: "📦",
    color: "#64748b",
    order: 8,
    isDefault: true,
  },
];

/**
 * Normalizes any legacy category string to the new 9 base categories,
 * while preserving user-defined custom category IDs.
 */
export function normalizeLegacyCategory(
  rawCategory?: string | null,
  customCategories?: ExpenseCategoryConfig[]
): string {
  if (!rawCategory || typeof rawCategory !== "string") {
    return ExpenseCategory.MISCELLANEOUS;
  }

  const trimmed = rawCategory.trim().toLowerCase();

  // If it's explicitly in the user's configured categories, keep it as-is
  if (customCategories && customCategories.some((c) => c.id === rawCategory || c.id === trimmed)) {
    const matched = customCategories.find((c) => c.id === rawCategory || c.id === trimmed);
    return matched ? matched.id : rawCategory;
  }

  switch (trimmed) {
    case "housing":
    case "casa":
      return ExpenseCategory.HOUSING;
    case "transportation":
    case "transporte":
      return ExpenseCategory.TRANSPORTATION;
    case "food":
    case "alimentação":
    case "alimentacao":
      return ExpenseCategory.FOOD;
    case "utilities":
    case "contas e serviços":
    case "contas":
      return ExpenseCategory.UTILITIES;
    case "healthcare":
    case "personal_care":
    case "saúde":
    case "saude":
      return ExpenseCategory.HEALTHCARE;
    case "entertainment":
    case "shopping":
    case "lazer":
    case "compras":
      return ExpenseCategory.ENTERTAINMENT;
    case "education":
    case "educação":
    case "educacao":
      return ExpenseCategory.EDUCATION;
    case "travel":
    case "viagem":
      return ExpenseCategory.TRAVEL;
    case "miscellaneous":
    case "insurance":
    case "debt_payments":
    case "savings":
    case "kids":
    case "taxes":
    case "outros":
      return ExpenseCategory.MISCELLANEOUS;
    default:
      // Preserve custom category IDs (e.g. "cat-...")
      if (trimmed.startsWith("cat-") || rawCategory.length > 0) {
        return rawCategory;
      }
      return ExpenseCategory.MISCELLANEOUS;
  }
}
