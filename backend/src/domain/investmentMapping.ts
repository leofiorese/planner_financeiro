/**
 * Pure mapping + validation for the Investimentos module (Sprint 3).
 * No DB, no clock: route handlers in routes/investments.ts do the I/O.
 */
import type {
  InvestmentClass,
  InvestmentEntry,
  InvestmentSettings,
  InvestmentSnapshot,
} from '../types';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONEY = 1e12;

export const DEFAULT_REMINDER_DAY = 1;

// ---------------------------------------------------------------- DB rows

export interface InvestmentClassRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number | string;
  archived: number | boolean;
}

export interface InvestmentSnapshotRow {
  id: string;
  month: string;
  snapshot_date: string;
}

export interface InvestmentEntryRow {
  snapshot_id: string;
  class_id: string;
  balance: number | string;
  contributions: number | string;
  withdrawals: number | string;
}

export interface InvestmentSettingsRow {
  reminder_day: number | string;
  target_return_annual: number | string | null;
  wealth_target_amount: number | string | null;
  wealth_target_date: string | null;
}

/** mysql2 returns DECIMAL as string. */
function num(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapClassRow(row: InvestmentClassRow): InvestmentClass {
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    name: row.name,
    sortOrder: num(row.sort_order),
    archived: row.archived === true || row.archived === 1,
  };
}

export function mapSettingsRow(row: InvestmentSettingsRow | undefined): InvestmentSettings {
  if (!row) {
    return {
      reminderDay: DEFAULT_REMINDER_DAY,
      targetReturnAnnual: null,
      wealthTargetAmount: null,
      wealthTargetDate: null,
    };
  }
  return {
    reminderDay: num(row.reminder_day) || DEFAULT_REMINDER_DAY,
    targetReturnAnnual: numOrNull(row.target_return_annual),
    wealthTargetAmount: numOrNull(row.wealth_target_amount),
    wealthTargetDate: row.wealth_target_date ?? null,
  };
}

/** Groups entries under their snapshot; snapshots come back newest month first. */
export function mapSnapshots(
  snapshotRows: InvestmentSnapshotRow[],
  entryRows: InvestmentEntryRow[],
): InvestmentSnapshot[] {
  const bySnapshot = new Map<string, InvestmentEntry[]>();
  for (const row of entryRows) {
    const list = bySnapshot.get(row.snapshot_id) ?? [];
    list.push({
      classId: row.class_id,
      balance: num(row.balance),
      contributions: num(row.contributions),
      withdrawals: num(row.withdrawals),
    });
    bySnapshot.set(row.snapshot_id, list);
  }
  return snapshotRows
    .map((s) => ({
      id: s.id,
      month: s.month,
      date: s.snapshot_date,
      entries: bySnapshot.get(s.id) ?? [],
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// ---------------------------------------------------------------- validation

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidCalendarDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

function money(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > MAX_MONEY) return null;
  return Math.round(value * 100) / 100;
}

export interface ClassInput {
  id?: string;
  parentId: string | null;
  name: string;
  sortOrder?: number;
  archived?: boolean;
}

export function validateClassInput(data: unknown): Result<ClassInput> {
  if (!isPlainObject(data)) return { ok: false, error: 'Dados inválidos' };
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (name.length < 1 || name.length > 100) {
    return { ok: false, error: 'O nome da classe deve ter de 1 a 100 caracteres' };
  }
  const parentId = typeof data.parentId === 'string' && data.parentId ? data.parentId : null;
  const out: ClassInput = { parentId, name };
  if (typeof data.id === 'string' && data.id) out.id = data.id;
  if (data.sortOrder !== undefined) {
    if (!Number.isInteger(data.sortOrder)) return { ok: false, error: 'Ordem inválida' };
    out.sortOrder = data.sortOrder as number;
  }
  if (data.archived !== undefined) {
    if (typeof data.archived !== 'boolean') return { ok: false, error: 'Valor de "arquivada" inválido' };
    out.archived = data.archived;
  }
  return { ok: true, value: out };
}

export interface SnapshotInput {
  id?: string;
  month: string;
  date: string;
  entries: InvestmentEntry[];
}

export function validateSnapshotInput(data: unknown): Result<SnapshotInput> {
  if (!isPlainObject(data)) return { ok: false, error: 'Dados inválidos' };
  const month = data.month;
  const date = data.date;
  if (typeof month !== 'string' || !MONTH_RE.test(month)) {
    return { ok: false, error: 'Mês inválido (use AAAA-MM)' };
  }
  if (typeof date !== 'string' || !isValidCalendarDate(date) || !date.startsWith(`${month}-`)) {
    return { ok: false, error: 'A data do lançamento deve existir e estar dentro do mês informado' };
  }
  if (!Array.isArray(data.entries) || data.entries.length === 0) {
    return { ok: false, error: 'Informe ao menos uma classe no lançamento' };
  }
  const seen = new Set<string>();
  const entries: InvestmentEntry[] = [];
  for (const raw of data.entries) {
    if (!isPlainObject(raw) || typeof raw.classId !== 'string' || !raw.classId) {
      return { ok: false, error: 'Item de lançamento inválido' };
    }
    if (seen.has(raw.classId)) return { ok: false, error: 'Classe repetida no lançamento' };
    seen.add(raw.classId);
    const balance = money(raw.balance);
    const contributions = money(raw.contributions ?? 0);
    const withdrawals = money(raw.withdrawals ?? 0);
    if (balance === null || contributions === null || withdrawals === null) {
      return { ok: false, error: 'Saldo, aportes e resgates devem ser números não negativos' };
    }
    entries.push({ classId: raw.classId, balance, contributions, withdrawals });
  }
  const out: SnapshotInput = { month, date, entries };
  if (typeof data.id === 'string' && data.id) out.id = data.id;
  return { ok: true, value: out };
}

export function validateSettingsInput(data: unknown): Result<InvestmentSettings> {
  if (!isPlainObject(data)) return { ok: false, error: 'Dados inválidos' };
  const { reminderDay, targetReturnAnnual, wealthTargetAmount, wealthTargetDate } = data;
  if (!Number.isInteger(reminderDay) || (reminderDay as number) < 1 || (reminderDay as number) > 31) {
    return { ok: false, error: 'O dia do lembrete deve ser de 1 a 31' };
  }
  let target: number | null = null;
  if (targetReturnAnnual !== null && targetReturnAnnual !== undefined) {
    if (
      typeof targetReturnAnnual !== 'number' ||
      !Number.isFinite(targetReturnAnnual) ||
      targetReturnAnnual < -100 ||
      targetReturnAnnual > 1000
    ) {
      return { ok: false, error: 'Meta de rentabilidade inválida' };
    }
    target = Math.round(targetReturnAnnual * 10000) / 10000;
  }
  let amount: number | null = null;
  if (wealthTargetAmount !== null && wealthTargetAmount !== undefined) {
    const m = money(wealthTargetAmount);
    if (m === null || m <= 0) return { ok: false, error: 'Meta de patrimônio inválida' };
    amount = m;
  }
  let targetDate: string | null = null;
  if (wealthTargetDate !== null && wealthTargetDate !== undefined) {
    if (typeof wealthTargetDate !== 'string' || !MONTH_RE.test(wealthTargetDate)) {
      return { ok: false, error: 'Data da meta de patrimônio inválida (use AAAA-MM)' };
    }
    targetDate = wealthTargetDate;
  }
  return {
    ok: true,
    value: {
      reminderDay: reminderDay as number,
      targetReturnAnnual: target,
      wealthTargetAmount: amount,
      wealthTargetDate: targetDate,
    },
  };
}

// ---------------------------------------------------------------- seed

export interface SeedClass {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
}

/** Default asset classes (Sprint 3, decision I11). Stable ids so reseeding is idempotent. */
export const DEFAULT_INVESTMENT_CLASSES: SeedClass[] = [
  { id: 'inv-renda-fixa', parentId: null, name: 'Renda Fixa', sortOrder: 0 },
  { id: 'inv-renda-fixa-nacional', parentId: 'inv-renda-fixa', name: 'Nacional', sortOrder: 0 },
  { id: 'inv-renda-fixa-internacional', parentId: 'inv-renda-fixa', name: 'Internacional', sortOrder: 1 },
  { id: 'inv-acoes', parentId: null, name: 'Ações', sortOrder: 1 },
  { id: 'inv-acoes-nacional', parentId: 'inv-acoes', name: 'Nacional', sortOrder: 0 },
  { id: 'inv-acoes-internacional', parentId: 'inv-acoes', name: 'Internacional', sortOrder: 1 },
  { id: 'inv-fiis', parentId: null, name: 'Fundos Imobiliários (Real Estate)', sortOrder: 2 },
  { id: 'inv-alternativos', parentId: null, name: 'Alternativos', sortOrder: 3 },
  { id: 'inv-alternativos-ouro', parentId: 'inv-alternativos', name: 'Ouro', sortOrder: 0 },
  { id: 'inv-alternativos-cripto', parentId: 'inv-alternativos', name: 'Criptomoedas', sortOrder: 1 },
  { id: 'inv-alternativos-previdencia', parentId: 'inv-alternativos', name: 'Previdência Privada', sortOrder: 2 },
];

/** Leaf = class with no child classes. Only leaves accept entries. */
export function isLeafClass(classId: string, classes: Pick<InvestmentClass, 'id' | 'parentId'>[]): boolean {
  return !classes.some((c) => c.parentId === classId);
}
