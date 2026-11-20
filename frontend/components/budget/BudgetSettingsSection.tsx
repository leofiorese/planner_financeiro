"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFinancialContext } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { useTodayISO } from "@/hooks/useTodayISO";
import { createDefaultBudget } from "@/utils/budget/normalize";
import { formatPeriodLabel, formatShortDate, getDaysRemaining, getPeriodForDate } from "@/utils/budget/period";
import { getBudgetAmountForPeriod } from "@/utils/budget/budgetCalculator";
import { getTotalReserve } from "@/utils/budget/goalReservation";

interface BudgetSettingsSectionProps {
  open?: boolean;
  onToggle?: () => void;
  /** Quando true (aba das Configurações), o cabeçalho é só um título e o formulário fica sempre aberto. */
  alwaysOpen?: boolean;
}

/**
 * Seção "Budget Mensal" da página de Configurações (accordion).
 * Fica isolada aqui para a Sprint 2 só precisar reestilizar.
 */
export default function BudgetSettingsSection({ open: openProp = false, onToggle, alwaysOpen = false }: BudgetSettingsSectionProps) {
  const open = alwaysOpen || openProp;
  const { state, setBudgetSettings, setBudgetAmount } = useFinancialContext();
  const { formatCurrency } = useCurrency();
  const todayISO = useTodayISO();

  const budget = state.userPlan.budget ?? createDefaultBudget();
  const goals = state.userPlan.goals;

  // Valores salvos (referência para "mudou?" e para o badge)
  const savedPeriod = getPeriodForDate(todayISO, budget.rolloverDay);
  const savedAmount = getBudgetAmountForPeriod(budget.amountHistory, savedPeriod);

  // Rascunho do formulário
  const [enabled, setEnabled] = useState(budget.enabled);
  const [amountInput, setAmountInput] = useState(savedAmount > 0 ? String(savedAmount) : "");
  const [dayInput, setDayInput] = useState(String(budget.rolloverDay));
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // O plano carrega de forma assíncrona: re-sincroniza o rascunho quando o valor salvo muda
  useEffect(() => {
    setEnabled(budget.enabled);
    setAmountInput(savedAmount > 0 ? String(savedAmount) : "");
    setDayInput(String(budget.rolloverDay));
  }, [budget.enabled, budget.rolloverDay, savedAmount]);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const parsedAmount = Number(amountInput.replace(",", "."));
  const amountValid = amountInput.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const parsedDay = Number(dayInput);
  const dayValid = dayInput.trim() !== "" && Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31;

  // Previews calculados com o rascunho
  const draftDay = dayValid ? parsedDay : budget.rolloverDay;
  const draftPeriod = useMemo(() => getPeriodForDate(todayISO, draftDay), [todayISO, draftDay]);
  const daysLeft = getDaysRemaining(draftPeriod, todayISO);
  const reserve = useMemo(() => getTotalReserve(goals, draftPeriod, draftDay), [goals, draftPeriod, draftDay]);
  const draftEffective = amountValid ? Math.max(0, parsedAmount - reserve.total) : null;

  const history = useMemo(
    () => [...budget.amountHistory].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)),
    [budget.amountHistory]
  );

  const dirty =
    enabled !== budget.enabled ||
    (dayValid && parsedDay !== budget.rolloverDay) ||
    (amountValid && parsedAmount !== savedAmount);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayValid) {
      setFeedback({ kind: "error", text: "Informe um dia de virada entre 1 e 31." });
      return;
    }
    if (enabled && !amountValid) {
      setFeedback({ kind: "error", text: "Informe um valor de budget maior que zero para ativar." });
      return;
    }
    setBudgetSettings({ enabled, rolloverDay: parsedDay });
    if (amountValid && (parsedAmount !== savedAmount || budget.amountHistory.length === 0)) {
      setBudgetAmount(parsedAmount);
    }
    setFeedback({ kind: "ok", text: enabled ? "Budget salvo." : "Budget desativado." });
  };

  const badge = budget.enabled
    ? `${formatCurrency(savedAmount)} · vira dia ${budget.rolloverDay}`
    : "Desativado";

  return (
    <div className="surface-card overflow-hidden transition-all">
      {alwaysOpen ? (
        <div className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-lg shrink-0">
            💰
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Budget Mensal</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                {badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defina quanto pode gastar por período, com o dia em que o mês financeiro vira, e reserve parte para suas metas.
            </p>
          </div>
        </div>
        </div>
      ) : (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-lg shrink-0">
            💰
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Budget Mensal</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                {badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defina quanto pode gastar por período, com o dia em que o mês financeiro vira, e reserve parte para suas metas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
            {open ? "Recolher" : "Expandir"}
          </span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      )}

      {open && (
        <form
          onSubmit={handleSave}
          className="p-5 sm:p-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5"
        >
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ativar budget mensal</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget-amount" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor do budget (Y)
              </label>
              <input
                id="budget-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="5000"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {amountValid && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{formatCurrency(parsedAmount)} por período</p>
              )}
            </div>
            <div>
              <label htmlFor="budget-day" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Dia de virada
              </label>
              <input
                id="budget-day"
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                step="1"
                value={dayInput}
                onChange={(e) => setDayInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Se o mês não tiver esse dia, a virada acontece no último dia do mês.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 p-4 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Período atual: <strong>{formatPeriodLabel(draftPeriod, todayISO)}</strong> · faltam {daysLeft}{" "}
              {daysLeft === 1 ? "dia" : "dias"}
            </p>
            <p>
              {reserve.total > 0 ? (
                <>
                  Metas reservando: <strong>{formatCurrency(reserve.total)}</strong>
                  {draftEffective !== null && (
                    <>
                      {" "}
                      → disponível para gastar: <strong>{formatCurrency(draftEffective)}</strong>
                    </>
                  )}{" "}
                  ·{" "}
                  <Link href="/goals" className="text-indigo-600 dark:text-indigo-400 underline">
                    ver metas
                  </Link>
                </>
              ) : (
                <>
                  Nenhuma meta reserva do budget ainda.{" "}
                  <Link href="/goals" className="text-indigo-600 dark:text-indigo-400 underline">
                    Ir para Metas
                  </Link>
                </>
              )}
            </p>
          </div>

          {history.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Histórico do valor
              </h3>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {history.map((entry) => (
                  <li key={entry.effectiveFrom}>
                    a partir de {formatShortDate(entry.effectiveFrom)}: <strong>{formatCurrency(entry.amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!dirty}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Salvar
            </button>
            {feedback && (
              <span
                role="status"
                className={`text-xs font-semibold ${
                  feedback.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {feedback.text}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
