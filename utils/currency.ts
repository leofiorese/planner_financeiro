/**
 * Currency Utility Functions
 *
 * Legacy currency utilities for backward compatibility.
 * For new code, use useCurrency() hook from CurrencyContext.
 */

/**
 * @deprecated Use useCurrency().formatCurrency() instead
 * Legacy format function that defaults to USD for backward compatibility
 */
/**
 * @deprecated Use useCurrency().formatCurrency() instead
 * Legacy format function that defaults to BRL for backward compatibility
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * @deprecated Use useCurrency().formatCurrency(amount, true) instead
 * Legacy compact format function that defaults to BRL
 */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatCurrency(amount);
}

/**
 * @deprecated Use useCurrency().parseCurrency() instead
 * Legacy parse function for backward compatibility
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols (including R$), spaces, and commas/periods depending on locale
  // For BRL, we expect comma as decimal separator, so we replace dots with nothing and commas with dots for parsing
  // But this is a simple legacy parser, so we'll just strip non-digits and handle common separators

  const cleanString = currencyString
    .replace(/[฿$€£¥₹₩Fr,\sR]/g, "") // Remove common currency symbols and 'R' (from R$)
    .replace(/[A-Z]/g, "") // Remove currency codes like A$, C$, S$
    .replace(/[^\d.-]/g, ""); // Keep only digits, dots, and minus sign

  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * @deprecated Use useCurrency().formatNumber() instead
 * Legacy number format function that defaults to BRL locale
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate if a string is a valid currency amount
 */
export function isValidCurrencyAmount(value: string): boolean {
  const cleaned = value.replace(/[฿$€£¥₹₩Fr,\sR]/g, "").replace(/[A-Z]/g, "");
  const number = parseFloat(cleaned);
  return !isNaN(number) && number >= 0;
}

/**
 * @deprecated Legacy constants - use SUPPORTED_CURRENCIES from CurrencyContext instead
 */
export const CURRENCY_SYMBOL = "R$";
export const CURRENCY_CODE = "BRL";
export const CURRENCY_NAME = "Real Brasileiro";

/**
 * @deprecated Legacy options - use useCurrency() hook instead
 */
export const DEFAULT_CURRENCY_OPTIONS: Intl.NumberFormatOptions = {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
};
