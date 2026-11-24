/**
 * Formulário do lançamento mensal (puro): rascunho em texto → payload da API, com validação.
 * `today` é sempre parâmetro.
 */
import type { InvestmentClass, InvestmentEntry, InvestmentSnapshot } from "@/types";
import { daysInMonth } from "../dates";
import { parseOptionalNumber } from "./normalize";
import { getLeafClasses, latestSnapshot } from "./totals";

export interface EntryDraft {
  balance: string;
  contributions: string;
  withdrawals: string;
}

export interface SnapshotDraft {
  month: string;
  date: string;
  /** Por id de classe-folha. */
  entries: Record<string, EntryDraft>;
}

export interface SnapshotPayloadValue {
  id?: string;
  month: string;
  date: string;
  entries: InvestmentEntry[];
}

export interface SnapshotDraftErrors {
  month?: string;
  date?: string;
  /** Erro geral das linhas (ex.: nenhuma classe preenchida). */
  entries?: string;
  /** Erro por classe-folha. */
  classes: Record<string, string>;
}

export type SnapshotDraftResult =
  | { ok: true; value: SnapshotPayloadValue }
  | { ok: false; errors: SnapshotDraftErrors };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const EMPTY_ENTRY: EntryDraft = { balance: "", contributions: "", withdrawals: "" };

/** Data padrão do lançamento: hoje, se `month` é o mês corrente; senão o último dia do mês. */
export function defaultSnapshotDate(month: string, today: string): string {
  if (today.startsWith(`${month}-`)) return today;
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(daysInMonth(y, m - 1)).padStart(2, "0")}`;
}

/** Folhas que aparecem no formulário: as ativas + as arquivadas que o lançamento em edição já tinha. */
export function formLeafClasses(classes: InvestmentClass[], editing?: InvestmentSnapshot | null): InvestmentClass[] {
  const keep = new Set(editing?.entries.map((e) => e.classId) ?? []);
  return getLeafClasses(classes, true).filter((c) => !c.archived || keep.has(c.id));
}

const text = (n: number) => (n === 0 ? "" : String(n));

/**
 * Rascunho inicial. Em edição, parte do lançamento. Em lançamento novo, o saldo vem preenchido com o
 * do lançamento anterior (mais recente antes de `month`), para o usuário só ajustar o que mudou.
 */
export function buildSnapshotDraft(args: {
  month: string;
  today: string;
  classes: InvestmentClass[];
  snapshots: InvestmentSnapshot[];
  editing?: InvestmentSnapshot | null;
}): SnapshotDraft {
  const { month, today, classes, snapshots, editing } = args;
  const leaves = formLeafClasses(classes, editing);
  const entries: Record<string, EntryDraft> = {};

  if (editing) {
    for (const leaf of leaves) {
      const e = editing.entries.find((x) => x.classId === leaf.id);
      entries[leaf.id] = e
        ? { balance: String(e.balance), contributions: text(e.contributions), withdrawals: text(e.withdrawals) }
        : { ...EMPTY_ENTRY };
    }
    return { month: editing.month, date: editing.date, entries };
  }

  const previous = latestSnapshot(snapshots.filter((s) => s.month < month));
  for (const leaf of leaves) {
    const prev = previous?.entries.find((x) => x.classId === leaf.id);
    entries[leaf.id] = { ...EMPTY_ENTRY, balance: prev && prev.balance > 0 ? String(prev.balance) : "" };
  }
  return { month, date: defaultSnapshotDate(month, today), entries };
}

/** Troca o mês do rascunho mantendo o que foi digitado; a data acompanha o mês. */
export function changeDraftMonth(draft: SnapshotDraft, month: string, today: string): SnapshotDraft {
  return { ...draft, month, date: MONTH_RE.test(month) ? defaultSnapshotDate(month, today) : draft.date };
}

const isBlank = (e: EntryDraft) => !e.balance.trim() && !e.contributions.trim() && !e.withdrawals.trim();

/** Total digitado nos saldos (para o resumo ao vivo); valores inválidos contam 0. */
export function draftBalanceTotal(draft: SnapshotDraft): number {
  return Object.values(draft.entries).reduce((sum, e) => {
    const n = parseOptionalNumber(e.balance);
    return sum + (typeof n === "number" && n > 0 ? n : 0);
  }, 0);
}

/**
 * Valida o rascunho. Linhas totalmente vazias são ignoradas; saldo vazio com aporte/resgate vale 0.
 * `editingId` exclui o próprio lançamento da checagem de mês duplicado.
 */
export function draftToPayload(
  draft: SnapshotDraft,
  snapshots: InvestmentSnapshot[],
  editingId?: string | null,
): SnapshotDraftResult {
  const errors: SnapshotDraftErrors = { classes: {} };

  if (!MONTH_RE.test(draft.month)) {
    errors.month = "Escolha o mês do lançamento";
  } else if (snapshots.some((s) => s.month === draft.month && s.id !== editingId)) {
    errors.month = "Já existe um lançamento neste mês. Edite o existente.";
  }

  if (!draft.date || !draft.date.startsWith(`${draft.month}-`)) {
    errors.date = "A data deve estar dentro do mês do lançamento";
  }

  const entries: InvestmentEntry[] = [];
  for (const [classId, e] of Object.entries(draft.entries)) {
    if (isBlank(e)) continue;
    const balance = parseOptionalNumber(e.balance);
    const contributions = parseOptionalNumber(e.contributions);
    const withdrawals = parseOptionalNumber(e.withdrawals);
    if ([balance, contributions, withdrawals].some((v) => v === undefined || (typeof v === "number" && v < 0))) {
      errors.classes[classId] = "Use números maiores ou iguais a zero";
      continue;
    }
    entries.push({
      classId,
      balance: (balance as number | null) ?? 0,
      contributions: (contributions as number | null) ?? 0,
      withdrawals: (withdrawals as number | null) ?? 0,
    });
  }

  if (entries.length === 0 && Object.keys(errors.classes).length === 0) {
    errors.entries = "Preencha o saldo de ao menos uma classe";
  }

  if (errors.month || errors.date || errors.entries || Object.keys(errors.classes).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { ...(editingId ? { id: editingId } : {}), month: draft.month, date: draft.date, entries } };
}
