/**
 * Credit Card Billing Cycle Rules
 *
 * Business rules:
 *  - Inter  → closing day 12, due day 18
 *  - XP     → closing day 12, due day 18
 *  - Debit cards → NO billing cycle shift (charge happens on the purchase date)
 *
 * Logic:
 *  If the purchase day  > closingDay  → the charge appears on NEXT month's bill
 *  If the purchase day <= closingDay  → the charge appears on CURRENT month's bill
 *  The bill is due on dueDay of the billing month (informational only).
 */

import { PaymentMethod, CreditCardAccount } from "@/types";
import { Expense } from "@/types";

// ─── Card configuration ───────────────────────────────────────────────────────

interface CardConfig {
  closingDay: number; // day of month after which purchases roll to next month
  dueDay: number;     // day of month the bill is due (informational)
}

/** Map of credit card accounts to their billing cycle configuration. */
export const CREDIT_CARD_CONFIGS: Record<CreditCardAccount, CardConfig> = {
  [CreditCardAccount.INTER]: { closingDay: 12, dueDay: 18 },
  [CreditCardAccount.XP]:    { closingDay: 12, dueDay: 20 },
};

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Given an expense, returns the Date of the FIRST DAY of the month in which
 * the charge will actually be BILLED (i.e. which monthly statement it appears on).
 *
 * For debit cards and non-card payments, this is simply the month of the dueDate.
 * For credit cards, purchases after the closing day roll to the next month.
 *
 * @param expense  The expense to evaluate
 * @returns        A Date set to the 1st of the effective billing month
 */
export function getEffectiveBillingMonth(expense: Expense): Date {
  const rawDate = new Date(expense.dueDate);

  // Debit cards and other payment methods → no shift
  if (
    expense.paymentMethod !== PaymentMethod.CREDIT_CARD ||
    !expense.creditCardAccount
  ) {
    return new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
  }

  const config = CREDIT_CARD_CONFIGS[expense.creditCardAccount];
  if (!config) {
    // Unknown card → treat as no shift
    return new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
  }

  const purchaseDay = rawDate.getDate();

  if (purchaseDay > config.closingDay) {
    // Purchase after closing → rolls to next month's bill
    const shifted = new Date(rawDate.getFullYear(), rawDate.getMonth() + 1, 1);
    return shifted;
  }

  // Purchase on or before closing → current month's bill
  return new Date(rawDate.getFullYear(), rawDate.getMonth(), 1);
}

/**
 * Returns a human-readable description of the billing shift for an expense.
 * Useful for UI display.
 */
export function getBillingShiftLabel(expense: Expense): string | null {
  if (
    expense.paymentMethod !== PaymentMethod.CREDIT_CARD ||
    !expense.creditCardAccount
  ) {
    return null;
  }

  const config = CREDIT_CARD_CONFIGS[expense.creditCardAccount];
  if (!config) return null;

  const rawDate = new Date(expense.dueDate);
  const purchaseDay = rawDate.getDate();

  if (purchaseDay > config.closingDay) {
    const billingMonth = getEffectiveBillingMonth(expense);
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
 *
 * For recurring expenses the comparison is always against the billing month derived
 * from the base dueDate (recurring charges maintain the same day-of-month pattern).
 */
export function isExpenseBilledInMonth(expense: Expense, targetMonth: Date): boolean {
  const billingMonth = getEffectiveBillingMonth(expense);
  return (
    billingMonth.getFullYear() === targetMonth.getFullYear() &&
    billingMonth.getMonth()     === targetMonth.getMonth()
  );
}
