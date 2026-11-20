import { Frequency } from "@/types";
import { formatDateDDMMYYYY, formatLocalizedMonth } from "@/utils/dateFormatting";

/**
 * Formata uma data (YYYY-MM-DD, ISO ou Date) como DD/MM/AAAA.
 * Retorna "—" para valores vazios ou inválidos.
 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const input = value instanceof Date ? value : String(value);
  // Strings "YYYY-MM-DD..." usam só a parte da data (evita deslocar o dia por fuso).
  const head = typeof input === "string" ? input.slice(0, 10) : "";
  const formatted = formatDateDDMMYYYY(/^\d{4}-\d{2}-\d{2}$/.test(head) ? head : input);
  return formatted && !formatted.includes("NaN") ? formatted : "—";
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  [Frequency.DAILY]: "Diário",
  [Frequency.WEEKLY]: "Semanal",
  [Frequency.BIWEEKLY]: "Quinzenal",
  [Frequency.MONTHLY]: "Mensal",
  [Frequency.QUARTERLY]: "Trimestral",
  [Frequency.YEARLY]: "Anual",
  [Frequency.ONE_TIME]: "Único",
};

export function getFrequencyLabel(frequency: Frequency | string): string {
  return FREQUENCY_LABELS[frequency as Frequency] ?? String(frequency);
}

/**
 * Formata um período (datas YYYY-MM-DD) como "01/03/2026 – 31/03/2026".
 * Com apenas o início, retorna "a partir de ..."; com apenas o fim, "até ...".
 */
export function formatPeriod(start?: string | null, end?: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `a partir de ${formatDate(start)}`;
  if (end) return `até ${formatDate(end)}`;
  return "—";
}

/** Formata um mês (YYYY-MM) como "março de 2026". */
export function formatMonth(month?: string | null): string {
  if (!month) return "—";
  return formatLocalizedMonth(month);
}
