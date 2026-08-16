"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useFinancialState } from "@/context";
import {
  generateSuggestions,
  DEFAULT_SUGGESTION_CONFIG,
} from "@/utils/suggestionGenerator";
import {
  generateForecast,
  ForecastResult,
  ForecastConfig as UtilsForecastConfig,
} from "@/utils/forecastCalculator";
import { ForecastConfig, MonthlySuggestion, Priority } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatLocalizedMonth } from "@/utils/dateFormatting";

function LocalizedPriorityBadge({ priority }: { priority: Priority }) {
  switch (priority) {
    case Priority.CRITICAL:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Crítica
        </span>
      );
    case Priority.HIGH:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Alta
        </span>
      );
    case Priority.MEDIUM:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Média
        </span>
      );
    case Priority.LOW:
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Baixa
        </span>
      );
  }
}

function getCategoryLabel(category: string): string {
  switch (category.toLowerCase()) {
    case "expense":
      return "Despesas";
    case "income":
      return "Receitas";
    case "goal":
      return "Metas";
    case "debt":
      return "Dívidas";
    case "general":
      return "Geral";
    default:
      return category;
  }
}

function getLocalizedSuggestion(
  s: MonthlySuggestion,
  formatCurrency: (val: number) => string
) {
  let title = s.title;
  let description = s.description;

  if (s.title.includes("Consider Increasing Your Income")) {
    title = "Considere Aumentar sua Renda";
    description = `Para manter suas metas em dia, considere aumentar sua renda mensal em ${formatCurrency(
      s.estimatedImpact
    )} através de renda extra, freelas ou negociação salarial.`;
  } else if (s.title.startsWith("Reduce ") && s.title.endsWith(" Spending")) {
    const cat = s.title.replace("Reduce ", "").replace(" Spending", "");
    title = `Reduzir Gastos em ${cat}`;
    description = `Esta categoria representa uma fatia relevante do seu orçamento. Considere economizar ${formatCurrency(
      s.estimatedImpact
    )} por mês para acelerar suas metas financeiras.`;
  } else if (s.title.includes("Address Negative Cash Flow")) {
    title = "Equilibrar Fluxo de Caixa Negativo";
    description = `Sua previsão aponta meses com saldo sob pressão. Considere otimizar despesas em ${formatCurrency(
      s.estimatedImpact
    )} ao mês para garantir estabilidade financeira.`;
  } else if (s.title.includes("Build Your Emergency Fund")) {
    title = "Construir Reserva de Emergência";
    description = `Especialistas recomendam ter ao menos 6 meses de despesas guardados. Sugerimos alocar ${formatCurrency(
      s.estimatedImpact
    )} por mês para sua reserva.`;
  } else if (s.title.includes("Improve Your Savings Rate")) {
    title = "Aumentar Taxa de Poupança";
    description = `Recomenda-se poupar ao menos 20% dos rendimentos mensais. Sugerimos direcionar ${formatCurrency(
      s.estimatedImpact
    )} adicionais por mês para sua poupança.`;
  } else if (s.title.includes("Accelerate Your Goal Progress")) {
    title = "Acelerar Conquista de Metas";
    description = `Suas metas estão no ritmo! Você pode concluí-las antes do prazo aportando ${formatCurrency(
      s.estimatedImpact
    )} extras mensalmente.`;
  } else if (s.title.includes("Prioritize Debt Payoff")) {
    title = "Priorizar Quitação de Dívidas";
    description = `Considere direcionar ${formatCurrency(
      s.estimatedImpact
    )} adicionais por mês para liquidar dívidas e reduzir gastos com juros.`;
  } else if (s.title.includes("Consider Starting to Invest")) {
    title = "Começar a Investir no Futuro";
    description = `Com a reserva de emergência encaminhada, sugerimos investir ${formatCurrency(
      s.estimatedImpact
    )} por mês para rentabilizar seu patrimônio.`;
  }

  return { title, description };
}

export default function SuggestionsPage() {
  const state = useFinancialState();
  const { language, t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const showGoalAllocation = true;
  const [allocationViewMode, setAllocationViewMode] = useState<
    "calendar" | "table" | "chart"
  >("calendar");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  const suggestions = useMemo(() => {
    if (!state.userPlan) return [];
    return generateSuggestions(state.userPlan, DEFAULT_SUGGESTION_CONFIG);
  }, [state.userPlan]);

  const filteredSuggestions = useMemo(() => {
    if (activeCategoryFilter === "all") return suggestions;
    return suggestions.filter((s) => s.category === activeCategoryFilter);
  }, [suggestions, activeCategoryFilter]);

  const convertToUtilsConfig = (
    config: ForecastConfig
  ): UtilsForecastConfig => {
    return {
      months: config.months,
      startingBalance: config.startingBalance,
      startDate: config.startDate
        ? new Date(config.startDate + "-01T12:00:00")
        : undefined,
      includeGoalContributions: config.includeGoalContributions,
      conservativeMode: config.conservativeMode,
    };
  };

  const forecastResult: ForecastResult | null = useMemo(() => {
    if (!state.userPlan) return null;

    const forecastConfig = state.userPlan.forecastConfig || {
      startingBalance: state.userPlan.currentBalance || 0,
      startDate: new Date().toISOString().slice(0, 7),
      months: 12,
      includeGoalContributions: true,
      conservativeMode: false,
      updatedAt: new Date().toISOString(),
    };

    return generateForecast(
      state.userPlan,
      convertToUtilsConfig(forecastConfig)
    );
  }, [state.userPlan]);

  const goalAllocationData = useMemo(() => {
    if (!forecastResult || !state.userPlan?.goals) return [];

    const goalTracker = new Map<string, number>();
    state.userPlan.goals.forEach((goal) => {
      goalTracker.set(goal.id, goal.currentAmount);
    });

    const formatMonthLabel = (monthKey: string) => {
      const formatted = formatLocalizedMonth(monthKey, language);
      return formatted ? formatted.charAt(0).toUpperCase() + formatted.slice(1) : monthKey;
    };

    return forecastResult.monthlyForecasts.map((month) => {
      const enhancedGoalBreakdown = month.goalBreakdown.map(
        (goalAllocation) => {
          const goal = state.userPlan!.goals.find(
            (g) => g.id === goalAllocation.id
          );
          if (!goal)
            return {
              ...goalAllocation,
              progressPercent: 0,
              newTotal: 0,
              targetAmount: 0,
              goalType: "fixed_amount" as const,
              isCompleted: false,
            };

          const currentAmount = goalTracker.get(goal.id) || 0;
          const newTotal = currentAmount + goalAllocation.amount;
          goalTracker.set(goal.id, newTotal);

          const progressPercent =
            goal.goalType === "fixed_amount"
              ? Math.min(100, (newTotal / Math.max(1, goal.targetAmount)) * 100)
              : 0;

          return {
            ...goalAllocation,
            progressPercent: Math.round(progressPercent * 10) / 10,
            newTotal: newTotal,
            targetAmount: goal.targetAmount,
            goalType: goal.goalType,
            isCompleted:
              goal.goalType === "fixed_amount" && newTotal >= goal.targetAmount,
          };
        }
      );

      return {
        month: month.month,
        monthLabel: formatMonthLabel(month.month),
        goalBreakdown: enhancedGoalBreakdown,
        totalAllocation: month.goalContributions,
        surplus: month.income - month.expenses,
      };
    });
  }, [forecastResult, state.userPlan, language]);

  if (state.loading.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Carregando plano estratégico de metas...
          </p>
        </div>
      </div>
    );
  }

  const totalPotentialImpact = suggestions.reduce(
    (sum, s) => sum + Math.abs(s.estimatedImpact),
    0
  );

  const totalAllocationsSum = goalAllocationData.reduce(
    (sum, m) => sum + m.totalAllocation,
    0
  );
  const avgMonthlyAllocation =
    goalAllocationData.length > 0
      ? totalAllocationsSum / goalAllocationData.length
      : 0;

  const categoryFilterList = [
    { id: "all", label: "Todas" },
    { id: "expense", label: "Despesas" },
    { id: "income", label: "Receitas" },
    { id: "goal", label: "Metas" },
    { id: "general", label: "Geral" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Executive Header ────────────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>{t("goalPlan.title")}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
              {suggestions.length} Otimizações Identificadas
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {t("goalPlan.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-right">
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {t("goalPlan.summary.potentialImpact")}
            </div>
            <div className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalPotentialImpact)} / mês
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Economia & otimização projetada
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t("goalPlan.summary.totalSuggestions")}
          </span>
          <div className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
            {suggestions.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Oportunidades de melhoria
          </div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Ações Imediatas
          </span>
          <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {suggestions.filter((s) => s.actionable).length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Sem impacto no padrão de vida
          </div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Média Aporte Mensal
          </span>
          <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(avgMonthlyAllocation)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Aporte médio para objetivos
          </div>
        </div>

        <div className="surface-card p-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Metas no Ritmo
          </span>
          <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {forecastResult?.goalProgress.filter((g) => g.onTrack).length || 0} /{" "}
            {forecastResult?.goalProgress.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cumprem a data limite estipulada
          </div>
        </div>
      </div>

      {/* ── Monthly Goal Allocation Schedule ────────────────────────── */}
      {showGoalAllocation && (
        <div className="surface-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("goalPlan.schedule.title")}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t("goalPlan.schedule.subtitle")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/80 dark:border-slate-700/80">
                <button
                  onClick={() => setAllocationViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    allocationViewMode === "calendar"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Matriz Calendário
                </button>
                <button
                  onClick={() => setAllocationViewMode("table")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    allocationViewMode === "table"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Tabela Detalhada
                </button>
              </div>
            </div>
          </div>

          {!forecastResult ||
          !state.userPlan?.goals ||
          state.userPlan.goals.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                {t("goalPlan.empty.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                {t("goalPlan.empty.desc")}
              </p>
              <Link
                href="/goals"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                + Criar Metas
              </Link>
            </div>
          ) : (
            <>
              {allocationViewMode === "calendar" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {goalAllocationData.map((monthData) => (
                    <div
                      key={monthData.month}
                      className="surface-card p-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                            {monthData.monthLabel}
                          </h4>
                          <span className="text-xs font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(monthData.totalAllocation)}
                          </span>
                        </div>

                        {monthData.goalBreakdown.length > 0 ? (
                          <div className="space-y-2">
                            {monthData.goalBreakdown.map((goal) => (
                              <div
                                key={goal.id}
                                className="p-2.5 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                              >
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {goal.name}
                                  </span>
                                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                    +{formatCurrency(goal.amount)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400 mb-1.5">
                                  <span>Progresso:</span>
                                  <strong className="text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums">
                                    {goal.progressPercent}%
                                  </strong>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(0, goal.progressPercent)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center font-medium">
                            Sem aportes neste mês
                          </p>
                        )}
                      </div>

                      {monthData.surplus > monthData.totalAllocation && (
                        <div className="pt-2.5 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Excedente livre:
                          </span>
                          <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/60">
                            +{formatCurrency(
                              monthData.surplus - monthData.totalAllocation
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {allocationViewMode === "table" && (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">{t("goalPlan.table.month")}</th>
                        <th className="px-4 py-3 text-left">{t("goalPlan.table.allocations")}</th>
                        <th className="px-4 py-3 text-left">{t("goalPlan.table.total")}</th>
                        <th className="px-4 py-3 text-right">{t("goalPlan.table.surplus")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {goalAllocationData.map((m) => (
                        <tr
                          key={m.month}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100 capitalize">
                            {m.monthLabel}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {m.goalBreakdown.length > 0 ? (
                                m.goalBreakdown.map((g) => (
                                  <span
                                    key={g.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-medium"
                                  >
                                    <span>{g.name}:</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                                      {formatCurrency(g.amount)}
                                    </strong>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                      ({g.progressPercent}%)
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                                  Sem aportes
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(m.totalAllocation)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(
                              Math.max(0, m.surplus - m.totalAllocation)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Smart Insights Matrix ───────────────────────────────────── */}
      <div className="surface-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Matriz de Insights e Otimizações
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Recomendações algorítmicas para maximizar o fluxo livre e acelerar metas
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryFilterList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeCategoryFilter === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {filteredSuggestions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
            Nenhuma recomendação encontrada para o filtro selecionado.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuggestions.map((s) => {
              const localized = getLocalizedSuggestion(s, formatCurrency);
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {getCategoryLabel(s.category)}
                      </span>
                      <LocalizedPriorityBadge priority={s.priority} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      {localized.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {localized.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                      Impacto estimado:
                    </span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(Math.abs(s.estimatedImpact))}/mês
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
