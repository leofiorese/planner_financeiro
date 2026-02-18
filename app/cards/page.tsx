"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFinancialState, useFinancialActions } from "@/context";
import {
    CreateCreditCardAccountInput,
    CreditCardAccountInfo,
} from "@/types";
import { useLanguage } from "@/context/LanguageContext";

const CARD_COLORS = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#06b6d4", // cyan
];

export default function CardsPage() {
    const state = useFinancialState();
    const {
        addCreditCardAccount,
        updateCreditCardAccount,
        deleteCreditCardAccount,
    } = useFinancialActions();
    const { t } = useLanguage();

    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<CreateCreditCardAccountInput>({
        name: "",
        dueDay: 10,
        closingDay: 5,
        color: CARD_COLORS[0],
        isActive: true,
    });

    // Auto-scroll to form when it opens
    useEffect(() => {
        if (isAddFormOpen && formRef.current) {
            formRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [isAddFormOpen]);

    const creditCardAccounts = state.userPlan.creditCardAccounts || [];
    const activeCount = creditCardAccounts.filter((c) => c.isActive).length;

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
                dueDay: 10,
                closingDay: 5,
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
            dueDay: 10,
            closingDay: 5,
            color: CARD_COLORS[0],
            isActive: true,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {t("cards.pageTitle")}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t("cards.pageSubtitle")}
                    </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t("cards.totalCards")}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{creditCardAccounts.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t("cards.activeCards")}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Button */}
                {!isAddFormOpen && (
                    <button
                        onClick={() => setIsAddFormOpen(true)}
                        className="mb-8 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t("cards.addButton")}
                    </button>
                )}

                {/* Add/Edit Form */}
                {isAddFormOpen && (
                    <div ref={formRef} className="mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                                <h2 className="text-lg font-semibold text-white">
                                    {editingCard ? t("cards.form.editTitle") : t("cards.form.addTitle")}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Card Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>

                                {/* Due Day & Closing Day */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t("cards.form.dueDay")} *
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
                                                    dueDay: parseInt(e.target.value) || 1,
                                                }))
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {t("cards.form.dueDayHelp")}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t("cards.form.closingDay")} *
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
                                                    closingDay: parseInt(e.target.value) || 1,
                                                }))
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {t("cards.form.closingDayHelp")}
                                        </p>
                                    </div>
                                </div>

                                {/* Card Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t("cards.form.color")}
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {CARD_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({ ...prev, color }))
                                                }
                                                className={`w-10 h-10 rounded-full transition-all duration-200 ${formData.color === color
                                                    ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110"
                                                    : "hover:scale-105"
                                                    }`}
                                                style={{
                                                    backgroundColor: color,
                                                    ringColor: color,
                                                    ...(formData.color === color
                                                        ? { boxShadow: `0 0 0 3px ${color}40` }
                                                        : {}),
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                isActive: !prev.isActive,
                                            }))
                                        }
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive
                                            ? "bg-purple-600"
                                            : "bg-gray-300 dark:bg-gray-600"
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? "translate-x-6" : "translate-x-1"
                                                }`}
                                        />
                                    </button>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {t("cards.form.active")}
                                    </span>
                                </div>

                                {/* Form Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        {t("cards.form.save")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium rounded-lg transition-colors"
                                    >
                                        {t("cards.form.cancel")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Cards List */}
                {creditCardAccounts.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <svg
                            className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                        </svg>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                            {t("cards.noCards")}
                        </h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {creditCardAccounts.map((card) => (
                            <div
                                key={card.id}
                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all duration-200 hover:shadow-md ${card.isActive
                                    ? "border-gray-200 dark:border-gray-700"
                                    : "border-gray-200 dark:border-gray-700 opacity-60"
                                    }`}
                            >
                                {/* Card Header with Color Banner */}
                                <div
                                    className="h-3 w-full"
                                    style={{ backgroundColor: card.color || CARD_COLORS[0] }}
                                />
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{
                                                    backgroundColor: `${card.color || CARD_COLORS[0]}20`,
                                                }}
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    style={{
                                                        color: card.color || CARD_COLORS[0],
                                                    }}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                    />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {card.name}
                                                </h3>
                                                {!card.isActive && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t("common.inactive")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(card)}
                                                className="p-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title={t("cards.form.editTitle")}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(card.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title={t("expenses.deleteExpense")}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Details */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {t("cards.dueDay")}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {card.dueDay}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {t("cards.closingDay")}
                                            </p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {card.closingDay}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
