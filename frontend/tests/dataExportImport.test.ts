/**
 * Export/Import: CSV em pt-BR (round-trip) e compatibilidade com arquivos antigos em inglês.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { serializeToCSV, serializeToJSON } from "../utils/dataExport";
import { importFinancialData, parseCSVImport, parseJSONImport } from "../utils/dataImport";
import { makeExpense, makeGoal, makeIncome, makePlan } from "./budget/helpers";

const plan = () =>
  makePlan({
    income: [makeIncome({ id: "i1", name: "Salário", amount: 6000.5, startDate: "2026-01-20" })],
    expenses: [
      makeExpense({
        id: "e1",
        name: "Mercado, feira e padaria",
        amount: 1234.56,
        category: "food",
        dueDate: "2026-12-01",
        recurring: true,
        frequency: "monthly" as never,
      }),
    ],
    goals: [makeGoal({ id: "g1", name: "Viagem", targetAmount: 4000, currentAmount: 1500.25, targetDate: "2027-02-25" })],
  });

test("CSV exportado sai em pt-BR: seções, cabeçalhos, delimitador ';', datas e números", () => {
  const csv = serializeToCSV(plan());
  assert.match(csv, /^# Planner Financeiro - Exportação/);
  for (const section of ["## RECEITAS", "## DESPESAS", "## METAS", "## RESUMO"]) assert.ok(csv.includes(section), section);
  assert.ok(csv.includes("ID;Nome;Valor;Frequência;Descrição;Data de Início;Data de Término;Ativo;Criado em;Atualizado em"));
  assert.ok(csv.includes("6000,5"), "número com vírgula decimal");
  assert.ok(csv.includes("01/12/2026"), "data DD/MM/AAAA sem deslocar o dia");
  assert.ok(csv.includes(";Sim;"), "booleano em português");
  assert.ok(csv.includes('"Mercado, feira e padaria"'), "texto com vírgula entre aspas");
  assert.ok(!/(^|[^R])\$/m.test(csv), "sem dólar (só R$)");
  assert.ok(!/Yes|\bNo\b|Metric|Name\b/.test(csv), "sem textos em inglês");
});

test("round-trip do CSV pt-BR preserva receitas, despesas e metas", () => {
  const original = plan();
  const result = parseCSVImport(serializeToCSV(original));
  assert.equal(result.success, true, result.errors.join("; "));
  const imported = result.userPlan!;

  assert.equal(imported.income.length, 1);
  assert.equal(imported.income[0].name, "Salário");
  assert.equal(imported.income[0].amount, 6000.5);
  assert.equal(imported.income[0].startDate, "2026-01-20");

  assert.equal(imported.expenses.length, 1);
  assert.equal(imported.expenses[0].name, "Mercado, feira e padaria");
  assert.equal(imported.expenses[0].amount, 1234.56);
  assert.equal(imported.expenses[0].dueDate, "2026-12-01");
  assert.equal(imported.expenses[0].recurring, true);
  assert.equal(imported.expenses[0].isActive, true);
  assert.equal(imported.expenses[0].category, "food");

  assert.equal(imported.goals.length, 1);
  assert.equal(imported.goals[0].targetAmount, 4000);
  assert.equal(imported.goals[0].currentAmount, 1500.25);
  assert.equal(imported.goals[0].targetDate, "2027-02-25");
});

test("importFinancialData detecta o CSV pt-BR automaticamente", () => {
  const result = importFinancialData(serializeToCSV(plan()));
  assert.equal(result.success, true, result.errors.join("; "));
  assert.equal(result.userPlan!.expenses[0].amount, 1234.56);
});

const LEGACY_CSV = [
  "# Finance Planner Export",
  "# Exported: 2026-03-01T12:00:00.000Z",
  "# Version: 1.0.0",
  "",
  "## INCOME",
  "ID,Name,Amount,Frequency,Description,Start Date,End Date,Is Active,Created At,Updated At",
  "i1,Salary,5000.5,monthly,,2026-01-20,,Yes,2026-01-01,2026-01-01",
  "",
  "## EXPENSES",
  "ID,Name,Amount,Category,Payment Method,Due Date,Recurring,Frequency,Description,Priority,Is Active,Created At,Updated At",
  'e1,"Rent, home",1500.75,housing,pix,2026-12-01,Yes,monthly,,high,Yes,2026-01-01,2026-01-01',
  "",
  "## GOALS",
  "ID,Name,Target Amount,Current Amount,Target Date,Description,Category,Priority,Is Active,Progress %,Created At,Updated At",
  "g1,Trip,4000,1000.5,2027-02-25,,other,medium,Yes,25.01%,2026-01-01,2026-01-01",
  "",
  "## SUMMARY",
  "Metric,Value",
  "Total Monthly Income,$5000.50",
].join("\n");

test("CSV antigo em inglês (delimitador ',', números com ponto, 'Yes') continua importável", () => {
  const result = importFinancialData(LEGACY_CSV);
  assert.equal(result.success, true, result.errors.join("; "));
  const p = result.userPlan!;
  assert.equal(p.income[0].amount, 5000.5);
  assert.equal(p.income[0].isActive, true);
  assert.equal(p.expenses[0].name, "Rent, home");
  assert.equal(p.expenses[0].amount, 1500.75);
  assert.equal(p.expenses[0].dueDate, "2026-12-01");
  assert.equal(p.goals[0].currentAmount, 1000.5);
  assert.equal(p.goals[0].targetDate, "2027-02-25");
});

test("JSON novo usa o nome do app em pt-BR e o JSON antigo ('Finance Planner') segue sem aviso", () => {
  const json = serializeToJSON(plan());
  assert.equal(JSON.parse(json).metadata.appName, "Planner Financeiro");
  const newer = parseJSONImport(json);
  assert.equal(newer.success, true, newer.errors.join("; "));
  assert.equal(newer.warnings.length, 0);

  const legacy = JSON.parse(json);
  legacy.metadata.appName = "Finance Planner";
  const older = parseJSONImport(JSON.stringify(legacy));
  assert.equal(older.success, true, older.errors.join("; "));
  assert.equal(older.warnings.length, 0);

  assert.equal(newer.userPlan!.income[0].amount, 6000.5);
});
