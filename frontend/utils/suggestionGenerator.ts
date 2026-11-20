/**
 * Financial Suggestion Generator
 *
 * This utility generates personalized financial suggestions based on user data,
 * forecast projections, and goal progress to help users improve their financial health.
 */

import { getCategoryInfo } from "./categoryRules";
import {
  UserPlan,
  Expense,
  Income,
  Priority,
  ExpenseCategory,
  GoalCategory,
  MonthlySuggestion,
  Frequency,
} from "@/types";
import {
  generateForecast,
  ForecastResult,
  calculateMonthlyAmount,
} from "./forecastCalculator";

/**
 * Configuration for suggestion generation
 */
export interface SuggestionConfig {
  /** Maximum number of suggestions to generate */
  maxSuggestions: number;
  /** Minimum impact threshold for suggestions (in dollars) */
  minImpactThreshold: number;
  /** Focus areas for suggestions */
  focusAreas: Array<"income" | "expense" | "goal" | "general">;
  /** Conservative mode for more cautious suggestions */
  conservativeMode: boolean;
}

/**
 * Suggestion rule interface
 */
interface SuggestionRule {
  id: string;
  category: "income" | "expense" | "goal" | "general";
  priority: Priority;
  condition: (userPlan: UserPlan, forecast: ForecastResult) => boolean;
  generate: (userPlan: UserPlan, forecast: ForecastResult) => MonthlySuggestion;
}

/**
 * Generate unique ID for suggestions
 */
function generateSuggestionId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate total monthly amount for all items
 */
function getTotalMonthlyAmount(items: Array<Income | Expense>): number {
  return items
    .filter((item) => item.isActive)
    .reduce((total, item) => {
      const frequency = "frequency" in item ? item.frequency : undefined;
      return total + calculateMonthlyAmount(item.amount, frequency!);
    }, 0);
}

/**
 * Find highest expense categories
 */
function getTopExpenseCategories(
  expenses: Expense[],
  count: number = 3
): Array<{
  category: ExpenseCategory | string;
  amount: number;
  percentage: number;
}> {
  const categoryTotals = expenses
    .filter((expense) => expense.isActive)
    .reduce((acc, expense) => {
      const monthlyAmount = calculateMonthlyAmount(
        expense.amount,
        expense.frequency || Frequency.MONTHLY
      );
      acc[expense.category] = (acc[expense.category] || 0) + monthlyAmount;
      return acc;
    }, {} as Record<string, number>);

  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

/**
 * Predefined suggestion rules
 */
const suggestionRules: SuggestionRule[] = [
  // Income Suggestions
  {
    id: "increase-income-for-goals",
    category: "income",
    priority: Priority.HIGH,
    condition: (userPlan, forecast) => {
      const behindGoals = forecast.goalProgress.filter((goal) => !goal.onTrack);
      const monthlyIncome = getTotalMonthlyAmount(userPlan.income);
      return behindGoals.length > 0 && monthlyIncome > 0;
    },
    generate: (userPlan, forecast) => {
      const behindGoals = forecast.goalProgress.filter((goal) => !goal.onTrack);
      const totalShortfall = behindGoals.reduce(
        (sum, goal) => sum + (goal.targetAmount - goal.projectedAmount),
        0
      );
      const monthsRemaining = 12; // Assume 12-month timeline
      const additionalIncomeNeeded = totalShortfall / monthsRemaining;

      return {
        id: generateSuggestionId("income"),
        title: "Considere aumentar sua renda",
        description: `Para manter suas metas no ritmo, considere aumentar sua renda mensal em ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          additionalIncomeNeeded
        )}. Isso pode vir de um trabalho extra, freelance ou de um pedido de aumento.`,
        category: "income",
        priority: Priority.HIGH,
        actionable: true,
        estimatedImpact: additionalIncomeNeeded,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Expense Reduction Suggestions
  {
    id: "reduce-top-expense-category",
    category: "expense",
    priority: Priority.MEDIUM,
    condition: (userPlan, forecast) => {
      const topCategories = getTopExpenseCategories(userPlan.expenses, 1);
      return topCategories.length > 0 && topCategories[0].percentage > 30;
    },
    generate: (userPlan, forecast) => {
      const topCategory = getTopExpenseCategories(userPlan.expenses, 1)[0];
      const reductionAmount = topCategory.amount * 0.1; // Suggest 10% reduction
      const categoryName = getCategoryInfo(
        topCategory.category,
        userPlan.expenseCategories
      ).name.toLowerCase();

      return {
        id: generateSuggestionId("expense"),
        title: `Reduzir gastos com ${
          categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
        }`,
        description: `Suas despesas com ${categoryName} representam ${topCategory.percentage.toFixed(
          1
        )}% do seu gasto total. Considere reduzir esse valor em ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          reductionAmount
        )} por mês para melhorar sua situação financeira.`,
        category: "expense",
        priority: Priority.MEDIUM,
        actionable: true,
        estimatedImpact: reductionAmount,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Cash Flow Warning
  {
    id: "negative-cash-flow-warning",
    category: "general",
    priority: Priority.CRITICAL,
    condition: (userPlan, forecast) => {
      return forecast.summary.monthsWithNegativeBalance > 0;
    },
    generate: (userPlan, forecast) => {
      const negativeMonths = forecast.summary.monthsWithNegativeBalance;
      const avgDeficit = Math.abs(forecast.summary.averageMonthlyNet);

      return {
        id: generateSuggestionId("general"),
        title: "Corrija o fluxo de caixa negativo",
        description: `Sua previsão mostra ${negativeMonths} meses com saldo negativo. Considere reduzir as despesas em ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          avgDeficit
        )} por mês ou aumentar a renda para evitar aperto financeiro.`,
        category: "general",
        priority: Priority.CRITICAL,
        actionable: true,
        estimatedImpact: avgDeficit,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Emergency Fund Suggestion
  {
    id: "build-emergency-fund",
    category: "goal",
    priority: Priority.HIGH,
    condition: (userPlan, forecast) => {
      const emergencyFund = userPlan.goals.find(
        (goal) => goal.category === GoalCategory.EMERGENCY_FUND && goal.isActive
      );
      const monthlyExpenses = getTotalMonthlyAmount(userPlan.expenses);
      const recommendedAmount = monthlyExpenses * 6; // 6 months of expenses

      return !emergencyFund || emergencyFund.targetAmount < recommendedAmount;
    },
    generate: (userPlan, forecast) => {
      const monthlyExpenses = getTotalMonthlyAmount(userPlan.expenses);
      const recommendedAmount = monthlyExpenses * 6;
      const currentEmergencyFund = userPlan.goals.find(
        (goal) => goal.category === GoalCategory.EMERGENCY_FUND && goal.isActive
      );
      const currentAmount = currentEmergencyFund?.currentAmount || 0;
      const shortfall = recommendedAmount - currentAmount;

      return {
        id: generateSuggestionId("goal"),
        title: "Construa sua reserva de emergência",
        description: `Especialistas recomendam ter 6 meses de despesas guardados. Faltam ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          shortfall
        )} para atingir essa meta. Considere guardar ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(shortfall / 12)} per month.`,
        category: "goal",
        priority: Priority.HIGH,
        actionable: true,
        estimatedImpact: shortfall / 12,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Savings Rate Improvement
  {
    id: "improve-savings-rate",
    category: "general",
    priority: Priority.MEDIUM,
    condition: (userPlan, forecast) => {
      const monthlyIncome = getTotalMonthlyAmount(userPlan.income);
      const savingsRate =
        monthlyIncome > 0
          ? (forecast.summary.averageMonthlyNet / monthlyIncome) * 100
          : 0;
      return savingsRate < 20 && monthlyIncome > 0; // Less than 20% savings rate
    },
    generate: (userPlan, forecast) => {
      const monthlyIncome = getTotalMonthlyAmount(userPlan.income);
      const currentSavingsRate =
        (forecast.summary.averageMonthlyNet / monthlyIncome) * 100;
      const targetSavingsRate = 20;
      const additionalSavingsNeeded =
        (monthlyIncome * (targetSavingsRate - currentSavingsRate)) / 100;

      return {
        id: generateSuggestionId("general"),
        title: "Melhore sua taxa de poupança",
        description: `Sua taxa de poupança atual é ${currentSavingsRate.toFixed(
          1
        )}%. Especialistas recomendam poupar ao menos 20% da renda. Tente guardar mais ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(additionalSavingsNeeded)} per month.`,
        category: "general",
        priority: Priority.MEDIUM,
        actionable: true,
        estimatedImpact: additionalSavingsNeeded,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Goal Progress Acceleration
  {
    id: "accelerate-goal-progress",
    category: "goal",
    priority: Priority.MEDIUM,
    condition: (userPlan, forecast) => {
      const onTrackGoals = forecast.goalProgress.filter(
        (goal) => goal.onTrack && goal.projectedProgress < 80
      );
      return onTrackGoals.length > 0 && forecast.summary.averageMonthlyNet > 0;
    },
    generate: (userPlan, forecast) => {
      const onTrackGoal = forecast.goalProgress.find(
        (goal) => goal.onTrack && goal.projectedProgress < 80
      )!;
      const remainingAmount =
        onTrackGoal.targetAmount - onTrackGoal.projectedAmount;
      const extraContribution = Math.min(
        remainingAmount * 0.2,
        forecast.summary.averageMonthlyNet * 0.5
      );

      return {
        id: generateSuggestionId("goal"),
        title: "Acelere o progresso da sua meta",
        description: `Você está no ritmo com "${
          onTrackGoal.name
        }", mas pode chegar lá mais rápido. Considere aportar mais ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          extraContribution
        )} por mês para concluí-la antes do prazo.`,
        category: "goal",
        priority: Priority.MEDIUM,
        actionable: true,
        estimatedImpact: extraContribution,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Debt Payoff Priority
  {
    id: "prioritize-debt-payoff",
    category: "goal",
    priority: Priority.HIGH,
    condition: (userPlan, forecast) => {
      const debtGoals = userPlan.goals.filter(
        (goal) => goal.category === GoalCategory.DEBT_PAYOFF && goal.isActive
      );
      const highInterestExpenses = userPlan.expenses.filter(
        (expense) =>
          expense.category === ExpenseCategory.DEBT_PAYMENTS && expense.isActive
      );
      return debtGoals.length > 0 && highInterestExpenses.length > 0;
    },
    generate: (userPlan, forecast) => {
      const debtPayments = getTotalMonthlyAmount(
        userPlan.expenses.filter(
          (expense) => expense.category === ExpenseCategory.DEBT_PAYMENTS
        )
      );
      const extraPayment = forecast.summary.averageMonthlyNet * 0.3; // 30% of surplus

      return {
        id: generateSuggestionId("goal"),
        title: "Priorize a quitação de dívidas",
        description: `Considere destinar ${new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(
          extraPayment
        )} extras por mês para quitar dívidas. Pagar dívidas com juros altos deve ser prioridade para reduzir o peso financeiro no longo prazo.`,
        category: "goal",
        priority: Priority.HIGH,
        actionable: true,
        estimatedImpact: extraPayment,
        createdAt: new Date().toISOString(),
      };
    },
  },

  // Investment Opportunity
  {
    id: "consider-investing",
    category: "goal",
    priority: Priority.MEDIUM,
    condition: (userPlan, forecast) => {
      const hasEmergencyFund = userPlan.goals.some(
        (goal) =>
          goal.category === GoalCategory.EMERGENCY_FUND &&
          goal.currentAmount >= goal.targetAmount * 0.8
      );
      const hasInvestmentGoal = userPlan.goals.some(
        (goal) => goal.category === GoalCategory.INVESTMENT && goal.isActive
      );
      return (
        hasEmergencyFund &&
        !hasInvestmentGoal &&
        forecast.summary.averageMonthlyNet > 500
      );
    },
    generate: (userPlan, forecast) => {
      const availableForInvestment = forecast.summary.averageMonthlyNet * 0.4; // 40% of surplus

      return {
        id: generateSuggestionId("goal"),
        title: "Considere começar a investir",
        description: `Com uma reserva de emergência sólida, considere investir ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(
          availableForInvestment
        )} por mês para construir patrimônio no longo prazo. Avalie fundos de índice ou previdência.`,
        category: "goal",
        priority: Priority.MEDIUM,
        actionable: true,
        estimatedImpact: availableForInvestment,
        createdAt: new Date().toISOString(),
      };
    },
  },
];

/**
 * Generate personalized financial suggestions
 */
export function generateSuggestions(
  userPlan: UserPlan,
  config: Partial<SuggestionConfig> = {}
): MonthlySuggestion[] {
  const defaultConfig: SuggestionConfig = {
    maxSuggestions: 5,
    minImpactThreshold: 10,
    focusAreas: ["income", "expense", "goal", "general"],
    conservativeMode: false,
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Generate forecast for analysis
  const forecast = generateForecast(userPlan, {
    conservativeMode: finalConfig.conservativeMode,
  });

  // Apply suggestion rules and generate suggestions
  const suggestions: MonthlySuggestion[] = [];

  for (const rule of suggestionRules) {
    // Check if this category is in focus areas
    if (!finalConfig.focusAreas.includes(rule.category)) {
      continue;
    }

    // Check if the rule condition is met
    if (rule.condition(userPlan, forecast)) {
      try {
        const suggestion = rule.generate(userPlan, forecast);

        // Filter by impact threshold
        if (
          Math.abs(suggestion.estimatedImpact) >= finalConfig.minImpactThreshold
        ) {
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.warn(
          `Failed to generate suggestion for rule ${rule.id}:`,
          error
        );
      }
    }
  }

  // Sort by priority and impact
  const priorityOrder = {
    [Priority.CRITICAL]: 4,
    [Priority.HIGH]: 3,
    [Priority.MEDIUM]: 2,
    [Priority.LOW]: 1,
  };

  suggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return Math.abs(b.estimatedImpact) - Math.abs(a.estimatedImpact);
  });

  // Return limited number of suggestions
  return suggestions.slice(0, finalConfig.maxSuggestions);
}

/**
 * Get suggestions for a specific category
 */
export function getSuggestionsByCategory(
  userPlan: UserPlan,
  category: "income" | "expense" | "goal" | "general",
  config: Partial<SuggestionConfig> = {}
): MonthlySuggestion[] {
  return generateSuggestions(userPlan, {
    ...config,
    focusAreas: [category],
  });
}

/**
 * Get high-priority suggestions only
 */
export function getHighPrioritySuggestions(
  userPlan: UserPlan,
  config: Partial<SuggestionConfig> = {}
): MonthlySuggestion[] {
  const suggestions = generateSuggestions(userPlan, config);
  return suggestions.filter(
    (suggestion) =>
      suggestion.priority === Priority.CRITICAL ||
      suggestion.priority === Priority.HIGH
  );
}

/**
 * Default suggestion configuration
 */
export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
  maxSuggestions: 5,
  minImpactThreshold: 10,
  focusAreas: ["income", "expense", "goal", "general"],
  conservativeMode: false,
};
