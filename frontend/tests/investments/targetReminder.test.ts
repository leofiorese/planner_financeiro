import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, monthDiff } from "../../utils/investments/months";
import { compareToTarget, monthlyEquivalent, projectWealthTarget } from "../../utils/investments/target";
import { reminderDueDate, shouldShowReminder } from "../../utils/investments/reminder";
import {
  DEFAULT_INVESTMENT_SETTINGS,
  draftToSettings,
  normalizeInvestmentSettings,
  parseOptionalNumber,
  settingsToDraft,
} from "../../utils/investments/normalize";
import { approx } from "./helpers";

test("monthDiff e addMonths, inclusive virada de ano", () => {
  assert.equal(monthDiff("2026-11", "2027-02"), 3);
  assert.equal(monthDiff("2027-02", "2026-11"), -3);
  assert.equal(addMonths("2026-11", 3), "2027-02");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-12", 12), "2027-12");
});

test("monthlyEquivalent: 12% a.a. compõe de volta para 12%", () => {
  approx(Math.pow(1 + monthlyEquivalent(12), 12) - 1, 0.12);
  approx(monthlyEquivalent(0), 0);
});

test("compareToTarget: acima, abaixo e na meta", () => {
  const above = compareToTarget(0.15, 12);
  assert.equal(above.status, "above");
  approx(above.diffPp, 3);
  assert.equal(compareToTarget(0.09, 12).status, "below");
  assert.equal(compareToTarget(0.12, 12).status, "on");
});

const base = { currentBalance: 0, currentMonth: "2026-01", targetAmount: 12000, targetMonth: "2027-01", annualReturnPct: 0 };

test("projectWealthTarget: no ritmo certo, sem rendimento", () => {
  const p = projectWealthTarget({ ...base, monthlyContribution: 1000 });
  assert.equal(p.monthsToDeadline, 12);
  approx(p.projectedAtTarget, 12000);
  assert.equal(p.onTrack, true);
  assert.equal(p.reachedMonth, "2027-01");
  approx(p.requiredMonthlyContribution, 1000);
});

test("projectWealthTarget: ritmo insuficiente indica quando chega e quanto falta aportar", () => {
  const p = projectWealthTarget({ ...base, monthlyContribution: 500 });
  approx(p.projectedAtTarget, 6000);
  assert.equal(p.onTrack, false);
  assert.equal(p.reachedMonth, "2028-01");
  approx(p.requiredMonthlyContribution, 1000);
});

test("projectWealthTarget: com rentabilidade, o aporte necessário cai e fecha o alvo", () => {
  const input = { ...base, currentBalance: 5000, annualReturnPct: 12 };
  const p = projectWealthTarget({ ...input, monthlyContribution: 0 });
  assert.ok(p.requiredMonthlyContribution !== null && p.requiredMonthlyContribution > 0);
  // aportando exatamente o necessário, o saldo projetado bate o alvo
  const check = projectWealthTarget({ ...input, monthlyContribution: p.requiredMonthlyContribution });
  approx(check.projectedAtTarget, 12000, 1e-6);
  // rendimento só: 5000 → 5600
  approx(p.projectedAtTarget, 5000 * 1.12, 1e-6);
});

test("projectWealthTarget: já alcançou, prazo vencido e inalcançável", () => {
  assert.equal(projectWealthTarget({ ...base, currentBalance: 13000, monthlyContribution: 0 }).reachedMonth, "2026-01");
  const late = projectWealthTarget({ ...base, currentBalance: 100, targetMonth: "2025-12", monthlyContribution: 50 });
  assert.equal(late.requiredMonthlyContribution, null);
  approx(late.projectedAtTarget, 100);
  assert.equal(late.onTrack, false);
  const stuck = projectWealthTarget({ ...base, currentBalance: 100, monthlyContribution: 0 });
  assert.equal(stuck.reachedMonth, null);
  assert.equal(projectWealthTarget({ ...base, currentBalance: 20000, monthlyContribution: 0 }).requiredMonthlyContribution, 0);
});

test("reminderDueDate: clamp em meses curtos", () => {
  assert.equal(reminderDueDate("2026-11-20", 31), "2026-11-30");
  assert.equal(reminderDueDate("2027-02-10", 31), "2027-02-28");
  assert.equal(reminderDueDate("2028-02-10", 31), "2028-02-29");
  assert.equal(reminderDueDate("2026-11-20", 5), "2026-11-05");
});

test("shouldShowReminder: antes e a partir do dia X", () => {
  const input = { reminderDay: 5, snapshotMonths: [] as string[] };
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-04" }), false);
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-05" }), true);
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-28" }), true);
});

test("shouldShowReminder: some com o mês lançado; só o mês corrente conta", () => {
  assert.equal(shouldShowReminder({ today: "2026-11-10", reminderDay: 5, snapshotMonths: ["2026-11"] }), false);
  assert.equal(shouldShowReminder({ today: "2026-11-10", reminderDay: 5, snapshotMonths: ["2026-10"] }), true);
});

test("shouldShowReminder: 'Lembrar depois' vale só no dia", () => {
  const input = { reminderDay: 5, snapshotMonths: [] as string[] };
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-10", snoozedOn: "2026-11-10" }), false);
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-11", snoozedOn: "2026-11-10" }), true);
  assert.equal(shouldShowReminder({ ...input, today: "2026-11-11", snoozedOn: null }), true);
});

test("shouldShowReminder: dia 31 em fevereiro e data inválida", () => {
  const input = { reminderDay: 31, snapshotMonths: [] as string[] };
  assert.equal(shouldShowReminder({ ...input, today: "2027-02-27" }), false);
  assert.equal(shouldShowReminder({ ...input, today: "2027-02-28" }), true);
  assert.equal(shouldShowReminder({ ...input, today: "lixo" }), false);
});

test("normalizeInvestmentSettings: defaults e clamp", () => {
  assert.deepEqual(normalizeInvestmentSettings(null), DEFAULT_INVESTMENT_SETTINGS);
  assert.equal(normalizeInvestmentSettings({ reminderDay: 99 }).reminderDay, 31);
  assert.equal(normalizeInvestmentSettings({ reminderDay: 0 }).reminderDay, 1);
  const s = normalizeInvestmentSettings({ wealthTargetAmount: -5, wealthTargetDate: "2030-13", targetReturnAnnual: 12 });
  assert.equal(s.wealthTargetAmount, null);
  assert.equal(s.wealthTargetDate, null);
  assert.equal(s.targetReturnAnnual, 12);
});

test("parseOptionalNumber: vírgula, vazio e inválido", () => {
  assert.equal(parseOptionalNumber("12,5"), 12.5);
  assert.equal(parseOptionalNumber("  "), null);
  assert.equal(parseOptionalNumber("abc"), undefined);
});

test("draftToSettings: válido, round-trip e erros", () => {
  const ok = draftToSettings({ reminderDay: "10", targetReturnAnnual: "12,5", wealthTargetAmount: "1000000", wealthTargetDate: "2035-12" });
  assert.ok(ok.ok);
  assert.deepEqual(ok.value, { reminderDay: 10, targetReturnAnnual: 12.5, wealthTargetAmount: 1_000_000, wealthTargetDate: "2035-12" });
  assert.deepEqual(draftToSettings(settingsToDraft(ok.value)), ok);

  const empty = draftToSettings({ reminderDay: "1", targetReturnAnnual: "", wealthTargetAmount: "", wealthTargetDate: "" });
  assert.ok(empty.ok);
  assert.equal(empty.value.targetReturnAnnual, null);

  const bad = draftToSettings({ reminderDay: "32", targetReturnAnnual: "x", wealthTargetAmount: "0", wealthTargetDate: "" });
  assert.ok(!bad.ok);
  assert.ok(bad.errors.reminderDay && bad.errors.targetReturnAnnual && bad.errors.wealthTargetAmount);

  const half = draftToSettings({ reminderDay: "5", targetReturnAnnual: "", wealthTargetAmount: "500", wealthTargetDate: "" });
  assert.ok(!half.ok);
  assert.ok(half.errors.wealthTargetDate);
  const half2 = draftToSettings({ reminderDay: "5", targetReturnAnnual: "", wealthTargetAmount: "", wealthTargetDate: "2030-01" });
  assert.ok(!half2.ok);
  assert.ok(half2.errors.wealthTargetAmount);
});
