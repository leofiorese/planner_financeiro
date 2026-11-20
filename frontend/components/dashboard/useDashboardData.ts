"use client";

import { useMemo } from "react";
import type { UserPlan } from "@/types";
import { generateForecast } from "@/utils/forecastCalculator";

export interface RecentTransaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: string;
  isRecurring?: boolean;
}

/**
 * Indicadores do dashboard. O `generateForecast` de 12 meses roda **uma única vez** por mudança de
 * plano (antes eram duas chamadas na página, uma delas sem memoização).
 */
export function useDashboardData(userPlan: UserPlan | undefined) {
  const forecast = useMemo(() => {
    if (!userPlan?.id) return null;
    return generateForecast(userPlan, {
      months: 12,
      startDate: new Date(),
      includeGoalContributions: false,
      conservativeMode: false,
    });
  }, [userPlan]);

  const annual = useMemo(() => {
    const annualIncome = forecast?.summary.totalIncome ?? 0;
    const annualExpenses = forecast?.summary.totalExpenses ?? 0;
    const annualNet = annualIncome - annualExpenses;
    return {
      annualIncome,
      annualExpenses,
      annualNet,
      savingsRate: annualIncome > 0 ? (annualNet / annualIncome) * 100 : 0,
    };
  }, [forecast]);

  const activeGoals = useMemo(() => userPlan?.goals?.filter((goal) => goal.isActive) || [], [userPlan]);

  const upcomingGoals = useMemo(() => {
    const limit = new Date();
    limit.setDate(1);
    limit.setMonth(limit.getMonth() + 6);
    limit.setDate(0);
    return activeGoals
      .filter((goal) => new Date(goal.targetDate) <= limit)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .slice(0, 4);
  }, [activeGoals]);

  const recentTransactions = useMemo(() => {
    if (!userPlan) return [];
    const items: RecentTransaction[] = [];

    (userPlan.expenses || []).slice(0, 15).forEach((exp) => {
      items.push({
        id: `exp-${exp.id}`,
        name: exp.name,
        amount: exp.amount,
        type: "expense",
        date: exp.dueDate || exp.createdAt,
        category: exp.category,
        isRecurring: exp.recurring,
      });
    });

    (userPlan.income || []).slice(0, 10).forEach((inc) => {
      items.push({
        id: `inc-${inc.id}`,
        name: inc.name,
        amount: inc.amount,
        type: "income",
        date: inc.startDate || inc.createdAt,
        category: "Renda",
        isRecurring: inc.frequency !== undefined,
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [userPlan]);

  const isFirstTimeUser =
    !userPlan?.id ||
    (userPlan.income.length === 0 && userPlan.expenses.length === 0 && userPlan.goals.length === 0);

  const hasMinimalData = userPlan?.income.length === 0 || userPlan?.expenses.length === 0;

  return {
    ...annual,
    activeGoals,
    upcomingGoals,
    recentTransactions,
    isFirstTimeUser,
    hasMinimalData,
  };
}
