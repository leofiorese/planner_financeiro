import {
  Expense,
  Goal,
  GoalCategory,
  GoalType,
  Income,
  Frequency,
  PaymentMethod,
  Priority,
  UserPlan,
  BudgetSettings,
} from "../../types";

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: nextId("exp"),
    name: "Despesa",
    amount: 100,
    category: "miscellaneous",
    dueDate: "2026-11-25",
    paymentMethod: PaymentMethod.PIX,
    recurring: false,
    priority: Priority.MEDIUM,
    isActive: true,
    createdAt: "2026-11-01",
    updatedAt: "2026-11-01",
    ...overrides,
  };
}

/** Despesa avulsa via pix na data informada. */
export function oneOff(date: string, amount: number, overrides: Partial<Expense> = {}): Expense {
  return makeExpense({ dueDate: date, purchaseDate: date, amount, ...overrides });
}

export function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: nextId("inc"),
    name: "Salário",
    amount: 6000,
    frequency: Frequency.MONTHLY,
    startDate: "2026-01-20",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: nextId("goal"),
    name: "Meta",
    targetAmount: 4000,
    targetDate: "2027-02-25",
    currentAmount: 0,
    category: GoalCategory.OTHER,
    priority: Priority.MEDIUM,
    isActive: true,
    goalType: GoalType.FIXED_AMOUNT,
    priorityOrder: 1,
    reserveFromBudget: true,
    budgetReserveOverride: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

export function makeBudget(overrides: Partial<BudgetSettings> = {}): BudgetSettings {
  return {
    enabled: true,
    rolloverDay: 20,
    enabledAt: "2026-09-20",
    amountHistory: [{ amount: 5000, effectiveFrom: "2026-09-20" }],
    periodClosures: [],
    ...overrides,
  };
}

export function makePlan(overrides: Partial<UserPlan> = {}): UserPlan {
  return {
    id: "plan",
    income: [],
    expenses: [],
    goals: [],
    forecast: [],
    currentBalance: 0,
    forecastConfig: {
      startingBalance: 0,
      startDate: "2026-11",
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: "2026-11-01",
    },
    creditCardAccounts: [],
    budget: makeBudget(),
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}
