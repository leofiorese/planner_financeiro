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
