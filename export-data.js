/**
 * SCRIPT PARA EXPORTAR OS DADOS DO LOCALSTORAGE PARA MYSQL
 * --------------------------------------------------------
 * 1. Abra a sua aplicação no Google Chrome, Edge ou Firefox.
 * 2. Pressione F12 para abrir o "Developer Tools".
 * 3. Vá na aba "Console".
 * 4. Copie TODO este código abaixo (Ctrl+C).
 * 5. Cole no Console (Ctrl+V) e pressione ENTER.
 * 6. Um arquivo "populacao.sql" será baixado para o seu computador.
 */

(function generateSQLAndDownload() {
  const STORAGE_KEY = "finance-planner-user-plan";
  const dataString = window.localStorage.getItem(STORAGE_KEY);
  
  if (!dataString) {
    alert("Nenhum dado encontrado no LocalStorage com a chave '" + STORAGE_KEY + "'. Certifique-se de estar na aplicação carregada.");
    return;
  }
  
  let data;
  try {
    data = JSON.parse(dataString);
  } catch (e) {
    alert("Erro ao ler os dados do LocalStorage.");
    return;
  }
  
  let sqlLines = [];
  sqlLines.push("-- SCRIPT DE POPULACAO GERADO AUTOMATICAMENTE");
  sqlLines.push("USE finance_planner;");
  sqlLines.push("SET FOREIGN_KEY_CHECKS=0;");
  sqlLines.push("");
  
  // Util function to escape strings for SQL
  function esc(val) {
    if (val === null || val === undefined || val === "") return "NULL";
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    if (typeof val === "number") return val;
    // escape quotes
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  const userId = data.id || 'default-plan';
  
  // 1. User Plan
  sqlLines.push("-- Tabelas user_plans");
  sqlLines.push(`INSERT IGNORE INTO user_plans (id, current_balance, created_at, updated_at) VALUES (${esc(userId)}, ${esc(data.currentBalance || 0)}, ${esc(data.createdAt || new Date().toISOString())}, ${esc(data.updatedAt || new Date().toISOString())});`);
  sqlLines.push("");

  // 2. Forecast Config
  if (data.forecastConfig) {
    const c = data.forecastConfig;
    sqlLines.push("-- Tabelas forecast_configs");
    sqlLines.push(`INSERT IGNORE INTO forecast_configs (user_plan_id, starting_balance, start_date, months, include_goal_contributions, conservative_mode, updated_at) VALUES (${esc(userId)}, ${esc(c.startingBalance || 0)}, ${esc(c.startDate)}, ${esc(c.months || 12)}, ${esc(c.includeGoalContributions)}, ${esc(c.conservativeMode)}, ${esc(c.updatedAt || new Date().toISOString())});`);
    sqlLines.push("");
  }

  // 3. Credit Card Accounts
  if (data.creditCardAccounts && data.creditCardAccounts.length > 0) {
    sqlLines.push("-- Tabelas credit_card_accounts");
    data.creditCardAccounts.forEach(cc => {
      sqlLines.push(`INSERT IGNORE INTO credit_card_accounts (id, user_plan_id, name, due_day, closing_day, color, is_active, created_at, updated_at) VALUES (${esc(cc.id)}, ${esc(userId)}, ${esc(cc.name)}, ${esc(cc.dueDay)}, ${esc(cc.closingDay)}, ${esc(cc.color)}, ${esc(cc.isActive)}, ${esc(cc.createdAt)}, ${esc(cc.updatedAt)});`);
    });
    sqlLines.push("");
  }

  // 4. Incomes
  if (data.income && data.income.length > 0) {
    sqlLines.push("-- Tabelas incomes");
    data.income.forEach(inc => {
      sqlLines.push(`INSERT IGNORE INTO incomes (id, user_plan_id, name, amount, frequency, description, start_date, end_date, is_active, created_at, updated_at) VALUES (${esc(inc.id)}, ${esc(userId)}, ${esc(inc.name)}, ${esc(inc.amount)}, ${esc(inc.frequency)}, ${esc(inc.description)}, ${esc(inc.startDate)}, ${esc(inc.endDate)}, ${esc(inc.isActive)}, ${esc(inc.createdAt)}, ${esc(inc.updatedAt)});`);
    });
    sqlLines.push("");
  }

  // 5. Expenses
  if (data.expenses && data.expenses.length > 0) {
    sqlLines.push("-- Tabelas expenses");
    data.expenses.forEach(exp => {
      sqlLines.push(`INSERT IGNORE INTO expenses (id, user_plan_id, name, amount, category, due_date, payment_method, credit_card_account, recurring, frequency, recurring_weeks_interval, description, priority, is_active, is_installment, installment_months, installment_start_month, created_at, updated_at) VALUES (${esc(exp.id)}, ${esc(userId)}, ${esc(exp.name)}, ${esc(exp.amount)}, ${esc(exp.category)}, ${esc(exp.dueDate)}, ${esc(exp.paymentMethod)}, ${esc(exp.creditCardAccount)}, ${esc(exp.recurring)}, ${esc(exp.frequency)}, ${esc(exp.recurringWeeksInterval)}, ${esc(exp.description)}, ${esc(exp.priority)}, ${esc(exp.isActive)}, ${esc(exp.isInstallment)}, ${esc(exp.installmentMonths)}, ${esc(exp.installmentStartMonth)}, ${esc(exp.createdAt)}, ${esc(exp.updatedAt)});`);
    });
    sqlLines.push("");
  }

  // 6. Goals
  if (data.goals && data.goals.length > 0) {
    sqlLines.push("-- Tabelas goals");
    data.goals.forEach(goal => {
      sqlLines.push(`INSERT IGNORE INTO goals (id, user_plan_id, name, target_amount, target_date, current_amount, description, category, priority, is_active, goal_type, priority_order, created_at, updated_at) VALUES (${esc(goal.id)}, ${esc(userId)}, ${esc(goal.name)}, ${esc(goal.targetAmount)}, ${esc(goal.targetDate)}, ${esc(goal.currentAmount)}, ${esc(goal.description)}, ${esc(goal.category)}, ${esc(goal.priority)}, ${esc(goal.isActive)}, ${esc(goal.goalType)}, ${esc(goal.priorityOrder)}, ${esc(goal.createdAt)}, ${esc(goal.updatedAt)});`);
    });
    sqlLines.push("");
  }
  
  // Forecasts
  if (data.forecast && data.forecast.length > 0) {
    sqlLines.push("-- Tabelas forecasts");
    data.forecast.forEach(f => {
      sqlLines.push(`INSERT IGNORE INTO forecasts (id, user_plan_id, month, projected_balance, projected_income, projected_expenses, projected_goal_contributions, starting_balance, net_change, generated_at) VALUES (${esc(f.id)}, ${esc(userId)}, ${esc(f.month)}, ${esc(f.projectedBalance)}, ${esc(f.projectedIncome)}, ${esc(f.projectedExpenses)}, ${esc(f.projectedGoalContributions)}, ${esc(f.startingBalance)}, ${esc(f.netChange)}, ${esc(f.generatedAt)});`);
    });
    sqlLines.push("");
  }
  
  sqlLines.push("SET FOREIGN_KEY_CHECKS=1;");
  sqlLines.push("-- FIM DO SCRIPT");
  
  // Fazer o download do arquivo
  const sqlString = sqlLines.join("\n");
  const blob = new Blob([sqlString], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "populacao.sql";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  console.log("✅ Script populacao.sql gerado com sucesso! Confira seus downloads.");

})();
