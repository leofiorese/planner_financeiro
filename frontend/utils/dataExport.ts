import { UserPlan, Income, Expense, Goal, Frequency } from "@/types";
import { formatDateDDMMYYYY } from "@/utils/dateFormatting";
import { formatCurrency } from "@/utils/format";

/**
 * Formatos de exportação.
 *
 * - **JSON**: backup técnico e estável do plano inteiro (datas ISO, valores numéricos). A estrutura
 *   não é localizada para o arquivo continuar importável.
 * - **CSV**: legível em planilha no Brasil: seções e cabeçalhos em português, datas DD/MM/AAAA,
 *   números com vírgula decimal, delimitador `;` e "Sim"/"Não". Os valores técnicos
 *   (frequência, categoria, prioridade) continuam como códigos para a importação ser fiel.
 *
 * O importador (`dataImport.ts`) aceita também os arquivos antigos em inglês.
 */
export type ExportFormat = "json" | "csv";

/** Nome do app gravado nos metadados do JSON exportado. */
export const EXPORT_APP_NAME = "Planner Financeiro";
/** Nome usado pelas versões antigas do app (ainda aceito na importação). */
export const LEGACY_EXPORT_APP_NAME = "Finance Planner";

/**
 * Export metadata
 */
export interface ExportMetadata {
  exportedAt: string;
  version: string;
  appName: string;
  dataTypes: string[];
}

/**
 * Complete export data structure
 */
export interface ExportData {
  metadata: ExportMetadata;
  userPlan: UserPlan;
}

/**
 * CSV export options
 */
export interface CSVExportOptions {
  includeHeaders: boolean;
  delimiter: string;
}

/**
 * Default CSV export options (padrão do Excel em pt-BR: ponto e vírgula)
 */
export const DEFAULT_CSV_OPTIONS: CSVExportOptions = {
  includeHeaders: true,
  delimiter: ";",
};

/**
 * Serialize user plan data to JSON format
 */
export function serializeToJSON(userPlan: UserPlan): string {
  const exportData: ExportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      appName: EXPORT_APP_NAME,
      dataTypes: ["income", "expenses", "goals", "forecast", "budget"],
    },
    userPlan: {
      ...userPlan,
      // Ensure dates are properly serialized
      createdAt: userPlan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Serialize user plan data to CSV format (pt-BR)
 */
export function serializeToCSV(
  userPlan: UserPlan,
  options: CSVExportOptions = DEFAULT_CSV_OPTIONS
): string {
  const csvSections: string[] = [];

  // Metadados (linhas iniciadas por "#" são ignoradas na importação)
  csvSections.push("# Planner Financeiro - Exportação");
  csvSections.push(`# Exportado em: ${new Date().toLocaleString("pt-BR")}`);
  csvSections.push("# Versão: 1.1.0");
  csvSections.push("");

  if (userPlan.income && userPlan.income.length > 0) {
    csvSections.push("## RECEITAS");
    csvSections.push(serializeIncomeToCSV(userPlan.income, options));
    csvSections.push("");
  }

  if (userPlan.expenses && userPlan.expenses.length > 0) {
    csvSections.push("## DESPESAS");
    csvSections.push(serializeExpensesToCSV(userPlan.expenses, options));
    csvSections.push("");
  }

  if (userPlan.goals && userPlan.goals.length > 0) {
    csvSections.push("## METAS");
    csvSections.push(serializeGoalsToCSV(userPlan.goals, options));
    csvSections.push("");
  }

  csvSections.push("## RESUMO");
  csvSections.push(serializeSummaryToCSV(userPlan, options));

  return csvSections.join("\n");
}

/** Número com vírgula decimal e sem separador de milhar (ex.: 1234,5). */
function formatNumberPtBR(value: number): string {
  return String(value).replace(".", ",");
}

function formatBoolean(value: boolean): string {
  return value ? "Sim" : "Não";
}

function serializeIncomeToCSV(income: Income[], options: CSVExportOptions): string {
  const headers = [
    "ID",
    "Nome",
    "Valor",
    "Frequência",
    "Descrição",
    "Data de Início",
    "Data de Término",
    "Ativo",
    "Criado em",
    "Atualizado em",
  ];

  const rows = income.map((item) => [
    item.id,
    escapeCSVValue(item.name, options.delimiter),
    formatNumberPtBR(item.amount),
    item.frequency,
    escapeCSVValue(item.description || "", options.delimiter),
    formatDateDDMMYYYY(item.startDate),
    item.endDate ? formatDateDDMMYYYY(item.endDate) : "",
    formatBoolean(item.isActive),
    formatDateDDMMYYYY(item.createdAt),
    formatDateDDMMYYYY(item.updatedAt),
  ]);

  return formatCSVSection(headers, rows, options);
}

function serializeExpensesToCSV(expenses: Expense[], options: CSVExportOptions): string {
  const headers = [
    "ID",
    "Nome",
    "Valor",
    "Categoria",
    "Forma de Pagamento",
    "Vencimento",
    "Recorrente",
    "Frequência",
    "Descrição",
    "Prioridade",
    "Ativo",
    "Criado em",
    "Atualizado em",
  ];

  const rows = expenses.map((item) => [
    item.id,
    escapeCSVValue(item.name, options.delimiter),
    formatNumberPtBR(item.amount),
    item.category,
    item.paymentMethod || "pix",
    formatDateDDMMYYYY(item.dueDate),
    formatBoolean(item.recurring),
    item.frequency || "",
    escapeCSVValue(item.description || "", options.delimiter),
    item.priority,
    formatBoolean(item.isActive),
    formatDateDDMMYYYY(item.createdAt),
    formatDateDDMMYYYY(item.updatedAt),
  ]);

  return formatCSVSection(headers, rows, options);
}

function serializeGoalsToCSV(goals: Goal[], options: CSVExportOptions): string {
  const headers = [
    "ID",
    "Nome",
    "Valor Alvo",
    "Valor Atual",
    "Data Alvo",
    "Descrição",
    "Categoria",
    "Prioridade",
    "Ativo",
    "Progresso %",
    "Criado em",
    "Atualizado em",
  ];

  const rows = goals.map((item) => [
    item.id,
    escapeCSVValue(item.name, options.delimiter),
    formatNumberPtBR(item.targetAmount),
    formatNumberPtBR(item.currentAmount),
    formatDateDDMMYYYY(item.targetDate),
    escapeCSVValue(item.description || "", options.delimiter),
    item.category,
    item.priority,
    formatBoolean(item.isActive),
    (item.targetAmount > 0 ? (item.currentAmount / item.targetAmount) * 100 : 0)
      .toFixed(2)
      .replace(".", ",") + "%",
    formatDateDDMMYYYY(item.createdAt),
    formatDateDDMMYYYY(item.updatedAt),
  ]);

  return formatCSVSection(headers, rows, options);
}

function serializeSummaryToCSV(userPlan: UserPlan, options: CSVExportOptions): string {
  const totalIncome =
    userPlan.income?.reduce((sum, income) => {
      if (!income.isActive) return sum;
      return sum + calculateMonthlyAmount(income.amount, income.frequency);
    }, 0) || 0;

  const totalExpenses =
    userPlan.expenses?.reduce((sum, expense) => {
      if (!expense.isActive) return sum;
      return (
        sum +
        calculateMonthlyAmount({
          amount: expense.amount,
          frequency: expense.frequency || Frequency.MONTHLY,
          recurring: expense.recurring,
          recurringWeeksInterval: expense.recurringWeeksInterval,
        })
      );
    }, 0) || 0;

  const totalGoals = userPlan.goals?.reduce((sum, goal) => sum + goal.targetAmount, 0) || 0;
  const totalSaved = userPlan.goals?.reduce((sum, goal) => sum + goal.currentAmount, 0) || 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  const headers = ["Métrica", "Valor"];
  const rows = [
    ["Receita mensal total", formatCurrency(totalIncome)],
    ["Despesa mensal total", formatCurrency(totalExpenses)],
    ["Saldo mensal", formatCurrency(totalIncome - totalExpenses)],
    ["Total das metas", formatCurrency(totalGoals)],
    ["Total guardado para metas", formatCurrency(totalSaved)],
    ["Saldo atual", formatCurrency(userPlan.currentBalance)],
    ["Taxa de poupança", `${savingsRate.toFixed(2).replace(".", ",")}%`],
    ["Fontes de renda ativas", String(userPlan.income?.filter((i) => i.isActive).length ?? 0)],
    ["Despesas ativas", String(userPlan.expenses?.filter((e) => e.isActive).length ?? 0)],
    ["Metas ativas", String(userPlan.goals?.filter((g) => g.isActive).length ?? 0)],
  ];

  return formatCSVSection(headers, rows, options);
}

/**
 * Valor mensal equivalente de uma receita (valor + frequência) ou de uma despesa (objeto).
 */
function calculateMonthlyAmount(amount: number, frequency: Frequency): number;
function calculateMonthlyAmount(expense: {
  amount: number;
  frequency: Frequency;
  recurring?: boolean;
  recurringWeeksInterval?: number;
}): number;
function calculateMonthlyAmount(
  amountOrExpense:
    | number
    | {
        amount: number;
        frequency: Frequency;
        recurring?: boolean;
        recurringWeeksInterval?: number;
      },
  frequency?: Frequency
): number {
  // Receita: valor + frequência
  if (typeof amountOrExpense === "number" && frequency) {
    const amount = amountOrExpense;
    switch (frequency) {
      case Frequency.DAILY:
        return amount * 30.44;
      case Frequency.WEEKLY:
        return amount * 4.33;
      case Frequency.BIWEEKLY:
        return amount * 2.17;
      case Frequency.QUARTERLY:
        return amount / 3;
      case Frequency.YEARLY:
        return amount / 12;
      default:
        return amount;
    }
  }

  // Despesa
  const expense = amountOrExpense as {
    amount: number;
    frequency: Frequency;
    recurring?: boolean;
    recurringWeeksInterval?: number;
  };

  // Despesa avulsa (não recorrente)
  if (!expense.recurring) {
    return expense.amount;
  }

  switch (expense.frequency) {
    case Frequency.DAILY:
      return expense.amount * 30.44;
    case Frequency.WEEKLY:
      // Intervalos semanais personalizados
      if (expense.recurringWeeksInterval && expense.recurringWeeksInterval > 1) {
        return expense.amount * (4.33 / expense.recurringWeeksInterval);
      }
      return expense.amount * 4.33;
    case Frequency.BIWEEKLY:
      return expense.amount * 2.17;
    case Frequency.QUARTERLY:
      return expense.amount / 3;
    case Frequency.YEARLY:
      return expense.amount / 12;
    default:
      return expense.amount;
  }
}

/**
 * Monta uma seção do CSV (cabeçalho + linhas)
 */
function formatCSVSection(headers: string[], rows: string[][], options: CSVExportOptions): string {
  const lines: string[] = [];

  if (options.includeHeaders) {
    lines.push(headers.join(options.delimiter));
  }

  rows.forEach((row) => {
    lines.push(row.join(options.delimiter));
  });

  return lines.join("\n");
}

/**
 * Escapa valores que contenham o delimitador, quebra de linha ou aspas
 */
function escapeCSVValue(value: string, delimiter: string): string {
  if (!value) return "";

  if (value.includes(delimiter) || value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Gera o nome do arquivo de exportação (ex.: planner-financeiro-2026-11-20.csv)
 */
export function generateExportFilename(
  format: ExportFormat,
  prefix: string = "planner-financeiro"
): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${prefix}-${timestamp}.${format}`;
}
