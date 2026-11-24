/** Defaults e conversão do formulário de configurações de investimentos (puro). */
import type { InvestmentSettings } from "@/types";

export const DEFAULT_INVESTMENT_SETTINGS: InvestmentSettings = {
  reminderDay: 1,
  targetReturnAnnual: null,
  wealthTargetAmount: null,
  wealthTargetDate: null,
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Garante um `InvestmentSettings` válido a partir de qualquer resposta parcial. */
export function normalizeInvestmentSettings(raw: Partial<InvestmentSettings> | null | undefined): InvestmentSettings {
  const day = Number(raw?.reminderDay);
  const target = raw?.targetReturnAnnual;
  const amount = raw?.wealthTargetAmount;
  return {
    reminderDay: Number.isInteger(day) ? Math.min(31, Math.max(1, day)) : DEFAULT_INVESTMENT_SETTINGS.reminderDay,
    targetReturnAnnual: typeof target === "number" && Number.isFinite(target) ? target : null,
    wealthTargetAmount: typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? amount : null,
    wealthTargetDate:
      typeof raw?.wealthTargetDate === "string" && MONTH_RE.test(raw.wealthTargetDate) ? raw.wealthTargetDate : null,
  };
}

export interface SettingsDraft {
  reminderDay: string;
  targetReturnAnnual: string;
  wealthTargetAmount: string;
  /** "YYYY-MM" ou vazio */
  wealthTargetDate: string;
}

export type SettingsDraftErrors = Partial<Record<keyof SettingsDraft, string>>;

const toText = (n: number | null) => (n === null ? "" : String(n));

export function settingsToDraft(s: InvestmentSettings): SettingsDraft {
  return {
    reminderDay: String(s.reminderDay),
    targetReturnAnnual: toText(s.targetReturnAnnual),
    wealthTargetAmount: toText(s.wealthTargetAmount),
    wealthTargetDate: s.wealthTargetDate ?? "",
  };
}

/** Número a partir de texto de input (aceita vírgula). Vazio → `null`; inválido → `undefined`. */
export function parseOptionalNumber(text: string): number | null | undefined {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export type DraftResult = { ok: true; value: InvestmentSettings } | { ok: false; errors: SettingsDraftErrors };

/** Valida o formulário. A meta de patrimônio exige valor e mês juntos (ou nenhum dos dois). */
export function draftToSettings(draft: SettingsDraft): DraftResult {
  const errors: SettingsDraftErrors = {};

  const day = Number(draft.reminderDay);
  if (draft.reminderDay.trim() === "" || !Number.isInteger(day) || day < 1 || day > 31) {
    errors.reminderDay = "Informe um dia de 1 a 31";
  }

  const target = parseOptionalNumber(draft.targetReturnAnnual);
  if (target === undefined || (target !== null && (target < -100 || target > 1000))) {
    errors.targetReturnAnnual = "Informe um percentual válido";
  }

  const amount = parseOptionalNumber(draft.wealthTargetAmount);
  if (amount === undefined || (amount !== null && amount <= 0)) {
    errors.wealthTargetAmount = "Informe um valor maior que zero";
  }

  const date = draft.wealthTargetDate.trim();
  if (date !== "" && !MONTH_RE.test(date)) errors.wealthTargetDate = "Informe um mês válido";

  if (!errors.wealthTargetAmount && !errors.wealthTargetDate) {
    if (amount !== null && date === "") errors.wealthTargetDate = "Informe até quando";
    if (amount === null && date !== "") errors.wealthTargetAmount = "Informe o valor-alvo";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      reminderDay: day,
      targetReturnAnnual: target as number | null,
      wealthTargetAmount: amount as number | null,
      wealthTargetDate: date === "" ? null : date,
    },
  };
}
