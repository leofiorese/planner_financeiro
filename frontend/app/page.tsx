"use client";

import BudgetCard from "@/components/budget/BudgetCard";
import GoalProgressChart from "@/components/charts/GoalProgressChart";
import ExpenseCategoryChart from "@/components/charts/ExpenseCategoryChart";
import IncomeVsExpensesChart from "@/components/charts/IncomeVsExpensesChart";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/LoadingState";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { InvestmentsCard } from "@/components/dashboard/InvestmentsCard";
import { MinimalDataBanner } from "@/components/dashboard/MinimalDataBanner";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { UpcomingGoals } from "@/components/dashboard/UpcomingGoals";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { useFinancialState } from "@/context";

export default function DashboardPage() {
  const state = useFinancialState();
  const data = useDashboardData(state.userPlan);

  if (state.loading?.isLoading) return <PageSkeleton stats={4} rows={3} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Dashboard" description="Sua visão financeira completa num relance" />

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

          <InvestmentsCard />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <IncomeVsExpensesChart userPlan={state.userPlan} />
            <ExpenseCategoryChart userPlan={state.userPlan} />
          </div>

          <UpcomingGoals goals={data.upcomingGoals} totalActive={data.activeGoals.length} />

          <RecentTransactions transactions={data.recentTransactions} />

          <GoalProgressChart userPlan={state.userPlan} />
        </>
      )}
    </div>
  );
}
