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
