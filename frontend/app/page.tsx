"use client";

import AskAIButton from "@/components/AskAIButton";
import BudgetCard from "@/components/budget/BudgetCard";
import GoalProgressChart from "@/components/charts/GoalProgressChart";
import ExpenseCategoryChart from "@/components/charts/ExpenseCategoryChart";
import IncomeVsExpensesChart from "@/components/charts/IncomeVsExpensesChart";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/LoadingState";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { MinimalDataBanner } from "@/components/dashboard/MinimalDataBanner";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { QuickShortcuts } from "@/components/dashboard/QuickShortcuts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { SuggestionsGrid } from "@/components/dashboard/SuggestionsGrid";
import { TopExpenseMonths } from "@/components/dashboard/TopExpenseMonths";
import { UpcomingGoals } from "@/components/dashboard/UpcomingGoals";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useFinancialState } from "@/context";

export default function DashboardPage() {
  const state = useFinancialState();
  const data = useDashboardData(state.userPlan);

  if (state.loading?.isLoading) return <PageSkeleton stats={4} rows={3} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Dashboard" description="Sua visão financeira completa num relance" actions={<AskAIButton />} />

      <BudgetCard />

      {data.isFirstTimeUser && <OnboardingCard />}

      {!data.isFirstTimeUser && data.hasMinimalData && (
        <MinimalDataBanner
          missingIncome={state.userPlan.income.length === 0}
          missingExpenses={state.userPlan.expenses.length === 0}
        />
      )}

      {!data.isFirstTimeUser && (
        <>
          <DashboardKpis
            annualIncome={data.annualIncome}
            annualExpenses={data.annualExpenses}
            annualNet={data.annualNet}
            savingsRate={data.savingsRate}
          />

          <QuickShortcuts />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <IncomeVsExpensesChart userPlan={state.userPlan} />
            <ExpenseCategoryChart userPlan={state.userPlan} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopExpenseMonths months={data.topExpenseMonths} />
            <UpcomingGoals goals={data.upcomingGoals} totalActive={data.activeGoals.length} />
          </div>

          <RecentTransactions transactions={data.recentTransactions} />

          <GoalProgressChart userPlan={state.userPlan} />

          <SuggestionsGrid suggestions={data.suggestions} />
        </>
      )}
    </div>
  );
}
