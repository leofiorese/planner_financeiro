import { NextResponse } from 'next/server';
import { getDbConnection } from '@/utils/db';
import { UserPlan } from '@/types';

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

/**
 * Helper to convert ISO strings to MySQL compatible datetime strings
 */
function toDbDate(val: any): string | null {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function GET() {
    try {
        // We assume single-user app for now, grab the first plan or provide a parameter later
        const plans = await query('SELECT * FROM user_plans LIMIT 1');

        if (plans.length === 0) {
            return NextResponse.json({ message: 'No plans found' }, { status: 404 });
        }

        const userPlanRaw = plans[0];
        const planId = userPlanRaw.id;

        // Fetch related entities
        const [configs, ccs, incs, exps, gls, fcs] = await Promise.all([
            query('SELECT * FROM forecast_configs WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM credit_card_accounts WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM incomes WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM expenses WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM goals WHERE user_plan_id = ?', [planId]),
            query('SELECT * FROM forecasts WHERE user_plan_id = ?', [planId])
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

        // Number parsings for decimal fields
        formattedPlan.currentBalance = Number(formattedPlan.currentBalance) || 0;
        if (formattedPlan.forecastConfig) {
            formattedPlan.forecastConfig.startingBalance = Number(formattedPlan.forecastConfig.startingBalance) || 0;
        }

        formattedPlan.income.forEach((i: any) => i.amount = Number(i.amount) || 0);
        formattedPlan.expenses.forEach((e: any) => e.amount = Number(e.amount) || 0);
        formattedPlan.goals.forEach((g: any) => {
            g.targetAmount = Number(g.targetAmount) || 0;
            g.currentAmount = Number(g.currentAmount) || 0;
            g.priorityOrder = Number(g.priorityOrder) || 0;
        });

        formattedPlan.forecast.forEach((f: any) => {
            f.projectedBalance = Number(f.projectedBalance) || 0;
            f.projectedIncome = Number(f.projectedIncome) || 0;
            f.projectedExpenses = Number(f.projectedExpenses) || 0;
            f.projectedGoalContributions = Number(f.projectedGoalContributions) || 0;
            f.startingBalance = Number(f.startingBalance) || 0;
            f.netChange = Number(f.netChange) || 0;
        });

        return NextResponse.json(formattedPlan);

    } catch (error) {
        console.error('API Error (GET plan):', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const connection = await getDbConnection().getConnection();

    try {
        const plan: UserPlan = await request.json();
        const pid = plan.id;

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
        INSERT INTO expenses (id, user_plan_id, name, amount, category, due_date, payment_method, credit_card_account, recurring, frequency, recurring_weeks_interval, description, priority, is_active, is_installment, installment_months, installment_start_month, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                item.id, pid, item.name, item.amount, item.category, item.dueDate, item.paymentMethod, item.creditCardAccount || null,
                item.recurring ? 1 : 0, item.frequency || null, item.recurringWeeksInterval || null, item.description || null,
                item.priority, item.isActive ? 1 : 0, item.isInstallment ? 1 : 0, item.installmentMonths || null, item.installmentStartMonth || null,
                toDbDate(item.createdAt), toDbDate(item.updatedAt)
            ]);
        }

        await connection.execute('DELETE FROM goals WHERE user_plan_id = ?', [pid]);
        for (const item of plan.goals || []) {
            await connection.execute(`
        INSERT INTO goals (id, user_plan_id, name, target_amount, target_date, current_amount, description, category, priority, is_active, goal_type, priority_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.name, item.targetAmount, item.targetDate, item.currentAmount, item.description || null, item.category, item.priority, item.isActive ? 1 : 0, item.goalType, item.priorityOrder || 0, toDbDate(item.createdAt), toDbDate(item.updatedAt)]);
        }

        await connection.execute('DELETE FROM forecasts WHERE user_plan_id = ?', [pid]);
        for (const item of plan.forecast || []) {
            await connection.execute(`
        INSERT INTO forecasts (id, user_plan_id, month, projected_balance, projected_income, projected_expenses, projected_goal_contributions, starting_balance, net_change, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, pid, item.month, item.projectedBalance, item.projectedIncome, item.projectedExpenses, item.projectedGoalContributions, item.startingBalance, item.netChange, toDbDate(item.generatedAt)]);
        }

        await connection.commit();

        return NextResponse.json({ success: true });

    } catch (error) {
        await connection.rollback();
        console.error('API Error (POST plan):', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        connection.release();
    }
}
