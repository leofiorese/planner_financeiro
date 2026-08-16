"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useFinancialState, useFinancialActions } from "@/context";
import {
  CreateCreditCardAccountInput,
  CreditCardAccountInfo,
  PaymentMethod,
} from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency } from "@/context/CurrencyContext";
import {
  calculateCreditCardDueDate,
  calculateCreditCardBillingMonth,
} from "@/utils/creditCardRules";
import { formatLocalizedDate, formatLocalizedMonth } from "@/utils/dateFormatting";
import DatePicker from "@/components/DatePicker";

const CARD_COLORS = [
  "#f97316", // orange (Inter)
  "#3b82f6", // blue (XP)
  "#8b5cf6", // violet / purple (Nubank)
  "#10b981", // emerald
  "#ec4899", // pink
  "#ef4444", // red (Santander / Bradesco)
  "#06b6d4", // cyan
  "#eab308", // gold / yellow (BB)
  "#6366f1", // indigo
  "#0f172a", // black / slate (Black cards)
];

export default function CardsPage() {
  const state = useFinancialState();
  const {
    addCreditCardAccount,
    updateCreditCardAccount,
    deleteCreditCardAccount,
  } = useFinancialActions();
  const { t, language } = useLanguage();
  const { formatCurrency } = useCurrency();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCreditCardAccountInput>({
    name: "",
    dueDay: 18,
    closingDay: 11,
    color: CARD_COLORS[0],
    isActive: true,
  });

  // Simulator state
  const [simCardId, setSimCardId] = useState<string>("");
  const [simPurchaseDate, setSimPurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const creditCardAccounts = useMemo(
    () => state.userPlan.creditCardAccounts || [],
    [state.userPlan.creditCardAccounts]
  );
  const activeCount = creditCardAccounts.filter((c) => c.isActive).length;
  const expenses = useMemo(
    () => state.userPlan.expenses || [],
    [state.userPlan.expenses]
  );

  // Initialize simulator with first active card
  useEffect(() => {
    if (creditCardAccounts.length > 0 && !simCardId) {
      const firstActive = creditCardAccounts.find((c) => c.isActive);
      if (firstActive) {
        setSimCardId(firstActive.id);
      } else {
        setSimCardId(creditCardAccounts[0].id);
      }
    }
  }, [creditCardAccounts, simCardId]);

  // Scroll to form when opened
  useEffect(() => {
    if (isAddFormOpen && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddFormOpen]);

  // Compute expenses breakdown per card
  const cardStats = useMemo(() => {
    const map: Record<
      string,
      { count: number; totalAmount: number; currentMonthAmount: number }
    > = {};

    const currentYearMonth = new Date().toISOString().slice(0, 7);

    creditCardAccounts.forEach((c) => {
      map[c.id] = { count: 0, totalAmount: 0, currentMonthAmount: 0 };
    });

    expenses.forEach((exp) => {
      if (
        exp.paymentMethod === PaymentMethod.CREDIT_CARD &&
        exp.creditCardAccount
      ) {
        const cardKey = exp.creditCardAccount;
        // Match either by ID or name
        const matched = creditCardAccounts.find(
          (c) => c.id === cardKey || c.name.toLowerCase() === cardKey.toLowerCase()
        );
        const targetId = matched ? matched.id : cardKey;

        if (!map[targetId]) {
          map[targetId] = { count: 0, totalAmount: 0, currentMonthAmount: 0 };
        }

        const amt = Number(exp.amount) || 0;
        map[targetId].count += 1;
        map[targetId].totalAmount += amt;

        const expMonth = (exp.dueDate || "").slice(0, 7);
        if (expMonth === currentYearMonth) {
          map[targetId].currentMonthAmount += amt;
        }
      }
    });

    return map;
  }, [creditCardAccounts, expenses]);

  // Simulation calculations
  const simResult = useMemo(() => {
    if (!simCardId) return null;
    const card = creditCardAccounts.find((c) => c.id === simCardId);
    if (!card) return null;

    const purchase = new Date(simPurchaseDate + "T12:00:00");
    const purchaseDay = purchase.getDate();
    const isRolledOver = purchaseDay > card.closingDay;

    const calculatedDueDate = calculateCreditCardDueDate(
      card.id,
      purchase,
      creditCardAccounts
    );
    const calculatedBillingMonth = calculateCreditCardBillingMonth(
      card.id,
      purchase,
      creditCardAccounts
    );

    // Calculate days until payment
    const dueDateObj = new Date(calculatedDueDate + "T12:00:00");
    const diffTime = dueDateObj.getTime() - purchase.getTime();
    const daysUntilDue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Calculate days until closing
    let closingDateThisMonth = new Date(
      purchase.getFullYear(),
      purchase.getMonth(),
      card.closingDay,
      23,
      59,
      59
    );
    if (purchaseDay > card.closingDay) {
      closingDateThisMonth = new Date(
        purchase.getFullYear(),
        purchase.getMonth() + 1,
        card.closingDay,
        23,
        59,
        59
      );
    }
    const daysUntilClosing = Math.max(
      0,
      Math.ceil((closingDateThisMonth.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      card,
      purchaseDay,
      isRolledOver,
      calculatedDueDate,
      calculatedBillingMonth,
      daysUntilDue,
      daysUntilClosing,
    };
  }, [simCardId, simPurchaseDate, creditCardAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCard) {
        await updateCreditCardAccount({
          id: editingCard,
          ...formData,
        });
        setEditingCard(null);
      } else {
        await addCreditCardAccount(formData);
      }

      setIsAddFormOpen(false);
      setFormData({
        name: "",
        dueDay: 18,
        closingDay: 11,
        color: CARD_COLORS[0],
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to save card:", error);
    }
  };

  const handleEdit = (card: CreditCardAccountInfo) => {
    setEditingCard(card.id);
    setFormData({
      name: card.name,
      dueDay: card.dueDay,
      closingDay: card.closingDay,
      color: card.color || CARD_COLORS[0],
      isActive: card.isActive,
    });
    setIsAddFormOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    if (window.confirm(t("cards.deleteConfirm"))) {
      try {
        await deleteCreditCardAccount(cardId);
      } catch (error) {
        console.error("Failed to delete card:", error);
      }
    }
  };

  const handleCancel = () => {
    setIsAddFormOpen(false);
    setEditingCard(null);
    setFormData({
      name: "",
      dueDay: 18,
      closingDay: 11,
      color: CARD_COLORS[0],
      isActive: true,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Executive Header Banner ──────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t("cards.pageTitle")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60">
              {activeCount} {activeCount === 1 ? (language === "pt" ? "Cartão Ativo" : "Active Card") : (language === "pt" ? "Cartões Ativos" : "Active Cards")}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {language === "pt"
              ? "Configure suas instituições de crédito, dias de fechamento (corte) e vencimento de fatura para cálculo automático de competência em todas as despesas."
              : "Configure your credit cards, statement closing days, and payment due dates for automatic billing cycle calculations across all expenses."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/expenses"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
            </svg>
            <span>{language === "pt" ? "Ver Despesas" : "View Expenses"}</span>
          </Link>
          <button
            onClick={() => {
              setEditingCard(null);
              setFormData({
                name: "",
                dueDay: 18,
                closingDay: 11,
                color: CARD_COLORS[0],
                isActive: true,
              });
              setIsAddFormOpen(!isAddFormOpen);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("cards.addButton")}</span>
          </button>
        </div>
      </div>

      {/* ── Business Logic Insight Alert ─────────────────────────────── */}
      <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-indigo-950 dark:text-indigo-200">
            {language === "pt"
              ? "Como funciona a virada de fatura no sistema?"
              : "How does the billing cycle work?"}
          </h4>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === "pt" ? (
              <>
                Toda compra é comparada com o <strong>Dia de Fechamento</strong> do cartão: compras realizadas até o dia de corte entram na fatura do <strong>Mês Atual</strong>. Compras a partir do dia seguinte viram para a fatura do <strong>Mês Seguinte</strong>, caindo no <strong>Dia de Vencimento</strong> da próxima competência.
              </>
            ) : (
              <>
                Every transaction is compared with the card&apos;s <strong>Closing Day</strong>: purchases up to the closing date appear on the <strong>Current Month</strong> statement. Purchases after the closing date roll over to the <strong>Next Month</strong> statement, due on the configured <strong>Due Day</strong>.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Add/Edit Card Drawer / Form ──────────────────────────────── */}
      {isAddFormOpen && (
        <div
          ref={formRef}
          className="surface-card p-6 border-2 border-indigo-400/80 dark:border-indigo-600/80 bg-white dark:bg-slate-900 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200/80 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shadow-xs"
                style={{ backgroundColor: formData.color }}
              />
              {editingCard ? t("cards.form.editTitle") : t("cards.form.addTitle")}
            </h3>
            <button
              onClick={handleCancel}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {language === "pt" ? "Fechar" : "Close"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Form fields (7 cols) */}
              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("cards.form.name")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t("cards.form.namePlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("cards.form.closingDay")} (Corte) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={formData.closingDay}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        closingDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {t("cards.form.closingDayHelp")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("cards.form.dueDay")} (Vencimento) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={formData.dueDay}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {t("cards.form.dueDayHelp")}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t("cards.form.color")}
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {CARD_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, color }))}
                        className={`w-7 h-7 rounded-full border border-black/10 dark:border-white/10 transition-all duration-200 cursor-pointer ${
                          formData.color === color
                            ? "ring-2 ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-slate-900 scale-110 shadow-sm"
                            : "hover:scale-105 opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Selecionar cor ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="card-active-toggle"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="card-active-toggle"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {language === "pt" ? "Cartão Ativo para lançamentos" : "Active card for new expenses"}
                  </label>
                </div>
              </div>

              {/* Live Card Preview Mockup (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div
                  className="w-full max-w-sm rounded-2xl p-5 text-white shadow-xl relative overflow-hidden transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${formData.color} 0%, ${formData.color}cc 60%, #0f172a 100%)`,
                  }}
                >
                  {/* Decorative background glow & circles */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-black/20 blur-xl pointer-events-none" />

                  {/* Header: Chip and contactless */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-2">
                      {/* EMV Chip Mockup */}
                      <div className="w-10 h-7 rounded-md bg-amber-200/90 border border-amber-400/80 flex items-center justify-center shadow-inner">
                        <div className="w-6 h-4 border border-amber-600/40 rounded-xs grid grid-cols-2" />
                      </div>
                      {/* Contactless waves */}
                      <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 10a4 4 0 010 4m3-6a7 7 0 010 8m3-10a10 10 0 010 12" />
                      </svg>
                    </div>

                    <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-black/20 backdrop-blur-xs font-bold">
                      {formData.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  {/* Card Name */}
                  <div className="mb-6 relative z-10">
                    <div className="text-[10px] tracking-wider uppercase opacity-75 font-medium">
                      {language === "pt" ? "Instituição / Cartão" : "Credit Account"}
                    </div>
                    <div className="text-base font-bold tracking-wide truncate">
                      {formData.name || (language === "pt" ? "Nome do Cartão" : "Card Name")}
                    </div>
                  </div>

                  {/* Footer: Closing & Due Days */}
                  <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/15 relative z-10">
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider opacity-75 font-semibold">
                        {language === "pt" ? "Fechamento" : "Closing"}
                      </span>
                      <span className="font-bold tabular-nums">
                        Dia {formData.closingDay}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] uppercase tracking-wider opacity-75 font-semibold">
                        {language === "pt" ? "Vencimento" : "Due Date"}
                      </span>
                      <span className="font-bold tabular-nums">
                        Dia {formData.dueDay}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                  {language === "pt" ? "Pré-visualização do cartão em tempo real" : "Real-time card preview"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {t("cards.form.save")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t("cards.form.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Cards Grid ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === "pt" ? "Cartões Cadastrados" : "Configured Credit Cards"}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {creditCardAccounts.length} {creditCardAccounts.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {creditCardAccounts.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("cards.noCards")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              Cadastre seus cartões de crédito para calcular o fechamento e vencimento automático de parcelas.
            </p>
            <button
              onClick={() => setIsAddFormOpen(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t("cards.addButton")}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditCardAccounts.map((card) => {
              const stats = cardStats[card.id] || { count: 0, totalAmount: 0, currentMonthAmount: 0 };
              const isSelectedInSim = simCardId === card.id;

              return (
                <div
                  key={card.id}
                  className={`surface-card overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                    isSelectedInSim
                      ? "ring-2 ring-indigo-500/80 shadow-xs"
                      : ""
                  }`}
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: card.color || CARD_COLORS[0] }}
                  />

                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                          style={{
                            backgroundColor: `${card.color || CARD_COLORS[0]}18`,
                            borderColor: `${card.color || CARD_COLORS[0]}35`,
                            color: card.color || CARD_COLORS[0],
                          }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {card.name}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                card.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {card.isActive ? (language === "pt" ? "Ativo" : "Active") : (language === "pt" ? "Desativado" : "Inactive")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(card)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={language === "pt" ? "Editar cartão" : "Edit card"}
                          aria-label={language === "pt" ? "Editar cartão" : "Edit card"}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={language === "pt" ? "Excluir cartão" : "Delete card"}
                          aria-label={language === "pt" ? "Excluir cartão" : "Delete card"}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Closing & Due Day pill boxes */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-0.5">
                          {t("cards.closingDay")} (Corte)
                        </span>
                        <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Dia {card.closingDay}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-0.5">
                          {t("cards.dueDay")} (Vencimento)
                        </span>
                        <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Dia {card.dueDay}
                        </span>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                          {stats.count}
                        </span>{" "}
                        {language === "pt" ? "lançamentos" : "expenses"}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatCurrency(stats.totalAmount)}
                      </div>
                    </div>

                    {/* Quick Simulator activation */}
                    <button
                      type="button"
                      onClick={() => setSimCardId(card.id)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelectedInSim
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700"
                          : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {isSelectedInSim
                          ? (language === "pt" ? "Simulador Ativo neste Cartão" : "Active in Simulator")
                          : (language === "pt" ? "Simular Virada de Fatura" : "Simulate Billing Cycle")}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Interactive Invoice Simulator (Simulador de Fatura) ─────────── */}
      {creditCardAccounts.length > 0 && simResult && (
        <div className="surface-card p-6 border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {language === "pt"
                  ? "Simulador Interativo de Fatura & Vencimento"
                  : "Interactive Invoice & Due Date Simulator"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === "pt"
                  ? "Teste diferentes datas de compra e visualize em qual fatura o gasto cairá e quantos dias você terá até o vencimento."
                  : "Test different purchase dates to see statement allocation and days until payment."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === "pt" ? "Cartão:" : "Card:"}
              </label>
              <select
                value={simCardId}
                onChange={(e) => setSimCardId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                {creditCardAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Fecha dia {c.closingDay} / Vence dia {c.dueDay})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Input date & quick presets (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === "pt" ? "Data Simulada da Compra:" : "Simulated Purchase Date:"}
                </label>
                <DatePicker
                  value={simPurchaseDate}
                  onChange={(val) => setSimPurchaseDate(val)}
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  {language === "pt" ? "Atalhos de Simulação:" : "Quick Test Days:"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setSimPurchaseDate(now.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {language === "pt" ? "Hoje" : "Today"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const d = new Date(now.getFullYear(), now.getMonth(), simResult.card.closingDay);
                      setSimPurchaseDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {language === "pt" ? "No dia do Corte" : "On Closing Day"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const d = new Date(now.getFullYear(), now.getMonth(), simResult.card.closingDay + 1);
                      setSimPurchaseDate(d.toISOString().split("T")[0]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors col-span-2"
                  >
                    {language === "pt"
                      ? `Melhor Dia (Dia ${simResult.card.closingDay + 1} - Pós Corte)`
                      : `Best Day (Day ${simResult.card.closingDay + 1} - Post Closing)`}
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Statement Flow (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: simResult.card.color || "#6366f1" }}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {simResult.card.name}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    simResult.isRolledOver
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/80"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {simResult.isRolledOver
                    ? (language === "pt" ? "Fatura do Mês Seguinte (+1 Mês)" : "Next Month Statement (+1 Mo)")
                    : (language === "pt" ? "Fatura do Mês Atual" : "Current Month Statement")}
                </span>
              </div>

              {/* Step Flow Diagram */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                    1. {language === "pt" ? "Data da Compra" : "Purchase Date"}
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatLocalizedDate(simPurchaseDate, language)}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {language === "pt" ? `Dia ${simResult.purchaseDay} do mês` : `Day ${simResult.purchaseDay}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                    2. {language === "pt" ? "Corte da Fatura" : "Invoice Cutoff"}
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Dia {simResult.card.closingDay}
                  </div>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${
                      simResult.isRolledOver
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {simResult.isRolledOver
                      ? (language === "pt" ? "Compra após corte ➜ Vira fatura" : "After cutoff ➜ Rolls over")
                      : (language === "pt" ? "Compra até corte ➜ Entra agora" : "Before cutoff ➜ Current bill")}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider mb-1">
                    3. {language === "pt" ? "Data de Vencimento" : "Payment Due Date"}
                  </span>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {formatLocalizedDate(simResult.calculatedDueDate, language)}
                  </div>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">
                    {simResult.daysUntilDue} {language === "pt" ? "dias até pagar" : "days until due"}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {language === "pt" ? "Competência no Orçamento: " : "Budget Allocation: "}
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                  {formatLocalizedMonth(simResult.calculatedBillingMonth, language, {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="text-slate-500 dark:text-slate-400 ml-1">
                  ({language === "pt" ? `Fatura vence em ${formatLocalizedDate(simResult.calculatedDueDate, language)}` : `Bill due on ${formatLocalizedDate(simResult.calculatedDueDate, language)}`})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
