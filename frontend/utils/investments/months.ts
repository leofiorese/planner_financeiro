/** Helpers de mês "YYYY-MM" (puros, sem fuso). */

/** Número de meses de `from` até `to` (negativo se `to` for anterior). */
export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Soma `n` meses (pode ser negativo) a um "YYYY-MM". */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const mon = ((total % 12) + 12) % 12;
  return `${String(year).padStart(4, "0")}-${String(mon + 1).padStart(2, "0")}`;
}
