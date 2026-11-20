/** Locale fixo da aplicação (só pt-BR). */
export const DATE_LOCALE = "pt-BR";

/**
 * Helper to parse a date string safely, handling YYYY-MM-DD as local date
 * to avoid timezone shifts when converting from UTC
 */
function parseDateSafe(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;

  // If it's a simple YYYY-MM-DD string, parse as local date (00:00:00 local)
  // to prevent it from being interpreted as UTC and shifting back a day
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(dateInput);
}

/**
 * Format a date string strictly in DD/MM/YYYY format
 */
export function formatDateDDMMYYYY(dateInput: string | Date): string {
  if (!dateInput) return "";
  const date = parseDateSafe(dateInput);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data em pt-BR com ano de 4 dígitos (DD/MM/AAAA).
 * Com `options`, usa `toLocaleDateString("pt-BR")`.
 */
export function formatLocalizedDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateString) return "";
  const date = parseDateSafe(dateString);

  if (Object.keys(options).length === 0) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return date.toLocaleDateString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

/**
 * Formata um mês (YYYY-MM) em pt-BR.
 */
export function formatLocalizedMonth(
  monthString: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  // For YYYY-MM, we want the 1st of that month.
  // Appending -01 makes it YYYY-MM-01, which our safe parser handles as local.
  const date = parseDateSafe(monthString + "-01");

  return date.toLocaleDateString(DATE_LOCALE, {
    year: "numeric",
    month: "long",
    ...options,
  });
}
