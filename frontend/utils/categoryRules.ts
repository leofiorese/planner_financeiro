import { ExpenseCategory, ExpenseCategoryConfig } from "@/types";

/**
 * The 9 base system categories in their default sequence:
 * 1. Casa; 2. Transporte; 3. Alimentação; 4. Contas e Serviços;
 * 5. Saúde; 6. Lazer / Compras; 7. Educação / Livros; 8. Viagem; 9. Outros / Diversos.
 */
export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  {
    id: ExpenseCategory.HOUSING,
    name: "Casa",
    nameEn: "Housing",
    emoji: "🏠",
    color: "#ef4444",
    order: 0,
    isDefault: true,
  },
  {
    id: ExpenseCategory.TRANSPORTATION,
    name: "Transporte",
    nameEn: "Transportation",
    emoji: "🚗",
    color: "#f97316",
    order: 1,
    isDefault: true,
  },
  {
    id: ExpenseCategory.FOOD,
    name: "Alimentação",
    nameEn: "Food",
    emoji: "🍽️",
    color: "#f59e0b",
    order: 2,
    isDefault: true,
  },
  {
    id: ExpenseCategory.UTILITIES,
    name: "Contas e Serviços",
    nameEn: "Bills & Utilities",
    emoji: "💡",
    color: "#10b981",
    order: 3,
    isDefault: true,
  },
  {
    id: ExpenseCategory.HEALTHCARE,
    name: "Saúde",
    nameEn: "Healthcare",
    emoji: "🏥",
    color: "#3b82f6",
    order: 4,
    isDefault: true,
  },
  {
    id: ExpenseCategory.ENTERTAINMENT,
    name: "Lazer / Compras",
    nameEn: "Leisure / Shopping",
    emoji: "🛍️",
    color: "#8b5cf6",
    order: 5,
    isDefault: true,
  },
  {
    id: ExpenseCategory.EDUCATION,
    name: "Educação / Livros",
    nameEn: "Education / Books",
    emoji: "📚",
    color: "#14b8a6",
    order: 6,
    isDefault: true,
  },
  {
    id: ExpenseCategory.TRAVEL,
    name: "Viagem",
    nameEn: "Travel",
    emoji: "✈️",
    color: "#84cc16",
    order: 7,
    isDefault: true,
  },
  {
    id: ExpenseCategory.MISCELLANEOUS,
    name: "Outros / Diversos",
    nameEn: "Other / Miscellaneous",
    emoji: "📦",
    color: "#64748b",
    order: 8,
    isDefault: true,
  },
];

export const SUGGESTED_CATEGORY_EMOJIS = [
  "🏠", "🚗", "🍽️", "💡", "🏥", "🛍️", "📚", "✈️", "📦",
  "🛒", "🎮", "🎬", "🏋️", "🐾", "👶", "📱", "💻", "🛠️",
  "🎁", "💳", "🏦", "📈", "☕", "🍕", "⛽", "🚌", "🏖️",
  "🎓", "💊", "🦷", "👕", "👟", "💇", "🧹", "🐶", "✨",
];

export const SUGGESTED_CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
  "#ec4899", "#f43f5e", "#84cc16", "#64748b",
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

/**
 * Returns the ordered list of categories (from user config or defaults).
 */
export function getOrderedCategories(
  customCategories?: ExpenseCategoryConfig[]
): ExpenseCategoryConfig[] {
  const list =
    customCategories && customCategories.length > 0
      ? customCategories
      : DEFAULT_EXPENSE_CATEGORIES;

  return [...list].sort((a, b) => a.order - b.order);
}

/**
 * Resolves full display metadata for a given category ID.
 */
export function getCategoryInfo(
  categoryId?: string | null,
  customCategories?: ExpenseCategoryConfig[],
  language: "pt" | "en" = "pt"
): {
  id: string;
  name: string;
  emoji: string;
  color: string;
  fullLabel: string;
} {
  const ordered = getOrderedCategories(customCategories);
  const raw = categoryId || ExpenseCategory.MISCELLANEOUS;

  // 1. Direct match in user's configured categories
  const directMatch = ordered.find(
    (c) => c.id === raw || c.id.toLowerCase() === raw.toLowerCase()
  );
  if (directMatch) {
    const displayName =
      language === "en" && directMatch.nameEn
        ? directMatch.nameEn
        : directMatch.name;
    return {
      id: directMatch.id,
      name: displayName,
      emoji: directMatch.emoji || "📦",
      color: directMatch.color || "#64748b",
      fullLabel: `${directMatch.emoji || "📦"} ${displayName}`,
    };
  }

  // 2. Normalized match against base categories
  const normalizedId = normalizeLegacyCategory(raw, customCategories);
  const normalizedMatch =
    ordered.find((c) => c.id === normalizedId) ||
    DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === normalizedId);

  if (normalizedMatch) {
    const displayName =
      language === "en" && normalizedMatch.nameEn
        ? normalizedMatch.nameEn
        : normalizedMatch.name;
    return {
      id: normalizedMatch.id,
      name: displayName,
      emoji: normalizedMatch.emoji || "📦",
      color: normalizedMatch.color || "#64748b",
      fullLabel: `${normalizedMatch.emoji || "📦"} ${displayName}`,
    };
  }

  // 3. Fallback for unknown custom strings
  const fallbackName =
    raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " ");
  return {
    id: raw,
    name: fallbackName,
    emoji: "📦",
    color: "#64748b",
    fullLabel: `📦 ${fallbackName}`,
  };
}
