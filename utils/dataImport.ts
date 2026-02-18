import {
  UserPlan,
  Income,
  Expense,
  Goal,
  Frequency,
  ExpenseCategory,
  Priority,
  GoalCategory,
  GoalType,
} from "@/types";
import { ExportData } from "./dataExport";
import { initialForecastConfig } from "../context/initialState";

/**
 * Import result interface
 */
export interface ImportResult {
  success: boolean;
  userPlan?: UserPlan;
  errors: string[];
  warnings: string[];
}

/**
 * CSV parsing options
 */
export interface CSVImportOptions {
  delimiter: string;
  hasHeaders: boolean;
  skipEmptyLines: boolean;
}

/**
 * Default CSV import options
 */
export const DEFAULT_CSV_IMPORT_OPTIONS: CSVImportOptions = {
  delimiter: ",",
  hasHeaders: true,
  skipEmptyLines: true,
};

/**
 * Parse JSON file content and return UserPlan
 */
export function parseJSONImport(jsonContent: string): ImportResult {
  const result: ImportResult = {
    success: false,
    errors: [],
    warnings: [],
  };

  try {
    const data = JSON.parse(jsonContent);

    // Check if it's our export format with metadata
    if (data.metadata && data.userPlan) {
      const exportData = data as ExportData;

      // Validate metadata
      if (exportData.metadata.appName !== "Finance Planner") {
        result.warnings.push(
          "File was not exported from Finance Planner - compatibility not guaranteed"
        );
      }

      // Extract user plan
      const userPlan = exportData.userPlan;
      const validation = validateImportedUserPlan(userPlan);

      if (validation.isValid) {
        result.success = true;
        result.userPlan = sanitizeUserPlan(userPlan);
      } else {
        result.errors = validation.errors;
      }
    }
    // Check if it's a direct UserPlan object
    else if (data.id && (data.income || data.expenses || data.goals)) {
      const validation = validateImportedUserPlan(data);

      if (validation.isValid) {
        result.success = true;
        result.userPlan = sanitizeUserPlan(data);
      } else {
        result.errors = validation.errors;
      }
    } else {
      result.errors.push(
        "Invalid file format - expected Finance Planner export or UserPlan object"
      );
    }
  } catch (error) {
    result.errors.push(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  return result;
}

/**
 * Parse CSV file content and return UserPlan
 */
export function parseCSVImport(
  csvContent: string,
  options: CSVImportOptions = DEFAULT_CSV_IMPORT_OPTIONS
): ImportResult {
  const result: ImportResult = {
    success: false,
    errors: [],
    warnings: [],
  };

  try {
    const userPlan: Partial<UserPlan> = {
      id: generateId(),
      income: [],
      expenses: [],
      goals: [],
      forecast: [],
      currentBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lines = csvContent
      .split("\n")
      .filter((line) =>
        options.skipEmptyLines ? line.trim().length > 0 : true
      );

    let currentSection = "";
    let sectionData: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and metadata
      if (trimmedLine.startsWith("#")) {
        continue;
      }

      // Check for section headers
      if (trimmedLine.startsWith("## ")) {
        // Process previous section
        if (currentSection && sectionData.length > 0) {
          processCsvSection(
            currentSection,
            sectionData,
            userPlan,
            options,
            result
          );
          sectionData = [];
        }

        currentSection = trimmedLine.substring(3).toUpperCase();
        continue;
      }

      // Add data to current section
      if (currentSection && trimmedLine) {
        sectionData.push(trimmedLine);
      }
    }

    // Process final section
    if (currentSection && sectionData.length > 0) {
      processCsvSection(currentSection, sectionData, userPlan, options, result);
    }

    // Validate the constructed user plan
    const validation = validateImportedUserPlan(userPlan as UserPlan);

    if (validation.isValid) {
      result.success = true;
      result.userPlan = sanitizeUserPlan(userPlan as UserPlan);
    } else {
      result.errors.push(...validation.errors);
    }
  } catch (error) {
    result.errors.push(
      `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  return result;
}

/**
 * Process a CSV section (income, expenses, goals, etc.)
 */
function processCsvSection(
  sectionName: string,
  sectionData: string[],
  userPlan: Partial<UserPlan>,
  options: CSVImportOptions,
  result: ImportResult
): void {
  if (sectionData.length === 0) return;

  const rows = sectionData.map((line) => parseCSVLine(line, options.delimiter));
  const headers = options.hasHeaders ? rows.shift() : undefined;

  switch (sectionName) {
    case "INCOME":
      userPlan.income = parseIncomeFromCSV(rows, headers, result);
      break;
    case "EXPENSES":
      userPlan.expenses = parseExpensesFromCSV(rows, headers, result);
      break;
    case "GOALS":
      userPlan.goals = parseGoalsFromCSV(rows, headers, result);
      break;
    case "SUMMARY":
      // Summary is read-only, skip parsing
      break;
    default:
      result.warnings.push(`Unknown section: ${sectionName}`);
  }
}

/**
 * Parse income data from CSV rows
 */
function parseIncomeFromCSV(
  rows: string[][],
  headers?: string[],
  result?: ImportResult
): Income[] {
  const income: Income[] = [];

  // Define expected column indices
  const columnMap = mapCSVColumns(headers, [
    "ID",
    "Name",
    "Amount",
    "Frequency",
    "Description",
    "Start Date",
    "End Date",
    "Is Active",
    "Created At",
    "Updated At",
  ]);

  for (const row of rows) {
    try {
      const incomeItem: Income = {
        id: row[columnMap.ID] || generateId(),
        name: row[columnMap.Name] || "",
        amount: parseFloat(row[columnMap.Amount]) || 0,
        frequency: (row[columnMap.Frequency] as Frequency) || Frequency.MONTHLY,
        description: row[columnMap.Description] || undefined,
        startDate: row[columnMap["Start Date"]] || new Date().toISOString(),
        endDate: row[columnMap["End Date"]] || undefined,
        isActive: parseBoolean(row[columnMap["Is Active"]]),
        createdAt: row[columnMap["Created At"]] || new Date().toISOString(),
        updatedAt: row[columnMap["Updated At"]] || new Date().toISOString(),
      };

      if (incomeItem.name) {
        income.push(incomeItem);
      }
    } catch (error) {
      result?.warnings.push(`Failed to parse income row: ${row.join(",")}`);
    }
  }

  return income;
}

/**
 * Parse expenses data from CSV rows
 */
function parseExpensesFromCSV(
  rows: string[][],
  headers?: string[],
  result?: ImportResult
): Expense[] {
  const expenses: Expense[] = [];

  const columnMap = mapCSVColumns(headers, [
    "ID",
    "Name",
    "Amount",
    "Category",
    "Due Date",
    "Recurring",
    "Frequency",
    "Description",
    "Priority",
    "Is Active",
    "Created At",
    "Updated At",
  ]);

  for (const row of rows) {
    try {
      const expenseItem: Expense = {
        id: row[columnMap.ID] || generateId(),
        name: row[columnMap.Name] || "",
        amount: parseFloat(row[columnMap.Amount]) || 0,
        category:
          (row[columnMap.Category] as ExpenseCategory) ||
          ExpenseCategory.MISCELLANEOUS,
        dueDate: row[columnMap["Due Date"]] || new Date().toISOString(),
        recurring: parseBoolean(row[columnMap.Recurring]),
        frequency: row[columnMap.Frequency]
          ? (row[columnMap.Frequency] as Frequency)
          : undefined,
        description: row[columnMap.Description] || undefined,
        priority: (row[columnMap.Priority] as Priority) || Priority.MEDIUM,
        isActive: parseBoolean(row[columnMap["Is Active"]]),
        createdAt: row[columnMap["Created At"]] || new Date().toISOString(),
        updatedAt: row[columnMap["Updated At"]] || new Date().toISOString(),
      };

      if (expenseItem.name) {
        expenses.push(expenseItem);
      }
    } catch (error) {
      result?.warnings.push(`Failed to parse expense row: ${row.join(",")}`);
    }
  }

  return expenses;
}

/**
 * Convert Priority enum to priority order number
 */
function getPriorityOrder(priority: Priority): number {
  switch (priority) {
    case Priority.CRITICAL:
      return 0;
    case Priority.HIGH:
      return 1;
    case Priority.MEDIUM:
      return 2;
    case Priority.LOW:
      return 3;
    default:
      return 2; // Default to medium priority
  }
}

/**
 * Parse goals data from CSV rows
 */
function parseGoalsFromCSV(
  rows: string[][],
  headers?: string[],
  result?: ImportResult
): Goal[] {
  const goals: Goal[] = [];

  const columnMap = mapCSVColumns(headers, [
    "ID",
    "Name",
    "Target Amount",
    "Current Amount",
    "Target Date",
    "Description",
    "Category",
    "Priority",
    "Is Active",
    "Created At",
    "Updated At",
  ]);

  for (const row of rows) {
    try {
      const goalItem: Goal = {
        id: row[columnMap.ID] || generateId(),
        name: row[columnMap.Name] || "",
        targetAmount: parseFloat(row[columnMap["Target Amount"]]) || 0,
        currentAmount: parseFloat(row[columnMap["Current Amount"]]) || 0,
        targetDate: row[columnMap["Target Date"]] || new Date().toISOString(),
        description: row[columnMap.Description] || undefined,
        category:
          (row[columnMap.Category] as GoalCategory) || GoalCategory.OTHER,
        priority: (row[columnMap.Priority] as Priority) || Priority.MEDIUM,
        goalType: GoalType.FIXED_AMOUNT,
        priorityOrder: getPriorityOrder(
          (row[columnMap.Priority] as Priority) || Priority.MEDIUM
        ),
        isActive: parseBoolean(row[columnMap["Is Active"]]),
        createdAt: row[columnMap["Created At"]] || new Date().toISOString(),
        updatedAt: row[columnMap["Updated At"]] || new Date().toISOString(),
      };

      if (goalItem.name && goalItem.targetAmount > 0) {
        goals.push(goalItem);
      }
    } catch (error) {
      result?.warnings.push(`Failed to parse goal row: ${row.join(",")}`);
    }
  }

  return goals;
}

/**
 * Map CSV columns to expected fields
 */
function mapCSVColumns(
  headers: string[] | undefined,
  expectedColumns: string[]
): Record<string, number> {
  const columnMap: Record<string, number> = {};

  if (headers) {
    expectedColumns.forEach((column, defaultIndex) => {
      const headerIndex = headers.findIndex(
        (h) => h.trim().toLowerCase() === column.toLowerCase()
      );
      columnMap[column] = headerIndex >= 0 ? headerIndex : defaultIndex;
    });
  } else {
    expectedColumns.forEach((column, index) => {
      columnMap[column] = index;
    });
  }

  return columnMap;
}

/**
 * Parse a CSV line into array of values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add final value
  values.push(current.trim());

  return values;
}

/**
 * Parse boolean values from CSV
 */
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return (
    lower === "true" || lower === "yes" || lower === "1" || lower === "active"
  );
}

/**
 * Validate imported user plan data
 */
function validateImportedUserPlan(userPlan: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!userPlan) {
    errors.push("User plan data is missing");
    return { isValid: false, errors };
  }

  // Validate required fields
  if (!userPlan.id) {
    errors.push("User plan ID is missing");
  }

  // Validate arrays exist
  if (!Array.isArray(userPlan.income)) {
    userPlan.income = [];
  }
  if (!Array.isArray(userPlan.expenses)) {
    userPlan.expenses = [];
  }
  if (!Array.isArray(userPlan.goals)) {
    userPlan.goals = [];
  }
  if (!Array.isArray(userPlan.forecast)) {
    userPlan.forecast = [];
  }

  // Validate numeric fields
  if (typeof userPlan.currentBalance !== "number") {
    userPlan.currentBalance = 0;
  }

  // Validate or add forecast configuration
  if (!userPlan.forecastConfig) {
    userPlan.forecastConfig = { ...initialForecastConfig };
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitize and normalize imported user plan data
 */
function sanitizeUserPlan(userPlan: UserPlan): UserPlan {
  const now = new Date().toISOString();

  return {
    ...userPlan,
    id: userPlan.id || generateId(),
    income: userPlan.income || [],
    expenses: userPlan.expenses || [],
    goals: userPlan.goals || [],
    forecast: userPlan.forecast || [],
    currentBalance: userPlan.currentBalance || 0,
    forecastConfig: userPlan.forecastConfig || {
      ...initialForecastConfig,
      startingBalance: userPlan.currentBalance || 0,
    },
    createdAt: userPlan.createdAt || now,
    updatedAt: now, // Always update the timestamp on import
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect file format based on content
 */
export function detectFileFormat(content: string): "json" | "csv" | "unknown" {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "unknown";
    }
  }

  // Check for CSV patterns
  if (trimmed.includes(",") || trimmed.includes("\n")) {
    // Look for typical CSV headers or Finance Planner export format
    if (
      trimmed.includes("# Finance Planner Export") ||
      trimmed.includes("ID,Name,Amount") ||
      trimmed.includes("## INCOME") ||
      trimmed.includes("## EXPENSES")
    ) {
      return "csv";
    }
  }

  return "unknown";
}

/**
 * Import data from file content (auto-detects format)
 */
export function importFinancialData(content: string): ImportResult {
  const format = detectFileFormat(content);

  switch (format) {
    case "json":
      return parseJSONImport(content);
    case "csv":
      return parseCSVImport(content);
    default:
      return {
        success: false,
        errors: ["Unable to detect file format. Expected JSON or CSV."],
        warnings: [],
      };
  }
}
