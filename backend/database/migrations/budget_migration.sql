-- ============================================================
-- BUDGET MODULE (Sprint 1) - Database Migration
-- Safe to run more than once (idempotent).
-- Applies to the database configured in backend/.env (DB_NAME):
--   npm run db:migrate -- budget_migration.sql
--
-- The same schema is also created on demand by backend/src/routes/plan.ts
-- (ensureBudgetSchema), so skipping this file does not break GET/POST /api/plan.
-- MySQL 8 has no "ADD COLUMN IF NOT EXISTS": each column is guarded by a
-- check on information_schema + PREPARE.
-- ============================================================

-- 1. expenses.purchase_date (real purchase date; for credit cards differs from due_date)
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses' AND COLUMN_NAME = 'purchase_date'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE expenses ADD COLUMN purchase_date VARCHAR(10) NULL AFTER due_date',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. goals.reserve_from_budget (opt-in: goal reserves a share of the monthly budget)
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goals' AND COLUMN_NAME = 'reserve_from_budget'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE goals ADD COLUMN reserve_from_budget TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. goals.budget_reserve_override (manual reserve per period; NULL = automatic)
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'goals' AND COLUMN_NAME = 'budget_reserve_override'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE goals ADD COLUMN budget_reserve_override DECIMAL(12, 2) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Budget settings (one row per plan)
CREATE TABLE IF NOT EXISTS budget_settings (
  user_plan_id VARCHAR(50) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  rollover_day INT NOT NULL DEFAULT 1,
  enabled_at VARCHAR(10) NOT NULL DEFAULT '', -- YYYY-MM-DD, first activation
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_budget_settings_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 5. Budget amount (Y) history: value in force from the start of a period
CREATE TABLE IF NOT EXISTS budget_amount_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  effective_from VARCHAR(10) NOT NULL, -- YYYY-MM-DD (period start)
  CONSTRAINT fk_budget_history_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 6. Closed periods (confirmed / skipped).
-- NO foreign key to goals: POST /api/plan deletes and re-inserts goals on every save,
-- so `allocations` keeps the goalId inside JSON instead.
CREATE TABLE IF NOT EXISTS budget_period_closures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  period_start VARCHAR(10) NOT NULL, -- YYYY-MM-DD
  period_end VARCHAR(10) NOT NULL,   -- YYYY-MM-DD (inclusive)
  status VARCHAR(16) NOT NULL,       -- confirmed | skipped
  income DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  spent DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  budget_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  allocations JSON NULL,
  closed_at DATETIME NOT NULL,
  CONSTRAINT fk_budget_closures_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE,
  CONSTRAINT uq_budget_closure_period UNIQUE (user_plan_id, period_start)
);

-- 7. Backfill (decision D4): credit-card expenses without a purchase date use the
-- (local) date of created_at. Only touches rows that are still empty.
UPDATE expenses
SET purchase_date = DATE_FORMAT(created_at, '%Y-%m-%d')
WHERE payment_method = 'credit_card'
  AND (purchase_date IS NULL OR purchase_date = '');
