import test from "node:test";
import assert from "node:assert/strict";
import { evolutionSeries, formatMonthShort, monthOverMonth } from "../../utils/investments/series";
import {
  buildSnapshotDraft,
  changeDraftMonth,
  defaultSnapshotDate,
  draftBalanceTotal,
  draftToPayload,
  formLeafClasses,
} from "../../utils/investments/snapshotForm";
import { INVESTMENT_CSV_HEADERS, investmentsCsvFilename, serializeInvestmentsCSV } from "../../utils/investments/csv";
import { CLASSES, approx, entry, snap } from "./helpers";

test("formatMonthShort", () => {
  assert.equal(formatMonthShort("2026-11"), "nov/26");
  assert.equal(formatMonthShort("2027-01"), "jan/27");
  assert.equal(formatMonthShort("lixo"), "lixo");
});

test("evolutionSeries: base conta como investido e aportes líquidos somam", () => {
  const s = evolutionSeries([
    snap("2026-03", [entry("a", 1300, 100, 0)]),
    snap("2026-01", [entry("a", 1000)]),
    snap("2026-02", [entry("a", 1150, 100, 20)]),
  ]);
  assert.deepEqual(s.map((p) => p.month), ["2026-01", "2026-02", "2026-03"]);
  assert.deepEqual(s.map((p) => p.invested), [1000, 1080, 1180]);
  assert.deepEqual(s.map((p) => p.total), [1000, 1150, 1300]);
  approx(s[2].gain, 120);
  assert.deepEqual(evolutionSeries([]), []);
});

test("monthOverMonth", () => {
  assert.equal(monthOverMonth([snap("2026-01", [entry("a", 100)])]), null);
  const m = monthOverMonth([snap("2026-01", [entry("a", 1000)]), snap("2026-02", [entry("a", 1100)])]);
  assert.ok(m);
  assert.equal(m.change, 100);
  approx(m.changePct, 0.1);
  const zero = monthOverMonth([snap("2026-01", [entry("a", 0)]), snap("2026-02", [entry("a", 50)])]);
  assert.equal(zero?.changePct, null);
});

test("defaultSnapshotDate: hoje no mês corrente, último dia nos demais", () => {
  assert.equal(defaultSnapshotDate("2026-11", "2026-11-23"), "2026-11-23");
  assert.equal(defaultSnapshotDate("2026-10", "2026-11-23"), "2026-10-31");
  assert.equal(defaultSnapshotDate("2027-02", "2026-11-23"), "2027-02-28");
  assert.equal(defaultSnapshotDate("2028-02", "2026-11-23"), "2028-02-29");
});

test("formLeafClasses: só folhas ativas; arquivada volta se o lançamento em edição já a tinha", () => {
  assert.deepEqual(formLeafClasses(CLASSES).map((c) => c.id), ["a", "b", "c", "y"]);
  const editing = snap("2026-01", [entry("d", 10)]);
  assert.deepEqual(formLeafClasses(CLASSES, editing).map((c) => c.id), ["a", "b", "c", "y", "d"]);
});

test("buildSnapshotDraft: novo parte dos saldos do lançamento anterior", () => {
  const prev = [snap("2026-09", [entry("a", 900)]), snap("2026-10", [entry("a", 1000), entry("c", 200)])];
  const d = buildSnapshotDraft({ month: "2026-11", today: "2026-11-23", classes: CLASSES, snapshots: prev });
  assert.equal(d.date, "2026-11-23");
  assert.deepEqual(d.entries.a, { balance: "1000", contributions: "", withdrawals: "" });
  assert.equal(d.entries.c.balance, "200");
  assert.equal(d.entries.b.balance, "");
  // sem lançamento anterior ao mês: tudo vazio
  const first = buildSnapshotDraft({ month: "2026-01", today: "2026-11-23", classes: CLASSES, snapshots: prev });
  assert.equal(first.entries.a.balance, "");
});

test("buildSnapshotDraft: edição carrega o lançamento", () => {
  const s = snap("2026-10", [entry("a", 1000, 50, 10)]);
  const d = buildSnapshotDraft({ month: "2026-11", today: "2026-11-23", classes: CLASSES, snapshots: [s], editing: s });
  assert.equal(d.month, "2026-10");
  assert.equal(d.date, "2026-10-05");
  assert.deepEqual(d.entries.a, { balance: "1000", contributions: "50", withdrawals: "10" });
});

test("changeDraftMonth mantém o digitado e ajusta a data", () => {
  const d = buildSnapshotDraft({ month: "2026-11", today: "2026-11-23", classes: CLASSES, snapshots: [] });
  d.entries.a.balance = "500";
  const next = changeDraftMonth(d, "2026-10", "2026-11-23");
  assert.equal(next.date, "2026-10-31");
  assert.equal(next.entries.a.balance, "500");
});

const baseDraft = () => buildSnapshotDraft({ month: "2026-11", today: "2026-11-23", classes: CLASSES, snapshots: [] });

test("draftToPayload: ignora linhas vazias, aceita vírgula e saldo vazio com aporte", () => {
  const d = baseDraft();
  d.entries.a = { balance: "1000,5", contributions: "100", withdrawals: "" };
  d.entries.b = { balance: "", contributions: "50", withdrawals: "" };
  const r = draftToPayload(d, []);
  assert.ok(r.ok);
  assert.deepEqual(r.value.entries, [
    { classId: "a", balance: 1000.5, contributions: 100, withdrawals: 0 },
    { classId: "b", balance: 0, contributions: 50, withdrawals: 0 },
  ]);
  assert.equal(r.value.id, undefined);
  assert.equal(draftBalanceTotal(d), 1000.5);
});

test("draftToPayload: erros de mês duplicado, data fora do mês, valor inválido e nenhuma linha", () => {
  const existing = [snap("2026-11", [entry("a", 1)])];
  const d = baseDraft();
  d.entries.a.balance = "10";
  const dup = draftToPayload(d, existing);
  assert.ok(!dup.ok && dup.errors.month);
  // editando o próprio lançamento, o mês não conta como duplicado
  assert.ok(draftToPayload(d, existing, existing[0].id).ok);

  const badDate = { ...d, date: "2026-10-30" };
  const r2 = draftToPayload(badDate, []);
  assert.ok(!r2.ok && r2.errors.date);

  const bad = baseDraft();
  bad.entries.a.balance = "-5";
  bad.entries.b.balance = "abc";
  const r3 = draftToPayload(bad, []);
  assert.ok(!r3.ok && r3.errors.classes.a && r3.errors.classes.b);

  const r4 = draftToPayload(baseDraft(), []);
  assert.ok(!r4.ok && r4.errors.entries);

  const noMonth = { ...baseDraft(), month: "" };
  assert.ok(!draftToPayload(noMonth, []).ok);
});

test("draftToPayload em edição carrega o id", () => {
  const s = snap("2026-10", [entry("a", 1000)]);
  const d = buildSnapshotDraft({ month: "2026-11", today: "2026-11-23", classes: CLASSES, snapshots: [s], editing: s });
  const r = draftToPayload(d, [s], s.id);
  assert.ok(r.ok);
  assert.equal(r.value.id, s.id);
});

test("CSV: cabeçalho, ordem cronológica, pt-BR e escape", () => {
  const classes = [...CLASSES, { id: "q", parentId: "c", name: 'Fundo "X"; Y', sortOrder: 0, archived: false }];
  const csv = serializeInvestmentsCSV(classes, [
    snap("2026-02", [entry("c", 200.5, 0, 10)]),
    snap("2026-01", [entry("a", 1000, 100), entry("q", 5)]),
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], INVESTMENT_CSV_HEADERS.join(";"));
  assert.equal(lines[1], "01/2026;05/01/2026;Renda Fixa;Nacional;1000,00;100,00;0,00");
  assert.equal(lines[2], '01/2026;05/01/2026;FIIs;"Fundo ""X""; Y";5,00;0,00;0,00');
  assert.equal(lines[3], "02/2026;05/02/2026;FIIs;;200,50;0,00;10,00");
  assert.equal(lines.length, 4);
});

test("CSV: classe removida e nome do arquivo", () => {
  const csv = serializeInvestmentsCSV([], [snap("2026-01", [entry("zzz", 1)])]);
  assert.ok(csv.split("\n")[1].includes("Classe removida"));
  assert.equal(investmentsCsvFilename("2026-11-23"), "investimentos-2026-11-23.csv");
});

test("formatPercent e formatPp (pt-BR)", async () => {
  const { formatPercent, formatPp } = await import("../../utils/investments/series");
  assert.equal(formatPercent(0.12345), "12,35%");
  assert.equal(formatPercent(-0.05, 1), "-5,0%");
  assert.equal(formatPercent(null), "—");
  assert.equal(formatPp(2.3), "+2,30 p.p.");
  assert.equal(formatPp(-0.5), "−0,50 p.p.");
});
