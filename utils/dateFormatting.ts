import { LanguageCode } from "@/context/LanguageContext";

/**
 * Get the appropriate locale string for date formatting based on language
 */
export function getDateLocale(language: LanguageCode): string {
  switch (language) {
    case "pt":
      return "pt-BR";
    case "en":
    default:
      return "en-US";
  }
}

/**
 * Format a date string with proper localization
 */
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
 * Format a date string with proper localization
 */
export function formatLocalizedDate(
  dateString: string,
  language: LanguageCode,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDateSafe(dateString);
  const locale = getDateLocale(language);

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    ...options,
  });
}

/**
 * Format a month string (YYYY-MM format) with proper localization
 */
export function formatLocalizedMonth(
  monthString: string,
  language: LanguageCode,
  options: Intl.DateTimeFormatOptions = {}
): string {
  // For YYYY-MM, we want the 1st of that month. 
  // Appending -01 makes it YYYY-MM-01, which our safe parser handles as local.
  const date = parseDateSafe(monthString + "-01");
  const locale = getDateLocale(language);

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    ...options,
  });
}

/**
 * Get month name using translation keys instead of locale formatting
 * This ensures consistent translation system usage
 */
export function getMonthName(
  monthIndex: number,
  t: (key: string) => string
): string {
  const monthKeys = [
    "month.january",
    "month.february",
    "month.march",
    "month.april",
    "month.may",
    "month.june",
    "month.july",
    "month.august",
    "month.september",
    "month.october",
    "month.november",
    "month.december",
  ];

  return t(monthKeys[monthIndex] || monthKeys[0]);
}

/**
 * Format a date using translation keys for month names
 */
export function formatDateWithTranslations(
  date: Date | string,
  t: (key: string) => string,
  options: {
    includeYear?: boolean;
    shortMonth?: boolean;
    includeDate?: boolean;
  } = {}
): string {
  const dateObj = parseDateSafe(date);
  const monthIndex = dateObj.getMonth();
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  const monthName = getMonthName(monthIndex, t);
  const displayMonth = options.shortMonth ? monthName.slice(0, 3) : monthName;

  const includeDate =
    options.includeDate !== undefined ? options.includeDate : true;

  if (!includeDate && options.includeYear) {
    return `${displayMonth} ${year}`;
  } else if (!includeDate) {
    return `${displayMonth}`;
  } else if (options.includeYear) {
    return `${day} ${displayMonth} ${year}`;
  }

  return `${day} ${displayMonth}`;
}
