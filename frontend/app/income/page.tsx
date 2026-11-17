"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFinancialState, useFinancialActions } from "@/context";
import { Frequency, CreateIncomeInput, UpdateIncomeInput } from "@/types";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedDate } from "@/utils/dateFormatting";
import DatePicker from "@/components/DatePicker";

export default function IncomePage() {
  const state = useFinancialState();
  const { addIncome, updateIncome, deleteIncome } = useFinancialActions();
  const { formatCurrency } = useCurrency();
  const { t, language } = useLanguage();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAddFormOpen && formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isAddFormOpen]);

  const [formData, setFormData] = useState<CreateIncomeInput>({
    name: "",
    amount: 0,
    frequency: Frequency.MONTHLY,
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
  });

  const handleInputChange = (
    field: keyof CreateIncomeInput,
    value: string | number | boolean | Frequency
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingIncome) {
        const updateData: UpdateIncomeInput = {
          id: editingIncome,
          ...formData,
        };
        await updateIncome(updateData);
        setEditingIncome(null);
      } else {
        await addIncome(formData);
        setIsAddFormOpen(false);
      }

      setFormData({
        name: "",
        amount: 0,
        frequency: Frequency.MONTHLY,
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        isActive: true,
      });
    } catch (error) {
      console.error("Failed to save income:", error);
    }
  };

  const handleEdit = (income: {
    id: string;
    name: string;
    amount: number;
    frequency: Frequency;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
  }) => {
    setFormData({
      name: income.name,
      amount: income.amount,
      frequency: income.frequency,
      description: income.description || "",
      startDate: income.startDate
        ? income.startDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      endDate: income.endDate ? income.endDate.split("T")[0] : "",
      isActive: income.isActive,
    });
    setEditingIncome(income.id);
    setIsAddFormOpen(true);
  };

  const handleDelete = async (incomeId: string) => {
    if (window.confirm(t("income.deleteConfirm"))) {
      try {
        await deleteIncome(incomeId);
      } catch (error) {
        console.error("Failed to delete income:", error);
      }
    }
  };

  const handleCancel = () => {
    setIsAddFormOpen(false);
    setEditingIncome(null);
    setFormData({
      name: "",
      amount: 0,
      frequency: Frequency.MONTHLY,
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
    });
  };

  const getFrequencyLabel = (frequency: Frequency) => {
    switch (frequency) {
      case Frequency.DAILY:
        return t("frequency.daily");
      case Frequency.WEEKLY:
        return t("frequency.weekly");
      case Frequency.BIWEEKLY:
        return t("frequency.biweekly");
      case Frequency.MONTHLY:
        return t("frequency.monthly");
      case Frequency.QUARTERLY:
        return t("frequency.quarterly");
      case Frequency.YEARLY:
        return t("frequency.yearly");
      case Frequency.ONE_TIME:
        return t("frequency.one_time");
      default:
        return frequency;
    }
  };

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

  const totalMonthlyIncome = state.userPlan.income
    .filter((income) => income.isActive)
    .reduce(
      (total, income) =>
        total + calculateMonthlyAmount(income.amount, income.frequency),
      0
    );

  const activeIncomes = state.userPlan.income.filter((i) => i.isActive);

  return (
    <div className="space-y-6">
      {/* ── Executive Header Banner ──────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <span>{t("income.pageTitle")}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
              {activeIncomes.length} {activeIncomes.length === 1 ? "Entrada Ativa" : "Entradas Ativas"}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("income.pageSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-right shadow-xs">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {t("income.totalMonthly")}
            </div>
            <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totalMonthlyIncome)}
            </div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Anualizado: ~{formatCurrency(totalMonthlyIncome * 12)}
            </div>
          </div>

          <button
            onClick={() => {
              setEditingIncome(null);
              setFormData({
                name: "",
                amount: 0,
                frequency: Frequency.MONTHLY,
                description: "",
                startDate: new Date().toISOString().split("T")[0],
                endDate: "",
                isActive: true,
              });
              setIsAddFormOpen(!isAddFormOpen);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("income.addButton")}</span>
          </button>
        </div>
      </div>

      {/* ── Add / Edit Form Panel ────────────────────────────────────── */}
      {isAddFormOpen && (
        <div
          ref={formRef}
          className="surface-card p-6 border-2 border-emerald-500/40 dark:border-emerald-600/50 bg-white dark:bg-slate-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200/80 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {editingIncome ? t("income.form.editTitle") : t("income.form.addTitle")}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {t("common.cancel")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.name")} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                placeholder={t("income.form.placeholder.name")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.amount")} *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount === 0 ? "" : formData.amount}
                onChange={(e) =>
                  handleInputChange("amount", parseFloat(e.target.value) || 0)
                }
                onFocus={(e) => {
                  if (e.target.value === "0") {
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.frequency")} *
              </label>
              <select
                required
                value={formData.frequency}
                onChange={(e) =>
                  handleInputChange("frequency", e.target.value as Frequency)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              >
                {Object.values(Frequency).map((freq) => (
                  <option key={freq} value={freq} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {getFrequencyLabel(freq)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.startDate")}
              </label>
              <DatePicker
                value={formData.startDate}
                onChange={(val) => handleInputChange("startDate", val)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.endDate")}
              </label>
              <DatePicker
                value={formData.endDate}
                onChange={(val) => handleInputChange("endDate", val)}
                min={formData.startDate}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 w-full cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    handleInputChange("isActive", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("income.form.active")} (incluir no total mensal)
                </span>
              </label>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t("income.form.description")}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                placeholder={t("income.form.placeholder.description")}
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={state.loading.isLoadingIncome}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {state.loading.isLoadingIncome
                  ? t("common.saving")
                  : editingIncome
                  ? t("income.editIncome")
                  : t("income.addIncome")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Income Streams Ledger ───────────────────────────────────── */}
      <div className="surface-card overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{t("income.listTitle")}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({state.userPlan.income.length})</span>
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {activeIncomes.length} {activeIncomes.length === 1 ? "ativa" : "ativas"}
          </span>
        </div>

        {state.userPlan.income.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("income.noIncome")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
              {t("dashboard.startIncomeHelper")}
            </p>
            <button
              onClick={() => setIsAddFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t("income.addIncome")}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.userPlan.income.map((income) => {
              const isEditing = editingIncome === income.id;
              const monthlyAmount = calculateMonthlyAmount(income.amount, income.frequency);

              return (
                <div
                  key={income.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isEditing
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {income.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            income.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700"
                          }`}
                        >
                          {income.isActive ? t("common.active") : t("common.inactive")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>
                          {t("income.form.frequency")}:{" "}
                          <strong className="text-slate-700 dark:text-slate-300 font-medium">
                            {getFrequencyLabel(income.frequency)}
                          </strong>
                        </span>
                        {income.startDate && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>
                              Início:{" "}
                              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                                {formatLocalizedDate(income.startDate, language)}
                              </strong>
                            </span>
                          </span>
                        )}
                        {income.endDate && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>
                              Término:{" "}
                              <strong className="text-slate-700 dark:text-slate-300 font-medium">
                                {formatLocalizedDate(income.endDate, language)}
                              </strong>
                            </span>
                          </span>
                        )}
                      </div>

                      {income.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {income.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-12 sm:pl-0">
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(income.amount)}
                      </div>
                      <div className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(monthlyAmount)} / mês
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(income)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-100 dark:hover:border-slate-700 transition-colors cursor-pointer"
                        title={t("income.editIncome")}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(income.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 border border-transparent hover:border-rose-100 dark:hover:border-slate-700 transition-colors cursor-pointer"
                        title={t("income.deleteIncome")}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {state.error.incomeError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
          <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
            {state.error.incomeError}
          </div>
        </div>
      )}
    </div>
  );
}
