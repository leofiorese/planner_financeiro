"use client";

import { useCallback, useMemo, useState } from "react";
import { useFinancialActions } from "@/context";
import {
  CreditCardAccount,
  ExpenseCategory,
  Frequency,
  PaymentMethod,
  Priority,
  type CreateExpenseInput,
  type CreditCardAccountInfo,
  type Expense,
  type UpdateExpenseInput,
} from "@/types";
import {
  calculateCreditCardBillingMonth,
  calculateCreditCardDueDate,
  getBillingShiftLabel,
  getCardConfig,
} from "@/utils/creditCardRules";
import { withToast } from "@/lib/toast";

// TODO(Sprint 1 merge): trocar por utils/dates (data local) quando o helper existir.
const todayIso = () => new Date().toISOString().split("T")[0];
const currentMonthIso = () => new Date().toISOString().slice(0, 7);

/** Estado inicial único do formulário (antes havia 4 cópias). */
export function createEmptyExpenseForm(): CreateExpenseInput {
  return {
    name: "",
    amount: 0,
    category: ExpenseCategory.MISCELLANEOUS,
    dueDate: todayIso(),
    paymentMethod: PaymentMethod.PIX,
    creditCardAccount: undefined,
    recurring: false,
    frequency: Frequency.MONTHLY,
    recurringWeeksInterval: 1,
    description: "",
    priority: Priority.MEDIUM,
    isActive: true,
    isInstallment: false,
    installmentMonths: 1,
    installmentStartMonth: "",
  };
}

function expenseToForm(expense: Expense): CreateExpenseInput {
  return {
    name: expense.name,
    amount: expense.amount,
    category: expense.category,
    dueDate: expense.dueDate,
    paymentMethod: expense.paymentMethod || PaymentMethod.PIX,
    creditCardAccount: expense.creditCardAccount,
    recurring: expense.recurring,
    frequency: expense.frequency || Frequency.MONTHLY,
    recurringWeeksInterval: expense.recurringWeeksInterval || 1,
    description: expense.description || "",
    priority: expense.priority,
    isActive: expense.isActive,
    isInstallment: expense.isInstallment || false,
    installmentMonths: expense.installmentMonths || 1,
    installmentStartMonth: expense.installmentStartMonth || "",
  };
}

/**
 * Estado, regras de cartão/fatura e submit do formulário de despesa (modal).
 * "Nova despesa" sempre abre vazio; "Editar" abre preenchido.
 */
export function useExpenseForm(creditCards: CreditCardAccountInfo[]) {
  const { addExpense, updateExpense } = useFinancialActions();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateExpenseInput>(createEmptyExpenseForm);
  const [purchaseDate, setPurchaseDate] = useState<string>(todayIso);
  const [submitting, setSubmitting] = useState(false);

  const activeCards = useMemo(() => creditCards.filter((c) => c.isActive), [creditCards]);

  const selectedCardInfo = useMemo(() => {
    if (!formData.creditCardAccount) return null;
    return getCardConfig(formData.creditCardAccount, creditCards);
  }, [creditCards, formData.creditCardAccount]);

  const billingShiftText = useMemo(() => {
    if (formData.paymentMethod !== PaymentMethod.CREDIT_CARD) return null;
    const dummyExp: Expense = { ...formData, id: "temp", createdAt: "", updatedAt: "" } as Expense;
    return getBillingShiftLabel(dummyExp, creditCards);
  }, [formData, creditCards]);

  /** Mês de início padrão de uma despesa parcelada (fatura do cartão ou mês atual). */
  const getDefaultInstallmentStartMonth = useCallback(
    (account?: string) =>
      formData.paymentMethod === PaymentMethod.CREDIT_CARD
        ? calculateCreditCardBillingMonth(
            account || formData.creditCardAccount || activeCards[0]?.id || CreditCardAccount.INTER,
            new Date(purchaseDate),
            creditCards,
          )
        : currentMonthIso(),
    [formData.paymentMethod, formData.creditCardAccount, activeCards, purchaseDate, creditCards],
  );

  const setField = useCallback(
    (field: keyof CreateExpenseInput, value: CreateExpenseInput[keyof CreateExpenseInput]) => {
      setFormData((prev) => {
        const updated = { ...prev, [field]: value } as CreateExpenseInput;

        if (field === "paymentMethod") {
          if (value === PaymentMethod.CREDIT_CARD) {
            const defaultAccount = activeCards[0]?.id || CreditCardAccount.INTER;
            updated.creditCardAccount = defaultAccount;
            updated.dueDate = calculateCreditCardDueDate(defaultAccount, new Date(purchaseDate), creditCards);
            if (updated.isInstallment) {
              updated.installmentStartMonth = calculateCreditCardBillingMonth(
                defaultAccount,
                new Date(purchaseDate),
                creditCards,
              );
            }
          } else {
            updated.creditCardAccount = undefined;
            updated.dueDate = todayIso();
            if (updated.isInstallment) updated.installmentStartMonth = currentMonthIso();
          }
        }

        if (field === "creditCardAccount" && value) {
          updated.dueDate = calculateCreditCardDueDate(value as string, new Date(purchaseDate), creditCards);
          if (updated.isInstallment) {
            updated.installmentStartMonth = calculateCreditCardBillingMonth(
              value as string,
              new Date(purchaseDate),
              creditCards,
            );
          }
        }

        return updated;
      });
    },
    [activeCards, purchaseDate, creditCards],
  );

  /** Troca o tipo de despesa: única, recorrente ou parcelada. */
  const setScheduleKind = useCallback(
    (kind: "one_time" | "recurring" | "installment") => {
      setFormData((prev) => {
        const next = {
          ...prev,
          recurring: kind === "recurring",
          isInstallment: kind === "installment",
        };
        if (kind === "installment" && !prev.installmentStartMonth) {
          next.installmentStartMonth = getDefaultInstallmentStartMonth();
        }
        return next;
      });
    },
    [getDefaultInstallmentStartMonth],
  );

  const setPurchaseDateAndRecalculate = useCallback(
    (newDate: string) => {
      setPurchaseDate(newDate);
      if (formData.paymentMethod === PaymentMethod.CREDIT_CARD && formData.creditCardAccount) {
        const dueDate = calculateCreditCardDueDate(formData.creditCardAccount, new Date(newDate), creditCards);
        const billingMonth = calculateCreditCardBillingMonth(
          formData.creditCardAccount,
          new Date(newDate),
          creditCards,
        );
        setFormData((prev) => ({
          ...prev,
          dueDate,
          installmentStartMonth: prev.isInstallment ? billingMonth : prev.installmentStartMonth,
        }));
      }
    },
    [formData.paymentMethod, formData.creditCardAccount, creditCards],
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormData(createEmptyExpenseForm());
    setPurchaseDate(todayIso());
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((expense: Expense) => {
    setEditingId(expense.id);
    setFormData(expenseToForm(expense));
    setPurchaseDate(todayIso());
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      if (editingId) {
        const updateData: UpdateExpenseInput = { id: editingId, ...formData };
        await withToast(updateExpense(updateData), {
          loading: "Salvando despesa...",
          success: "Despesa atualizada",
          error: "Não foi possível salvar a despesa",
        });
      } else {
        await withToast(addExpense(formData), {
          loading: "Salvando despesa...",
          success: "Despesa adicionada",
          error: "Não foi possível salvar a despesa",
        });
      }
      close();
    } catch (error) {
      // O toast de erro já foi exibido; o modal continua aberto para o usuário tentar de novo.
      console.error("Failed to save expense:", error);
    } finally {
      setSubmitting(false);
    }
  }, [editingId, formData, updateExpense, addExpense, close]);

  return {
    isOpen,
    editingId,
    formData,
    purchaseDate,
    submitting,
    activeCards,
    selectedCardInfo,
    billingShiftText,
    getDefaultInstallmentStartMonth,
    setField,
    setScheduleKind,
    setPurchaseDate: setPurchaseDateAndRecalculate,
    openCreate,
    openEdit,
    close,
    submit,
  };
}

export type ExpenseFormState = ReturnType<typeof useExpenseForm>;
