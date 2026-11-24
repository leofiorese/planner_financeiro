-- Sprint 3 — Investimentos. Seguro para rodar de novo (CREATE TABLE IF NOT EXISTS).
-- Estas tabelas NÃO passam pelo POST /api/plan/, então o ON DELETE CASCADE do snapshot é seguro.
-- As classes padrão e a linha de configurações são criadas sob demanda por
-- backend/src/routes/investments.ts (ensureInvestmentsSchema); este arquivo só cria as tabelas.

CREATE TABLE IF NOT EXISTS investment_classes (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    parent_id VARCHAR(50) NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_investment_class_parent FOREIGN KEY (parent_id) REFERENCES investment_classes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS investment_snapshots (
    id VARCHAR(50) NOT NULL PRIMARY KEY,
    month VARCHAR(7) NOT NULL,
    snapshot_date VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT uq_investment_snapshot_month UNIQUE (month)
);

CREATE TABLE IF NOT EXISTS investment_snapshot_entries (
    snapshot_id VARCHAR(50) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    contributions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    withdrawals DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (snapshot_id, class_id),
    CONSTRAINT fk_investment_entry_snapshot FOREIGN KEY (snapshot_id) REFERENCES investment_snapshots(id) ON DELETE CASCADE,
    CONSTRAINT fk_investment_entry_class FOREIGN KEY (class_id) REFERENCES investment_classes(id) ON DELETE RESTRICT
);

-- Linha única (id = 1).
CREATE TABLE IF NOT EXISTS investment_settings (
    id TINYINT NOT NULL PRIMARY KEY,
    reminder_day INT NOT NULL DEFAULT 1,
    target_return_annual DECIMAL(7, 4) NULL,
    wealth_target_amount DECIMAL(14, 2) NULL,
    wealth_target_date VARCHAR(7) NULL,
    updated_at DATETIME NOT NULL
);
