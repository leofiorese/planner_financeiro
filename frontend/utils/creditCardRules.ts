/**
 * Credit Card Billing Cycle Rules
 *
 * Dynamic credit card billing cycle logic supporting user-configured cards.
 *
 * Business rules:
 *  - Each card has a `closingDay` (corte da fatura) and a `dueDay` (vencimento).
 *  - Debit cards & PIX/Cash → NO billing cycle shift (charge happens on the purchase date).
 *
 * Logic:
 *  If purchase day > closingDay  → charge appears on NEXT month's bill
 *  If purchase day <= closingDay → charge appears on CURRENT month's bill
 *  The bill is due on dueDay of the effective billing month.
 */

import { PaymentMethod, CreditCardAccount, CreditCardAccountInfo, Expense } from "@/types";

export interface CardConfig {
  closingDay: number; // day of month after which purchases roll to next month
  dueDay: number;     // day of month the bill is due
}

/** Fallback configurations if no user-configured cards are passed or card is unknown */
export const DEFAULT_CARD_CONFIGS: Record<string, CardConfig> = {
  [CreditCardAccount.INTER]: { closingDay: 11, dueDay: 18 },
  [CreditCardAccount.XP]:    { closingDay: 12, dueDay: 20 },
};

/**
 * Retrieves the billing configuration (closingDay, dueDay) for a specific card,
 * prioritizing user-configured accounts from state/database and falling back to defaults.
 */
export function getCardConfig(
  account?: string,
  userCards?: CreditCardAccountInfo[]
): CardConfig {
  if (!account) {
    return { closingDay: 11, dueDay: 18 };
  }

  // 1. Check userCards list from state/DB
  if (userCards && userCards.length > 0) {
    const matchedCard = userCards.find(
      (c) =>
        c.id === account ||
        c.name.toLowerCase() === account.toLowerCase()
    );
    if (matchedCard) {
      return {
        closingDay: matchedCard.closingDay,
        dueDay: matchedCard.dueDay,
      };
    }
  }

  // 2. Check defaults dictionary
  if (DEFAULT_CARD_CONFIGS[account]) {
    return DEFAULT_CARD_CONFIGS[account];
  }

  return { closingDay: 11, dueDay: 18 };
}

/**
 * Calculates the exact statement due date (YYYY-MM-DD) for a credit card purchase.
 * If purchase date is after closingDay, it moves to dueDay of the next month.
 */
export function calculateCreditCardDueDate(
  account?: string,
  referenceDate: Date = new Date(),
  userCards?: CreditCardAccountInfo[]
): string {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  const { closingDay, dueDay } = getCardConfig(account, userCards);

  const targetDate = new Date(currentYear, currentMonth, dueDay);

  if (currentDay > closingDay) {
    targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return targetDate.toISOString().split("T")[0];
}

/**
 * Calculates the statement billing month (YYYY-MM) for a credit card purchase.
 */
export function calculateCreditCardBillingMonth(
  account?: string,
  referenceDate: Date = new Date(),
  userCards?: CreditCardAccountInfo[]
): string {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  const { closingDay } = getCardConfig(account, userCards);

  const targetDate = new Date(currentYear, currentMonth, 1);

  if (currentDay > closingDay) {
    targetDate.setMonth(targetDate.getMonth() + 1);
  }

  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Given an expense, returns the Date of the FIRST DAY of the month in which
 * the charge will actually be BILLED (i.e. which monthly statement it appears on).
 *
 * For debit cards and non-card payments, this is simply the month of the dueDate.
 * For credit cards, purchases after the closing day roll to the next month.
 *
 * @param expense    The expense to evaluate
 * @param userCards  Optional array of user-configured credit cards
 * @returns          A Date set to the 1st of the effective billing month
 */
export function getEffectiveBillingMonth(
  expense: Expense,
  userCards?: CreditCardAccountInfo[]
): Date {
  const rawDate = new Date(expense.dueDate);

  // Debit cards and other payment methods → no shift
  if (
    expense.paymentMethod !== PaymentMethod.CREDIT_CARD ||
    !expense.creditCardAccount
  ) {
    return new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
  }

  const config = getCardConfig(expense.creditCardAccount, userCards);
  const purchaseDay = rawDate.getDate();

  if (purchaseDay > config.closingDay) {
    // Purchase after closing → rolls to next month's bill
    return new Date(rawDate.getFullYear(), rawDate.getMonth() + 1, 1);
  }

  // Purchase on or before closing → current month's bill
  return new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
}

/**
 * Returns a human-readable description of the billing shift for an expense.
 * Useful for UI display.
 */
export function getBillingShiftLabel(
  expense: Expense,
  userCards?: CreditCardAccountInfo[]
): string | null {
  if (
    expense.paymentMethod !== PaymentMethod.CREDIT_CARD ||
    !expense.creditCardAccount
  ) {
    return null;
  }

  const config = getCardConfig(expense.creditCardAccount, userCards);
  const rawDate = new Date(expense.dueDate);
  const purchaseDay = rawDate.getDate();

  if (purchaseDay > config.closingDay) {
    const billingMonth = getEffectiveBillingMonth(expense, userCards);
    const monthName = billingMonth.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return `Fatura de ${monthName} (compra após dia ${config.closingDay})`;
  }

  return null;
}

/**
 * Returns true if this expense's charge will be billed in the given target month,
 * taking credit card billing cycles into account.
 */
export function isExpenseBilledInMonth(
  expense: Expense,
  targetMonth: Date,
  userCards?: CreditCardAccountInfo[]
): boolean {
  const billingMonth = getEffectiveBillingMonth(expense, userCards);
  return (
    billingMonth.getFullYear() === targetMonth.getFullYear() &&
    billingMonth.getMonth() === targetMonth.getMonth()
  );
}
