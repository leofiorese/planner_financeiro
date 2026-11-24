import type { InvestmentClass, InvestmentEntry, InvestmentSnapshot } from "../../types";

/** Árvore de teste: r (raiz) → a, b; c (raiz-folha); x (raiz) → y, mais d (arquivada, sob x). */
export const CLASSES: InvestmentClass[] = [
  { id: "r", parentId: null, name: "Renda Fixa", sortOrder: 0, archived: false },
  { id: "a", parentId: "r", name: "Nacional", sortOrder: 0, archived: false },
  { id: "b", parentId: "r", name: "Internacional", sortOrder: 1, archived: false },
  { id: "c", parentId: null, name: "FIIs", sortOrder: 1, archived: false },
  { id: "x", parentId: null, name: "Alternativos", sortOrder: 2, archived: false },
  { id: "y", parentId: "x", name: "Ouro", sortOrder: 0, archived: false },
  { id: "d", parentId: "x", name: "Antiga", sortOrder: 1, archived: true },
];

export const entry = (classId: string, balance: number, contributions = 0, withdrawals = 0): InvestmentEntry => ({
  classId,
  balance,
  contributions,
  withdrawals,
});

export const snap = (month: string, entries: InvestmentEntry[]): InvestmentSnapshot => ({
  id: `s-${month}`,
  month,
  date: `${month}-05`,
  entries,
});

export function approx(actual: number | null, expected: number, eps = 1e-9): void {
  if (actual === null) throw new Error(`esperava ${expected}, veio null`);
  if (Math.abs(actual - expected) > eps) throw new Error(`esperava ${expected}, veio ${actual}`);
}
