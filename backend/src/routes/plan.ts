/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from 'express';
import { route, methodNotAllowed } from '../http/handlers';
import { getDbConnection } from '../db/connection';
import { toDbDate } from '../db/dates';
import { UserPlan } from '../types';
import { DEFAULT_EXPENSE_CATEGORIES, normalizeLegacyCategory } from '../domain/categoryRules';
import {
    mapBudgetFromRows,
    mapGoalBudgetFields,
    normalizeBudgetForSave,
    overrideToDb,
    purchaseDateToDb,
} from '../domain/budgetMapping';

async function columnExists(table: string, column: string): Promise<boolean> {
    const rows = await query(
        'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column]
    );
    return Number(rows[0]?.c) > 0;
}

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<boolean> {
    if (await columnExists(table, column)) return false;
    await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
}

let budgetSchemaReady: Promise<void> | null = null;

/**
 * "Ensure on request" for the budget schema (same idea as ensureCategoriesTable), so
 * GET/POST /api/plan keep working for whoever did not run budget_migration.sql.
 * MUST run before beginTransaction(): ALTER TABLE causes an implicit commit.
 * Memoized per process; retried on the next request if it fails.
 */
function ensureBudgetSchema(): Promise<void> {
    if (!budgetSchemaReady) {
        budgetSchemaReady = (async () => {
            const addedPurchaseDate = await addColumnIfMissing('expenses', 'purchase_date', 'VARCHAR(10) NULL AFTER due_date');
            await addColumnIfMissing('goals', 'reserve_from_budget', 'TINYINT(1) NOT NULL DEFAULT 0');
            await addColumnIfMissing('goals', 'budget_reserve_override', 'DECIMAL(12, 2) NULL');

            await query(`
                CREATE TABLE IF NOT EXISTS budget_settings (
                    user_plan_id VARCHAR(50) PRIMARY KEY,
                    enabled TINYINT(1) NOT NULL DEFAULT 0,
                    rollover_day INT NOT NULL DEFAULT 1,
                    enabled_at VARCHAR(10) NOT NULL DEFAULT '',
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT fk_budget_settings_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
                )
            `);
            await query(`
                CREATE TABLE IF NOT EXISTS budget_amount_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_plan_id VARCHAR(50) NOT NULL,
                    amount DECIMAL(12, 2) NOT NULL,
                    effective_from VARCHAR(10) NOT NULL,
                    CONSTRAINT fk_budget_history_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
                )
            `);
            // No FK to goals on purpose: POST deletes and re-inserts goals on every save.
            await query(`
                CREATE TABLE IF NOT EXISTS budget_period_closures (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_plan_id VARCHAR(50) NOT NULL,
                    period_start VARCHAR(10) NOT NULL,
                    period_end VARCHAR(10) NOT NULL,
                    status VARCHAR(16) NOT NULL,
                    income DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    budget_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    allocations JSON NULL,
                    closed_at DATETIME NOT NULL,
                    CONSTRAINT fk_budget_closures_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE,
                    CONSTRAINT uq_budget_closure_period UNIQUE (user_plan_id, period_start)
                )
            `);

            if (addedPurchaseDate) {
                // Decision D4 backfill, same as budget_migration.sql (only runs when the column was just created).
                await query(`
                    UPDATE expenses
                    SET purchase_date = DATE_FORMAT(created_at, '%Y-%m-%d')
                    WHERE payment_method = 'credit_card' AND (purchase_date IS NULL OR purchase_date = '')
                `);
            }
        })().catch((error) => {
            budgetSchemaReady = null;
            throw error;
        });
    }
    return budgetSchemaReady;
}

async function ensureCategoriesTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS expense_categories (
            id VARCHAR(50) NOT NULL,
            user_plan_id VARCHAR(50) NOT NULL,
            name VARCHAR(100) NOT NULL,
            name_en VARCHAR(100),
            emoji VARCHAR(20) NOT NULL DEFAULT '📦',
            color VARCHAR(20) NOT NULL DEFAULT '#64748b',
            sort_order INT NOT NULL DEFAULT 0,
            is_default BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (id, user_plan_id),
            CONSTRAINT fk_cat_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
        )
    `);
}

/**
 * Helper to execute a query and return rows.
 */
async function query(sql: string, params: any[] = []): Promise<any[]> {
    const [rows] = await getDbConnection().execute(sql, params);
    return rows as any[];
}

/**
 * Helper to convert from database snake_case columns back to camelCase frontend models
 */
function toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

        // Process boolean and date conversions
        let parsedValue = value;
        if (value instanceof Date) {
            parsedValue = value.toISOString();
        } else if (
            key.startsWith('is_') ||
            key === 'recurring' ||
            key === 'include_goal_contributions' ||
            key === 'reserve_from_budget' ||
            key === 'conservative_mode'
        ) {
            if (typeof value === 'number') {
                parsedValue = value === 1;
            } else if (value instanceof Buffer) {
                parsedValue = value[0] === 1; // MySQL TinyInt(1) sometimes returns Buffer
            }
        }


        newObj[newKey] = toCamelCase(parsedValue);
    }
    return newObj;
}


export async function GET(_req: Request, res: Response) {
    try {
        // We assume single-user app for now, grab the first plan or provide a parameter later
        const plans = await query('SELECT * FROM user_plans LIMIT 1');

        if (plans.length === 0) {
            return res.status(404).json({ message: 'No plans found' });
        }

        const userPlanRaw = plans[0];
        const planId = userPlanRaw.id;

        await ensureCategoriesTable();
        await ensureBudgetSchema();

        // Fetch related entities
        const [configs, ccs, incs, exps, gls, fcs, cats, budgetSettingsRows, budgetHistoryRows, budgetClosureRows] = await Promise.all([
            query('SELECT * FROM forecast_configs WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM credit_card_accounts WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM incomes WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM expenses WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM goals WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM forecasts WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM expense_categories WHERE user_plan_id = ? ORDER BY sort_order ASC', [planId]),
            query('SELECT * FROM budget_settings WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM budget_amount_history WHERE user_plan_id = ? ORDER BY effective_from ASC, id ASC', [planId]),
            query('SELECT * FROM budget_period_closures WHERE user_plan_id = ? ORDER BY period_start ASC', [planId]),
        ]);

        // Format boolean fields properly and convert column names to camelCase
        const formattedPlan = toCamelCase(userPlanRaw);
        formattedPlan.forecastConfig = configs.length > 0 ? toCamelCase(configs[0]) : undefined;

        // Remove user_plan_id as it was just relational mapping
        formattedPlan.creditCardAccounts = ccs.map(toCamelCase).map((c: any) => { delete c.userPlanId; return c; });
        formattedPlan.income = incs.map(toCamelCase).map((i: any) => { delete i.userPlanId; return i; });
        formattedPlan.expenses = exps.map(toCamelCase).map((e: any) => { delete e.userPlanId; return e; });
        formattedPlan.goals = gls.map(toCamelCase).map((g: any) => { delete g.userPlanId; return g; });
        formattedPlan.forecast = fcs.map(toCamelCase).map((f: any) => { delete f.userPlanId; return f; });

        if (cats && cats.length > 0) {
            formattedPlan.expenseCategories = cats.map(toCamelCase).map((cat: any, idx: number) => ({
                id: cat.id,
                name: cat.name,
                emoji: cat.emoji || '📦',
                color: cat.color || '#64748b',
                order: typeof cat.sortOrder === 'number' ? cat.sortOrder : idx,
                isDefault: Boolean(cat.isDefault),
            }));
        } else {
            formattedPlan.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
        }

        // Number parsings for decimal fields
        formattedPlan.currentBalance = Number(formattedPlan.currentBalance) || 0;
        if (formattedPlan.forecastConfig) {
            formattedPlan.forecastConfig.startingBalance = Number(formattedPlan.forecastConfig.startingBalance) || 0;
        }

        formattedPlan.income.forEach((i: any) => i.amount = Number(i.amount) || 0);
        formattedPlan.expenses.forEach((e: any) => {
            e.amount = Number(e.amount) || 0;
            e.category = normalizeLegacyCategory(e.category, formattedPlan.expenseCategories);
            if (e.purchaseDate === null || e.purchaseDate === undefined || e.purchaseDate === '') {
                delete e.purchaseDate;
            }
        });
        formattedPlan.goals.forEach((g: any) => {
            g.targetAmount = Number(g.targetAmount) || 0;
            g.currentAmount = Number(g.currentAmount) || 0;
            g.priorityOrder = Number(g.priorityOrder) || 0;
            Object.assign(g, mapGoalBudgetFields(g));
        });

        // Budget: undefined when there is no budget_settings row (frontend applies defaults)
        const budget = mapBudgetFromRows(budgetSettingsRows[0], budgetHistoryRows, budgetClosureRows);
        if (budget) {
            formattedPlan.budget = budget;
        }

        formattedPlan.forecast.forEach((f: any) => {
            f.projectedBalance = Number(f.projectedBalance) || 0;
            f.projectedIncome = Number(f.projectedIncome) || 0;
            f.projectedExpenses = Number(f.projectedExpenses) || 0;
            f.projectedGoalContributions = Number(f.projectedGoalContributions) || 0;
            f.startingBalance = Number(f.startingBalance) || 0;
            f.netChange = Number(f.netChange) || 0;
        });

        return res.json(formattedPlan);

    } catch (error) {
        console.error('API Error (GET plan):', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function POST(req: Request, res: Response) {
    const connection = await getDbConnection().getConnection();

    try {
        const plan: UserPlan = req.body;
        const pid = plan.id;

        await ensureCategoriesTable();
        await ensureBudgetSchema();

        await connection.beginTransaction();

        // 1. Upsert User Plan
        await connection.execute(`
      INSERT INTO user_plans (id, current_balance, created_at, updated_at) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE current_balance=?, updated_at=?
    `, [
            pid, plan.currentBalance || 0, toDbDate(plan.createdAt), toDbDate(plan.updatedAt),
            plan.currentBalance || 0, toDbDate(plan.updatedAt)
        ]);

        // 2. Upsert Forecast Config
        if (plan.forecastConfig) {
            const fc = plan.forecastConfig;
            await connection.execute(`
        INSERT INTO forecast_configs (user_plan_id, starting_balance, start_date, months, include_goal_contributions, conservative_mode, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          starting_balance=?, start_date=?, months=?, include_goal_contributions=?, conservative_mode=?, updated_at=?
      `, [
                pid, fc.startingBalance || 0, fc.startDate, fc.months || 12, fc.includeGoalContributions ? 1 : 0, fc.conservativeMode ? 1 : 0, toDbDate(fc.updatedAt),
                fc.startingBalance || 0, fc.startDate, fc.months || 12, fc.includeGoalContributions ? 1 : 0, fc.conservativeMode ? 1 : 0, toDbDate(fc.updatedAt)
            ]);
        }

        // A simpler synchronization algorithm for list models is to clear and replace.
        // In production with multiple users concurrently, we'd do smart UPSERT and DELETE, 
        // but here the client is the source of truth for the entire plan list.

        await connection.execute('DELETE FROM credit_card_accounts WHERE user_plan_id = ?', [pid]);
        for (const item of plan.creditCardAccounts || []) {
            await connection.execute(`
        INSERT INTO credit_card_accounts (id, user_plan_id, name, due_day, closing_day, color, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.name, item.dueDay, item.closingDay, item.color || null, item.isActive ? 1 : 0, toDbDate(item.createdAt), toDbDate(item.updatedAt)]);
        }

        await connection.execute('DELETE FROM expense_categories WHERE user_plan_id = ?', [pid]);
        const categoriesToSave = (plan.expenseCategories && plan.expenseCategories.length > 0)
            ? plan.expenseCategories
            : DEFAULT_EXPENSE_CATEGORIES;
        for (let idx = 0; idx < categoriesToSave.length; idx++) {
            const cat = categoriesToSave[idx];
            await connection.execute(`
        INSERT INTO expense_categories (id, user_plan_id, name, emoji, color, sort_order, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [cat.id, pid, cat.name, cat.emoji || '📦', cat.color || '#64748b', typeof cat.order === 'number' ? cat.order : idx, cat.isDefault ? 1 : 0]);
        }

        await connection.execute('DELETE FROM incomes WHERE user_plan_id = ?', [pid]);
        for (const item of plan.income || []) {
            await connection.execute(`
        INSERT INTO incomes (id, user_plan_id, name, amount, frequency, description, start_date, end_date, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.name, item.amount, item.frequency, item.description || null, item.startDate, item.endDate || null, item.isActive ? 1 : 0, toDbDate(item.createdAt), toDbDate(item.updatedAt)]);
        }

        await connection.execute('DELETE FROM expenses WHERE user_plan_id = ?', [pid]);
        for (const item of plan.expenses || []) {
            await connection.execute(`
        INSERT INTO expenses (id, user_plan_id, name, amount, category, due_date, purchase_date, payment_method, credit_card_account, recurring, frequency, recurring_weeks_interval, description, priority, is_active, is_installment, installment_months, installment_start_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                item.id, pid, item.name, item.amount, item.category, item.dueDate, purchaseDateToDb(item.purchaseDate), item.paymentMethod, item.creditCardAccount || null,
                item.recurring ? 1 : 0, item.frequency || null, item.recurringWeeksInterval || null, item.description || null,
                item.priority, item.isActive ? 1 : 0, item.isInstallment ? 1 : 0, item.installmentMonths || null, item.installmentStartMonth || null,
                toDbDate(item.createdAt), toDbDate(item.updatedAt)
            ]);
        }

        await connection.execute('DELETE FROM goals WHERE user_plan_id = ?', [pid]);
        for (const item of plan.goals || []) {
            await connection.execute(`
        INSERT INTO goals (id, user_plan_id, name, target_amount, target_date, current_amount, description, category, priority, is_active, goal_type, priority_order, reserve_from_budget, budget_reserve_override, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.name, item.targetAmount, item.targetDate, item.currentAmount, item.description || null, item.category, item.priority, item.isActive ? 1 : 0, item.goalType, item.priorityOrder || 0, item.reserveFromBudget ? 1 : 0, overrideToDb(item.budgetReserveOverride), toDbDate(item.createdAt), toDbDate(item.updatedAt)]);
        }

        // Budget: only touched when the payload carries it (older clients never send it).
        // No FK to goals, so the delete+reinsert of goals above does not affect these tables.
        const budget = normalizeBudgetForSave(plan.budget);
        if (budget) {
            await connection.execute(`
        INSERT INTO budget_settings (user_plan_id, enabled, rollover_day, enabled_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE enabled=?, rollover_day=?, enabled_at=?, updated_at=?
      `, [
                pid, budget.enabled ? 1 : 0, budget.rolloverDay, budget.enabledAt, toDbDate(plan.updatedAt) ?? toDbDate(new Date()),
                budget.enabled ? 1 : 0, budget.rolloverDay, budget.enabledAt, toDbDate(plan.updatedAt) ?? toDbDate(new Date())
            ]);

            await connection.execute('DELETE FROM budget_amount_history WHERE user_plan_id = ?', [pid]);
            for (const entry of budget.amountHistory) {
                await connection.execute(`
        INSERT INTO budget_amount_history (user_plan_id, amount, effective_from)
        VALUES (?, ?, ?)
      `, [pid, entry.amount, entry.effectiveFrom]);
            }

            await connection.execute('DELETE FROM budget_period_closures WHERE user_plan_id = ?', [pid]);
            for (const closure of budget.periodClosures) {
                await connection.execute(`
        INSERT INTO budget_period_closures (user_plan_id, period_start, period_end, status, income, spent, budget_amount, allocations, closed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                    pid, closure.periodStart, closure.periodEnd, closure.status, closure.income, closure.spent, closure.budgetAmount,
                    JSON.stringify(closure.allocations), toDbDate(closure.closedAt) ?? toDbDate(new Date())
                ]);
            }
        }

        await connection.execute('DELETE FROM forecasts WHERE user_plan_id = ?', [pid]);
        for (const item of plan.forecast || []) {
            await connection.execute(`
        INSERT INTO forecasts (id, user_plan_id, month, projected_balance, projected_income, projected_expenses, projected_goal_contributions, starting_balance, net_change, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.month, item.projectedBalance, item.projectedIncome, item.projectedExpenses, item.projectedGoalContributions, item.startingBalance, item.netChange, toDbDate(item.generatedAt)]);
        }

        await connection.commit();

        return res.json({ success: true });

    } catch (error) {
        await connection.rollback();
        console.error('API Error (POST plan):', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        connection.release();
    }
}

export const planRouter = Router();
planRouter.get('/', route(GET));
planRouter.post('/', route(POST));
planRouter.all('/', methodNotAllowed(['GET', 'POST']));
