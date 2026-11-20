-- MySQL Database Schema for Personal Finance Planner
-- Creates the database and necessary tables with relationships

CREATE DATABASE IF NOT EXISTS finance_planner
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE finance_planner;

-- 1. USER PLANS
-- Represents the main profile/plan for the user
CREATE TABLE IF NOT EXISTS user_plans (
  id VARCHAR(50) PRIMARY KEY,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- 2. FORECAST CONFIGURATIONS
-- Settings for generating financial forecasts
CREATE TABLE IF NOT EXISTS forecast_configs (
  user_plan_id VARCHAR(50) PRIMARY KEY,
  starting_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  start_date VARCHAR(7) NOT NULL, -- YYYY-MM
  months INT NOT NULL DEFAULT 12,
  include_goal_contributions BOOLEAN NOT NULL DEFAULT TRUE,
  conservative_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_forecast_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 3. INCOMES
-- Income sources for the user
CREATE TABLE IF NOT EXISTS incomes (
  id VARCHAR(50) PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  description TEXT,
  start_date VARCHAR(10) NOT NULL, -- YYYY-MM-DD
  end_date VARCHAR(10),            -- YYYY-MM-DD
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_income_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 4. CREDIT CARD ACCOUNTS
-- Credit cards registered by the user
CREATE TABLE IF NOT EXISTS credit_card_accounts (
  id VARCHAR(50) PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  name VARCHAR(50) NOT NULL,
  due_day INT NOT NULL,
  closing_day INT NOT NULL,
  color VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_cc_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 5. EXPENSES
-- Expenses and outgoings for the user
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(50) PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  due_date VARCHAR(10) NOT NULL,     -- YYYY-MM-DD
  purchase_date VARCHAR(10) NULL,    -- YYYY-MM-DD, real purchase date (budget_migration.sql)
  payment_method VARCHAR(20) NOT NULL,
  credit_card_account VARCHAR(50),   -- String ID reference
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  frequency VARCHAR(20),
  recurring_weeks_interval INT,
  description TEXT,
  priority VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_months INT,
  installment_start_month VARCHAR(7), -- YYYY-MM
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_expense_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 6. GOALS
-- Financial goals the user is saving for
CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(50) PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL,
  target_date VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  current_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  goal_type VARCHAR(20) NOT NULL,
  priority_order INT NOT NULL DEFAULT 0,
  reserve_from_budget TINYINT(1) NOT NULL DEFAULT 0,  -- opt-in: reserves a share of the monthly budget
  budget_reserve_override DECIMAL(12, 2) NULL,        -- manual reserve per period; NULL = automatic
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_goal_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- Note: Forecasts are generally calculated on-the-fly, but we'll create a table 
-- if we strictly want to cache the frontend's output. Usually not recommended to store derived data permanently.
CREATE TABLE IF NOT EXISTS forecasts (
  id VARCHAR(50) PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL, -- YYYY-MM
  projected_balance DECIMAL(15, 2) NOT NULL,
  projected_income DECIMAL(15, 2) NOT NULL,
  projected_expenses DECIMAL(15, 2) NOT NULL,
  projected_goal_contributions DECIMAL(15, 2) NOT NULL,
  starting_balance DECIMAL(15, 2) NOT NULL,
  net_change DECIMAL(15, 2) NOT NULL,
  generated_at DATETIME NOT NULL,
  CONSTRAINT fk_forecast_data_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- 7. BUDGET (monthly budget with rollover day) - see docs/BUDGET_LOGIC.md
-- Also created on demand by backend/src/routes/plan.ts (ensureBudgetSchema) and by
-- database/migrations/budget_migration.sql.
CREATE TABLE IF NOT EXISTS budget_settings (
  user_plan_id VARCHAR(50) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  rollover_day INT NOT NULL DEFAULT 1,
  enabled_at VARCHAR(10) NOT NULL DEFAULT '', -- YYYY-MM-DD, first activation
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_budget_settings_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budget_amount_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_plan_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  effective_from VARCHAR(10) NOT NULL, -- YYYY-MM-DD (period start)
  CONSTRAINT fk_budget_history_user_plan FOREIGN KEY (user_plan_id) REFERENCES user_plans(id) ON DELETE CASCADE
);

-- NO foreign key to goals: POST /api/plan deletes and re-inserts goals on every save.
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


-- ============================================================
-- CAR MODULE - Database Migration
-- Run this script in your MySQL database: finance_planner
-- ============================================================

USE finance_planner;

-- 1. VEHICLES
-- Stores registered vehicles for the user
CREATE TABLE IF NOT EXISTS car_vehicles (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(60) NOT NULL,
  model VARCHAR(60) NOT NULL,
  year INT,
  license_plate VARCHAR(20),
  current_km DECIMAL(12, 0) NOT NULL DEFAULT 0,
  average_km_l DECIMAL(6, 2) NOT NULL DEFAULT 0.00,  -- user-estimated average
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- 2. FUEL LOGS
-- Records every refueling event
CREATE TABLE IF NOT EXISTS car_fuel_logs (
  id VARCHAR(60) PRIMARY KEY,
  vehicle_id VARCHAR(60) NOT NULL,
  date DATE NOT NULL,
  liters DECIMAL(8, 3) NOT NULL,           -- liters filled
  price_per_liter DECIMAL(8, 3) NOT NULL,  -- price per liter
  total_cost DECIMAL(10, 2) NOT NULL,      -- total paid
  odometer DECIMAL(12, 0),                 -- km reading at fill-up
  km_l DECIMAL(6, 2),                      -- calculated efficiency (km per liter)
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'gasoline',  -- gasoline, ethanol, diesel, gnv, electric
  station VARCHAR(100),                    -- gas station name/location
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES car_vehicles(id) ON DELETE CASCADE
);

-- 3. MAINTENANCE LOGS
-- Records all maintenance events and schedules next one
CREATE TABLE IF NOT EXISTS car_maintenance_logs (
  id VARCHAR(60) PRIMARY KEY,
  vehicle_id VARCHAR(60) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,               -- oil_change, tire_rotation, brake_inspection, alignment, filter, belt, battery, revisao, other
  description VARCHAR(255) NOT NULL,       -- detailed description of the maintenance
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- total cost paid
  odometer DECIMAL(12, 0),                 -- km reading at maintenance
  next_date DATE,                          -- when next maintenance is due (date based)
  next_odometer DECIMAL(12, 0),            -- when next maintenance is due (km based)
  next_km_interval DECIMAL(8, 0),          -- interval in km for next maintenance
  workshop VARCHAR(100),                   -- workshop / mechanic name
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_maint_vehicle FOREIGN KEY (vehicle_id) REFERENCES car_vehicles(id) ON DELETE CASCADE
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_fuel_vehicle_date ON car_fuel_logs (vehicle_id, date DESC);
CREATE INDEX idx_maint_vehicle_date ON car_maintenance_logs (vehicle_id, date DESC);
CREATE INDEX idx_maint_next_date ON car_maintenance_logs (next_date);


CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    target_date DATE,
    description TEXT,
    brand VARCHAR(255),
    link1 VARCHAR(1000),
    link2 VARCHAR(1000),
    link3 VARCHAR(1000),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- Also created on demand by backend/src/routes/plan.ts (ensureCategoriesTable).
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
);
