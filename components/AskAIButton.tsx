"use client";

import React, { useState } from "react";
import { useFinancialState } from "@/context";
import { useLanguage } from "@/context/LanguageContext";
import { Frequency } from "@/types";

interface AskAIButtonProps {
  className?: string;
}

export default function AskAIButton({ className = "" }: AskAIButtonProps) {
  const { t } = useLanguage();
  const state = useFinancialState();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"custom" | "quick">("quick");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const quickOptions = [
    {
      id: "overview",
      title: t("ai.quick.overview.title"),
      description: t("ai.quick.overview.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "savings",
      title: t("ai.quick.savings.title"),
      description: t("ai.quick.savings.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "expenses",
      title: t("ai.quick.expenses.title"),
      description: t("ai.quick.expenses.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      ),
    },
    {
      id: "goals",
      title: t("ai.quick.goals.title"),
      description: t("ai.quick.goals.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    },
    {
      id: "budget",
      title: t("ai.quick.budget.title"),
      description: t("ai.quick.budget.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: "investment",
      title: t("ai.quick.investment.title"),
      description: t("ai.quick.investment.desc"),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  const calculateMonthlyAmount = (amount: number, frequency: Frequency) => {
    switch (frequency) {
      case Frequency.DAILY:
        return amount * 30.44;
      case Frequency.WEEKLY:
        return amount * 4.33;
      case Frequency.BIWEEKLY:
        return amount * 2.17;
      case Frequency.MONTHLY:
        return amount;
      case Frequency.QUARTERLY:
        return amount / 3;
      case Frequency.YEARLY:
        return amount / 12;
      case Frequency.ONE_TIME:
        return 0;
      default:
        return amount;
    }
  };

  const generateFinancialSummary = () => {
    if (!state.userPlan) return "";

    const { income, expenses, goals, currentBalance } = state.userPlan;

    const totalMonthlyIncome = income
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + calculateMonthlyAmount(i.amount, i.frequency), 0);

    const totalMonthlyExpenses = expenses
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + calculateMonthlyAmount(e.amount, e.frequency || Frequency.MONTHLY), 0);

    const netCashflow = totalMonthlyIncome - totalMonthlyExpenses;
    const savingsRate = totalMonthlyIncome > 0 ? (netCashflow / totalMonthlyIncome) * 100 : 0;

    return `
# FINANCIAL SNAPSHOT
- Liquid Current Balance: R$ ${currentBalance.toFixed(2)}
- Total Monthly Income: R$ ${totalMonthlyIncome.toFixed(2)}
- Total Monthly Expenses: R$ ${totalMonthlyExpenses.toFixed(2)}
- Net Monthly Cashflow: R$ ${netCashflow.toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%

## ACTIVE INCOME STREAMS (${income.filter((i) => i.isActive).length}):
${income.filter((i) => i.isActive).map((i) => `- ${i.name}: R$ ${i.amount.toFixed(2)} (${i.frequency})`).join("\n")}

## ACTIVE EXPENSE OBLIGATIONS (${expenses.filter((e) => e.isActive).length}):
${expenses.filter((e) => e.isActive).map((e) => `- ${e.name} [${e.category}]: R$ ${e.amount.toFixed(2)} (${e.paymentMethod || "PIX"})`).join("\n")}

## ACTIVE GOALS (${goals.filter((g) => g.isActive).length}):
${goals.filter((g) => g.isActive).map((g) => `- ${g.name} [Priority: ${g.priority}]: Current R$ ${g.currentAmount.toFixed(2)} / Target R$ ${g.targetAmount.toFixed(2)} (Target Date: ${g.targetDate})`).join("\n")}
`;
  };

  const generateAnalysisPrompt = (analysisType: string) => {
    const financialData = generateFinancialSummary();
    return `Você é um Planejador Financeiro Certificado (CFP®) de alto nível. Analise detalhadamente a saúde financeira do cliente abaixo:\n\n${financialData}\n\nFoco da Análise: [${analysisType.toUpperCase()}]\n\nPor favor, forneça recomendações acionáveis, quantificadas em R$ e priorizadas por impacto.`;
  };

  const handleQuickAnalysis = (id: string) => {
    const prompt = generateAnalysisPrompt(id);
    setGeneratedPrompt(prompt);
  };

  const handleCustomQuery = () => {
    if (!query.trim()) return;
    const summary = generateFinancialSummary();
    const prompt = `Você é um CFP® sênior. Pergunta do cliente:\n"${query}"\n\nDados financeiros:\n${summary}`;
    setGeneratedPrompt(prompt);
  };

  const copyPromptToClipboard = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs ${className}`}
      >
        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>AI Copilot</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="surface-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    AI Financial Advisor & Prompt Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gere análises profundas ou prompts sob medida com seus dados reais
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Tab Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700/60 w-fit">
                <button
                  onClick={() => setActiveTab("quick")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "quick"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Análises Rápidas
                </button>
                <button
                  onClick={() => setActiveTab("custom")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === "custom"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Pergunta Personalizada
                </button>
              </div>

              {activeTab === "quick" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quickOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleQuickAnalysis(opt.id)}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-400 text-left transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600">
                        <span className="p-1 rounded-md bg-white dark:bg-slate-700 shrink-0">
                          {opt.icon}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {opt.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    O que você gostaria de perguntar ou simular sobre suas finanças?
                  </label>
                  <textarea
                    rows={3}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Posso comprar um carro de R$ 45.000 em 12x sem comprometer minha reserva de emergência?"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                  <button
                    onClick={handleCustomQuery}
                    disabled={!query.trim()}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    Gerar Prompt Estruturado
                  </button>
                </div>
              )}

              {/* Prompt Output */}
              {generatedPrompt && (
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Prompt Especializado Gerado
                    </span>
                    <button
                      onClick={copyPromptToClipboard}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>{copiedPrompt ? "✓ Copiado!" : "Copiar Prompt"}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs max-h-60 overflow-y-auto leading-relaxed border border-slate-800">
                    <pre className="whitespace-pre-wrap">{generatedPrompt}</pre>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Cole este prompt no ChatGPT, Claude ou Gemini para receber uma consultoria financeira individualizada baseada no seu plano atual.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
