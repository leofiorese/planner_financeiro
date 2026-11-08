/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, useMemo } from "react";
import { useFinancialContext } from "@/context";
import {
  useCurrency,
  SUPPORTED_CURRENCIES,
  CurrencyCode,
} from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  CreditCardAccountInfo,
  ExpenseCategoryConfig,
  PaymentMethod,
} from "@/types";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  SUGGESTED_CATEGORY_EMOJIS,
  SUGGESTED_CATEGORY_COLORS,
  getOrderedCategories,
} from "@/utils/categoryRules";
import {
  downloadJSON,
  downloadCSV,
  validateFileType,
  formatFileSize,
} from "@/utils/fileOperations";
import { serializeToJSON, serializeToCSV } from "@/utils/dataExport";
import { importFinancialData } from "@/utils/dataImport";
import DatePicker from "@/components/DatePicker";

const CARD_COLOR_PALETTE = [
  { name: "Laranja (Inter)", hex: "#f97316" },
  { name: "Azul (XP / BTG)", hex: "#3b82f6" },
  { name: "Roxo (Nubank)", hex: "#8b5cf6" },
  { name: "Vermelho (Santander / Bradesco)", hex: "#ef4444" },
  { name: "Amarelo (C6 / BB)", hex: "#eab308" },
  { name: "Verde (Sicredi / Stone)", hex: "#10b981" },
  { name: "Grafite (Black / Infinite)", hex: "#334155" },
  { name: "Rosa", hex: "#ec4899" },
];

type SectionKey = "categories" | "cards" | "currency" | "importExport";

export default function SystemSettingsPage() {
  const {
    state,
    addCreditCardAccount,
    updateCreditCardAccount,
    deleteCreditCardAccount,
    setExpenseCategories,
    dispatch,
  } = useFinancialContext();
  const { currency, setCurrency, formatCurrency } = useCurrency();
  const { language } = useLanguage();
  const isEn = language === "en";

  // ── All sections start CLOSED by default ──────────────────────────────
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    categories: false,
    cards: false,
    currency: false,
    importExport: false,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // =========================================================================
  // 1. CATEGORIES MANAGEMENT STATE & LOGIC
  // =========================================================================
  const orderedCategories = useMemo(
    () => getOrderedCategories(state.userPlan?.expenseCategories),
    [state.userPlan?.expenseCategories]
  );

  const [newCatEmoji, setNewCatEmoji] = useState("🏷️");
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatEmoji, setEditCatEmoji] = useState("");
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("");

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedCategories.length) return;

    const updated = [...orderedCategories];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reindexed = updated.map((cat, idx) => ({ ...cat, order: idx }));
    await setExpenseCategories(reindexed);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;

    const customId = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCategory: ExpenseCategoryConfig = {
      id: customId,
      name: trimmedName,
      emoji: newCatEmoji.trim() || "🏷️",
      color: newCatColor || "#6366f1",
      order: orderedCategories.length,
      isDefault: false,
    };

    await setExpenseCategories([...orderedCategories, newCategory]);
    setNewCatName("");
    setNewCatEmoji("🏷️");
    setShowEmojiPickerFor(null);
  };

  const handleStartEditCategory = (cat: ExpenseCategoryConfig) => {
    setEditingCategoryId(cat.id);
    setEditCatEmoji(cat.emoji);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
    setShowEmojiPickerFor(null);
  };

  const handleSaveEditCategory = async (catId: string) => {
    if (!editCatName.trim()) return;
    const updated = orderedCategories.map((c) =>
      c.id === catId
        ? {
            ...c,
            emoji: editCatEmoji.trim() || "📦",
            name: editCatName.trim(),
            color: editCatColor || c.color,
          }
        : c
    );
    await setExpenseCategories(updated);
    setEditingCategoryId(null);
    setShowEmojiPickerFor(null);
  };

  const handleDeleteCategory = async (cat: ExpenseCategoryConfig) => {
    if (orderedCategories.length <= 1) {
      alert(
        isEn
          ? "The system must have at least one category."
          : "O sistema deve possuir pelo menos uma categoria."
      );
      return;
    }

    const linkedCount = (state.userPlan?.expenses || []).filter(
      (e) => e.category === cat.id
    ).length;

    const confirmMsg =
      linkedCount > 0
        ? `Tem certeza que deseja retirar a categoria "${cat.emoji} ${cat.name}"? Existem ${linkedCount} despesa(s) vinculada(s) a ela que serão movidas para "📦 Outros / Diversos".`
        : `Tem certeza que deseja retirar a categoria "${cat.emoji} ${cat.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    const remaining = orderedCategories
      .filter((c) => c.id !== cat.id)
      .map((c, idx) => ({ ...c, order: idx }));

    await setExpenseCategories(remaining);
  };

  const handleRestoreDefaultCategories = async () => {
    if (
      !window.confirm(
        isEn
          ? "Restore the 9 base categories and default sequence?"
          : "Deseja restaurar as 9 categorias base e a sequência padrão do sistema?"
      )
    ) {
      return;
    }
    await setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    setEditingCategoryId(null);
  };

  // =========================================================================
  // 2. CREDIT CARDS MANAGEMENT STATE & LOGIC
  // =========================================================================
  const cards = useMemo(
    () => state.userPlan?.creditCardAccounts || [],
    [state.userPlan?.creditCardAccounts]
  );

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardAccountInfo | null>(null);
  const [cardName, setCardName] = useState("");
  const [closingDay, setClosingDay] = useState(11);
  const [dueDay, setDueDay] = useState(18);
  const [cardColor, setCardColor] = useState("#f97316");
  const [cardIsActive, setCardIsActive] = useState(true);
  const [cardError, setCardError] = useState<string | null>(null);

  const [simCardId, setSimCardId] = useState<string>("");
  const [simDate, setSimDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const resetCardForm = () => {
    setCardName("");
    setClosingDay(11);
    setDueDay(18);
    setCardColor("#f97316");
    setCardIsActive(true);
    setEditingCard(null);
    setIsAddingCard(false);
    setCardError(null);
  };

  const handleOpenAddCard = () => {
    resetCardForm();
    setIsAddingCard(true);
  };

  const handleOpenEditCard = (card: CreditCardAccountInfo) => {
    setEditingCard(card);
    setCardName(card.name);
    setClosingDay(card.closingDay);
    setDueDay(card.dueDay);
    setCardColor(card.color || "#6366f1");
    setCardIsActive(card.isActive);
    setIsAddingCard(true);
    setCardError(null);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardError(null);

    if (!cardName.trim()) {
      setCardError("Informe o nome do cartão.");
      return;
    }
    if (closingDay < 1 || closingDay > 31 || dueDay < 1 || dueDay > 31) {
      setCardError("Os dias de fechamento e vencimento devem estar entre 1 e 31.");
      return;
    }

    try {
      if (editingCard) {
        await updateCreditCardAccount({
          id: editingCard.id,
          name: cardName.trim(),
          closingDay,
          dueDay,
          color: cardColor,
          isActive: cardIsActive,
        });
      } else {
        await addCreditCardAccount({
          name: cardName.trim(),
          closingDay,
          dueDay,
          color: cardColor,
          isActive: cardIsActive,
        });
      }
      resetCardForm();
    } catch {
      setCardError("Não foi possível salvar o cartão.");
    }
  };

  const handleDeleteCard = async (card: CreditCardAccountInfo) => {
    const linkedExpenses = (state.userPlan?.expenses || []).filter(
      (exp) =>
        exp.paymentMethod === PaymentMethod.CREDIT_CARD &&
        (exp.creditCardAccount === card.id ||
          exp.creditCardAccount?.toLowerCase() === card.name.toLowerCase())
    );

    const confirmMsg =
      linkedExpenses.length > 0
        ? `Existem ${linkedExpenses.length} despesa(s) associada(s) ao cartão "${card.name}". Deseja realmente removê-lo?`
        : `Tem certeza que deseja remover o cartão "${card.name}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteCreditCardAccount(card.id);
    }
  };

  const cardStats = useMemo(() => {
    const stats: Record<string, { count: number; totalAmount: number }> = {};
    cards.forEach((c) => {
      stats[c.id] = { count: 0, totalAmount: 0 };
    });

    (state.userPlan?.expenses || []).forEach((exp) => {
      if (!exp.isActive || exp.paymentMethod !== PaymentMethod.CREDIT_CARD) return;
      const cardMatch = cards.find(
        (c) =>
          c.id === exp.creditCardAccount ||
          c.name.toLowerCase() === (exp.creditCardAccount || "").toLowerCase()
      );
      if (cardMatch && stats[cardMatch.id]) {
        stats[cardMatch.id].count += 1;
        stats[cardMatch.id].totalAmount += exp.amount;
      }
    });

    return stats;
  }, [cards, state.userPlan?.expenses]);

  const activeSimCard = useMemo(() => {
    if (simCardId) {
      const found = cards.find((c) => c.id === simCardId);
      if (found) return found;
    }
    return cards[0] || null;
  }, [cards, simCardId]);

  const simResult = useMemo(() => {
    if (!activeSimCard || !simDate) return null;
    const parts = simDate.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;

    const afterClosing = day > activeSimCard.closingDay;
    let targetMonth = month - 1;
    let targetYear = year;

    if (afterClosing) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const dueDateObj = new Date(targetYear, targetMonth, activeSimCard.dueDay);
    const purchaseDateObj = new Date(year, month - 1, day);
    const diffDays = Math.round(
      (dueDateObj.getTime() - purchaseDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    });

    return {
      afterClosing,
      dueDateFormatted: dueDateObj.toLocaleDateString("pt-BR"),
      invoiceMonthLabel: monthFormatter.format(dueDateObj),
      daysToPay: diffDays,
    };
  }, [activeSimCard, simDate]);

  // =========================================================================
  // 3. IMPORT / EXPORT STATE & LOGIC
  // =========================================================================
  const [exportOptions, setExportOptions] = useState<{
    includeInactive: boolean;
  }>({
    includeInactive: true,
  });
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | "warning" | null;
    message: string;
    details?: string[];
  }>({ type: null, message: "" });
  const [dragActive, setDragActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const getFilteredPlanForExport = () => {
    const filtered = { ...state.userPlan };
    if (!exportOptions.includeInactive) {
      filtered.income = filtered.income.filter((i) => i.isActive);
      filtered.expenses = filtered.expenses.filter((e) => e.isActive);
      filtered.goals = filtered.goals.filter((g) => g.isActive);
    }

    if (dateRangeEnabled && startDate && endDate) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      filtered.expenses = filtered.expenses.filter((exp) => {
        const d = new Date(exp.dueDate).getTime();
        return d >= s && d <= e;
      });
    }
    return filtered;
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const planToExport = getFilteredPlanForExport();
      const jsonStr = serializeToJSON(planToExport);
      downloadJSON(jsonStr);
      setImportStatus({
        type: "success",
        message: isEn
          ? "JSON exported successfully!"
          : "Dados exportados em JSON com sucesso!",
      });
    } catch (error) {
      setImportStatus({
        type: "error",
        message: `Erro ao exportar JSON: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const planToExport = getFilteredPlanForExport();
      const csvStr = serializeToCSV(planToExport);
      downloadCSV(csvStr);
      setImportStatus({
        type: "success",
        message: isEn
          ? "CSV exported successfully!"
          : "Dados exportados em CSV com sucesso!",
      });
    } catch (error) {
      setImportStatus({
        type: "error",
        message: `Erro ao exportar CSV: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const processImportFile = async (file: File) => {
    setIsImporting(true);
    setImportStatus({ type: null, message: "" });

    try {
      const isAllowedType = validateFileType(file.name, [".json", ".csv"]);
      if (!isAllowedType) {
        setImportStatus({
          type: "error",
          message: "Validação do arquivo falhou",
          details: ["Formato de arquivo inválido. Use .json ou .csv"],
        });
        return;
      }

      const content = await file.text();
      const importResult = importFinancialData(content);

      if (importResult.success && importResult.userPlan) {
        dispatch({
          type: "LOAD_SUCCESS" as any,
          payload: importResult.userPlan,
        });

        setImportStatus({
          type: importResult.warnings.length > 0 ? "warning" : "success",
          message: `Dados importados de ${file.name} (${formatFileSize(file.size)}) com sucesso!`,
          details:
            importResult.warnings.length > 0 ? importResult.warnings : undefined,
        });
      } else {
        setImportStatus({
          type: "error",
          message: "Falha ao importar dados do arquivo",
          details: importResult.errors,
        });
      }
    } catch (error) {
      setImportStatus({
        type: "error",
        message: `Erro na importação: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        processImportFile(file);
      }
    };
    input.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportFile(e.dataTransfer.files[0]);
    }
  };

  const activeCurrencyInfo = SUPPORTED_CURRENCIES[currency];

  return (
    <div className="space-y-6">
      {/* ── Executive Header ─────────────────────────────────────────────── */}
      <div className="surface-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xl select-none shrink-0">
            ⚙️
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>{isEn ? "System Settings" : "Configurações do Sistema"}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn
                ? "Centralized governance for expense categories, credit cards, currency formatting, and data sovereignty."
                : "Gerenciamento centralizado de categorias do sistema, cartões de crédito, moeda e importação/exportação de dados."}
            </p>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: CATEGORIAS DO SISTEMA                                    */}
      {/* =================================================================== */}
      <div className="surface-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection("categories")}
          aria-expanded={openSections.categories}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-lg shrink-0">
              🏷️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? "System Categories" : "Categorias do Sistema"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                  {orderedCategories.length}{" "}
                  {isEn ? "categories" : "categorias"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEn
                  ? "Reorder the category sequence, customize emojis and names, add new categories, or remove unused ones."
                  : "Movimente a sequência de exibição, defina ou altere o emoji e nome de cada categoria, adicione novas ou retire categorias."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
              {openSections.categories
                ? isEn
                  ? "Close"
                  : "Recolher"
                : isEn
                ? "Configure"
                : "Expandir"}
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                openSections.categories ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
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

        {openSections.categories && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-in fade-in duration-150">
            {/* Add New Category Bar */}
            <form
              onSubmit={handleAddCategory}
              className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {isEn ? "+ Add New Category" : "+ Adicionar Nova Categoria"}
                </h3>
                <button
                  type="button"
                  onClick={handleRestoreDefaultCategories}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline cursor-pointer"
                >
                  {isEn ? "Restore Base Categories" : "Restaurar Categorias Base"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Emoji Input & Quick Picker */}
                <div className="sm:col-span-3 relative">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Emoji
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCatEmoji}
                      onChange={(e) => setNewCatEmoji(e.target.value)}
                      maxLength={4}
                      className="w-14 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="🏷️"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowEmojiPickerFor(
                          showEmojiPickerFor === "new" ? null : "new"
                        )
                      }
                      className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {isEn ? "Pick Emoji" : "Escolher"}
                    </button>
                  </div>

                  {showEmojiPickerFor === "new" && (
                    <div className="absolute left-0 top-full mt-1.5 z-30 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl w-64 grid grid-cols-6 gap-1">
                      {SUGGESTED_CATEGORY_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setNewCatEmoji(em);
                            setShowEmojiPickerFor(null);
                          }}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-base text-center cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Name */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isEn ? "Category Name *" : "Nome da Categoria *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={isEn ? "e.g., Pets, Subscriptions..." : "Ex: Pets, Assinaturas, Impostos..."}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Color Picker */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isEn ? "Chart Color" : "Cor no Gráfico"}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {newCatColor}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {isEn ? "+ Add" : "+ Adicionar"}
                  </button>
                </div>
              </div>
            </form>

            {/* Ordered Categories List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span className="font-semibold">
                  {isEn
                    ? "Active Sequence (use ↑ ↓ to reorder)"
                    : "Sequência Ativa (use ↑ ↓ para movimentar a ordem)"}
                </span>
                <span>
                  {orderedCategories.length}{" "}
                  {isEn ? "items configured" : "categorias configuradas"}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {orderedCategories.map((cat, idx) => {
                  const isEditing = editingCategoryId === cat.id;
                  const expenseCount = (state.userPlan?.expenses || []).filter(
                    (e) => e.category === cat.id
                  ).length;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex flex-wrap items-center gap-2.5">
                          <div className="relative">
                            <input
                              type="text"
                              value={editCatEmoji}
                              onChange={(e) => setEditCatEmoji(e.target.value)}
                              maxLength={4}
                              className="w-12 px-2 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-center text-base"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowEmojiPickerFor(
                                  showEmojiPickerFor === cat.id ? null : cat.id
                                )
                              }
                              className="ml-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                            >
                              😊
                            </button>
                            {showEmojiPickerFor === cat.id && (
                              <div className="absolute left-0 top-full mt-1 z-30 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl w-60 grid grid-cols-6 gap-1">
                                {SUGGESTED_CATEGORY_EMOJIS.map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => {
                                      setEditCatEmoji(em);
                                      setShowEmojiPickerFor(null);
                                    }}
                                    className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950 text-base cursor-pointer"
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <input
                            type="text"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100"
                          />

                          <input
                            type="color"
                            value={editCatColor}
                            onChange={(e) => setEditCatColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 cursor-pointer"
                          />

                          <button
                            type="button"
                            onClick={() => handleSaveEditCategory(cat.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            {isEn ? "Save" : "Salvar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setShowEmojiPickerFor(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            {isEn ? "Cancel" : "Cancelar"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Sequence Move Up / Down Controls */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveCategory(idx, "up")}
                                title={isEn ? "Move up" : "Subir posição"}
                                className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-25 text-slate-600 dark:text-slate-300 cursor-pointer disabled:cursor-default"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                disabled={idx === orderedCategories.length - 1}
                                onClick={() => handleMoveCategory(idx, "down")}
                                title={isEn ? "Move down" : "Descer posição"}
                                className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-25 text-slate-600 dark:text-slate-300 cursor-pointer disabled:cursor-default"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 w-5 text-center">
                              #{idx + 1}
                            </span>

                            {/* Emoji Badge */}
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-2xs border shrink-0"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                borderColor: `${cat.color}40`,
                              }}
                            >
                              {cat.emoji}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {cat.name}
                                </span>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                  title={`Cor: ${cat.color}`}
                                />
                                {cat.isDefault && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    Base
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {expenseCount}{" "}
                                {expenseCount === 1
                                  ? "despesa vinculada"
                                  : "despesas vinculadas"}
                              </div>
                            </div>
                          </div>

                          {/* Edit / Delete Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(cat)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            >
                              {isEn ? "Edit Emoji / Name" : "Editar Emoji / Nome"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              {isEn ? "Remove" : "Retirar"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 2: CARTÕES DE CRÉDITO                                       */}
      {/* =================================================================== */}
      <div className="surface-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection("cards")}
          aria-expanded={openSections.cards}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-lg shrink-0">
              💳
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? "Credit Cards & Billing Cycles" : "Cartões de Crédito e Faturas"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                  {cards.filter((c) => c.isActive).length}{" "}
                  {isEn ? "active cards" : "cartões ativos"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEn
                  ? "Configure your credit cards, closing days, due dates, and simulate invoice rollover."
                  : "Cadastre seus cartões, defina os dias de fechamento e vencimento da fatura e simule a melhor data de compra."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
              {openSections.cards
                ? isEn
                  ? "Close"
                  : "Recolher"
                : isEn
                ? "Configure"
                : "Expandir"}
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                openSections.cards ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
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

        {openSections.cards && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-in fade-in duration-150">
            <div className="pt-5 flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {isEn
                  ? "Registered Credit Cards"
                  : "Cartões de Crédito Cadastrados"}
              </span>
              <button
                type="button"
                onClick={handleOpenAddCard}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>+ {isEn ? "New Card" : "Novo Cartão"}</span>
              </button>
            </div>

            {/* Add / Edit Card Form */}
            {isAddingCard && (
              <div className="p-5 rounded-xl border-2 border-indigo-500/20 bg-slate-50/70 dark:bg-slate-800/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingCard
                      ? `Editar Cartão: ${editingCard.name}`
                      : "Cadastrar Novo Cartão"}
                  </h3>
                  <button
                    type="button"
                    onClick={resetCardForm}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    ✕ Fechar
                  </button>
                </div>

                {cardError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-600 dark:text-rose-300">
                    {cardError}
                  </div>
                )}

                <form onSubmit={handleSaveCard} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nome do Cartão / Emissor *
                      </label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Ex: Nubank, Inter, XP..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dia de Fechamento *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={closingDay}
                        onChange={(e) =>
                          setClosingDay(parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dia de Vencimento *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={dueDay}
                        onChange={(e) =>
                          setDueDay(parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Cor de Identificação
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {CARD_COLOR_PALETTE.map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => setCardColor(swatch.hex)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            cardColor === swatch.hex
                              ? "border-slate-900 dark:border-white bg-white dark:bg-slate-800 shadow-xs scale-105"
                              : "border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span>{swatch.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetCardForm}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {editingCard ? "Salvar Alterações" : "Adicionar Cartão"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => {
                const stat = cardStats[card.id] || { count: 0, totalAmount: 0 };
                const accent = card.color || "#6366f1";
                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900 shadow-2xs"
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="p-4 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                            style={{ backgroundColor: accent }}
                          >
                            {card.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {card.name}
                            </h3>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {card.isActive ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCard(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Editar cartão"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Excluir cartão"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Fechamento
                          </span>
                          <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            Dia {card.closingDay}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Vencimento
                          </span>
                          <div className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            Dia {card.dueDay}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">
                          {stat.count} despesas vinculadas
                        </span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(stat.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invoice Simulator */}
            {cards.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  🧮 Simulador Rápido de Virada de Fatura
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Cartão
                    </label>
                    <select
                      value={activeSimCard?.id || ""}
                      onChange={(e) => setSimCardId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    >
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Fecha dia {c.closingDay} / Vence dia {c.dueDay})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Data da Compra
                    </label>
                    <DatePicker value={simDate} onChange={(val) => setSimDate(val)} />
                  </div>
                  {simResult && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        Vencimento: {simResult.dueDateFormatted} ({simResult.daysToPay} dias)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {simResult.afterClosing
                          ? "✨ Após fechamento (cai na próxima fatura)"
                          : "📌 Antes do fechamento (fatura atual)"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 3: SELEÇÃO DE MOEDA                                         */}
      {/* =================================================================== */}
      <div className="surface-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection("currency")}
          aria-expanded={openSections.currency}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-lg shrink-0">
              💱
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? "System Currency" : "Seleção de Moeda"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                  {activeCurrencyInfo.symbol} {activeCurrencyInfo.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEn
                  ? "Select the default currency symbol and number formatting used across all dashboards and ledgers."
                  : "Defina a moeda padrão e formatação monetária exibida nos saldos, rendas, despesas e gráficos do sistema."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
              {openSections.currency
                ? isEn
                  ? "Close"
                  : "Recolher"
                : isEn
                ? "Configure"
                : "Expandir"}
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                openSections.currency ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
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

        {openSections.currency && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => {
                const isSelected = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code as CurrencyCode)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 dark:border-indigo-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {info.symbol}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {info.code} — {info.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Locale: {info.locale}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        {isEn ? "Active" : "Ativa"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 4: IMPORTAR / EXPORTAR DADOS                                */}
      {/* =================================================================== */}
      <div className="surface-card overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection("importExport")}
          aria-expanded={openSections.importExport}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center text-lg shrink-0">
              🔄
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? "Import / Export Data" : "Importar / Exportar Dados"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60">
                  JSON & CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEn
                  ? "Export a full backup of your financial plan in JSON or CSV format, or restore from an external file."
                  : "Exporte backups completos do seu planejamento financeiro em JSON ou CSV, ou importe dados salvos anteriormente."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline">
              {openSections.importExport
                ? isEn
                  ? "Close"
                  : "Recolher"
                : isEn
                ? "Configure"
                : "Expandir"}
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                openSections.importExport ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
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

        {openSections.importExport && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-in fade-in duration-150">
            {importStatus.type && (
              <div
                className={`mt-5 p-4 rounded-xl border text-xs ${
                  importStatus.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : importStatus.type === "warning"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                }`}
              >
                <div className="font-bold">{importStatus.message}</div>
                {importStatus.details && importStatus.details.length > 0 && (
                  <ul className="mt-1 list-disc list-inside space-y-0.5">
                    {importStatus.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Export Column */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  📤 Exportar Dados do Sistema
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Baixe seus dados atuais ({state.userPlan.income.length} rendas,{" "}
                  {state.userPlan.expenses.length} despesas,{" "}
                  {state.userPlan.goals.length} metas e{" "}
                  {orderedCategories.length} categorias).
                </p>

                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeInactive}
                      onChange={(e) =>
                        setExportOptions({
                          ...exportOptions,
                          includeInactive: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Incluir itens inativos na exportação
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dateRangeEnabled}
                      onChange={(e) => setDateRangeEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Filtrar por intervalo de datas
                    </span>
                  </label>

                  {dateRangeEnabled && (
                    <div className="grid grid-cols-2 gap-3 pl-6 pt-1">
                      <div>
                        <span className="block text-[11px] text-slate-500 mb-1">
                          Data Inicial
                        </span>
                        <DatePicker value={startDate} onChange={setStartDate} />
                      </div>
                      <div>
                        <span className="block text-[11px] text-slate-500 mb-1">
                          Data Final
                        </span>
                        <DatePicker value={endDate} onChange={setEndDate} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    disabled={isExporting}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Exportar Backup JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Exportar Planilha CSV
                  </button>
                </div>
              </div>

              {/* Import Column */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  📥 Importar / Restaurar Backup
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selecione ou arraste um arquivo <code>.json</code> ou{" "}
                  <code>.csv</code> exportado anteriormente pelo Finance Planner.
                </p>

                <div
                  ref={dropZoneRef}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleFileSelect}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  <div className="text-2xl mb-2">📂</div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isImporting
                      ? "Processando arquivo..."
                      : "Clique para selecionar ou arraste o arquivo aqui"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Suporta formatos JSON e CSV (máx. 10MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
