/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, type Request, type Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import { route, methodNotAllowed, queryParam } from '../http/handlers';
import { getDbConnection } from '../db/connection';
import { toDbDate } from '../db/dates';
import {
  DEFAULT_INVESTMENT_CLASSES,
  DEFAULT_REMINDER_DAY,
  isLeafClass,
  mapClassRow,
  mapSettingsRow,
  mapSnapshots,
  validateClassInput,
  validateSettingsInput,
  validateSnapshotInput,
} from '../domain/investmentMapping';
import type { InvestmentClass, InvestmentsData } from '../types';

async function query(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await getDbConnection().execute(sql, params);
  return rows as any[];
}

const nowDb = () => toDbDate(new Date().toISOString());
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

let schemaReady: Promise<void> | null = null;

/**
 * "Ensure on request" (same idea as ensureBudgetSchema in plan.ts): creates the tables and, only
 * the first time the settings row is created, seeds the default asset classes. Must run outside a
 * transaction (DDL commits implicitly). Memoized per process; retried on failure.
 * Keep the DDL in sync with database/migrations/investments_migration.sql and schema.sql.
 */
function ensureInvestmentsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS investment_classes (
          id VARCHAR(50) NOT NULL PRIMARY KEY,
          parent_id VARCHAR(50) NULL,
          name VARCHAR(100) NOT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          archived TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          CONSTRAINT fk_investment_class_parent FOREIGN KEY (parent_id) REFERENCES investment_classes(id) ON DELETE RESTRICT
        )`);
      await query(`
        CREATE TABLE IF NOT EXISTS investment_snapshots (
          id VARCHAR(50) NOT NULL PRIMARY KEY,
          month VARCHAR(7) NOT NULL,
          snapshot_date VARCHAR(10) NOT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          CONSTRAINT uq_investment_snapshot_month UNIQUE (month)
        )`);
      await query(`
        CREATE TABLE IF NOT EXISTS investment_snapshot_entries (
          snapshot_id VARCHAR(50) NOT NULL,
          class_id VARCHAR(50) NOT NULL,
          balance DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
          contributions DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
          withdrawals DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
          PRIMARY KEY (snapshot_id, class_id),
          CONSTRAINT fk_investment_entry_snapshot FOREIGN KEY (snapshot_id) REFERENCES investment_snapshots(id) ON DELETE CASCADE,
          CONSTRAINT fk_investment_entry_class FOREIGN KEY (class_id) REFERENCES investment_classes(id) ON DELETE RESTRICT
        )`);
      await query(`
        CREATE TABLE IF NOT EXISTS investment_settings (
          id TINYINT NOT NULL PRIMARY KEY,
          reminder_day INT NOT NULL DEFAULT 1,
          target_return_annual DECIMAL(7, 4) NULL,
          wealth_target_amount DECIMAL(14, 2) NULL,
          wealth_target_date VARCHAR(7) NULL,
          updated_at DATETIME NOT NULL
        )`);

      // Seed only when the singleton row is created now: deleting every class later must not reseed.
      const [result] = await getDbConnection().execute(
        'INSERT IGNORE INTO investment_settings (id, reminder_day, updated_at) VALUES (1, ?, ?)',
        [DEFAULT_REMINDER_DAY, nowDb()],
      );
      if ((result as any).affectedRows === 1) {
        const now = nowDb();
        for (const c of DEFAULT_INVESTMENT_CLASSES) {
          await query(
            'INSERT IGNORE INTO investment_classes (id, parent_id, name, sort_order, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
            [c.id, c.parentId, c.name, c.sortOrder, now, now],
          );
        }
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function loadClasses(): Promise<InvestmentClass[]> {
  const rows = await query('SELECT * FROM investment_classes ORDER BY sort_order ASC, created_at ASC');
  return rows.map(mapClassRow);
}

async function loadAll(): Promise<InvestmentsData> {
  const [classes, snapshotRows, entryRows, settingsRows] = await Promise.all([
    loadClasses(),
    query('SELECT * FROM investment_snapshots'),
    query('SELECT * FROM investment_snapshot_entries'),
    query('SELECT * FROM investment_settings WHERE id = 1'),
  ]);
  return {
    classes,
    snapshots: mapSnapshots(snapshotRows, entryRows),
    settings: mapSettingsRow(settingsRows[0]),
  };
}

function bad(res: Response, status: number, error: string) {
  return res.status(status).json({ error });
}

// GET /api/investments — everything the page needs in one payload.
export async function GET(_req: Request, res: Response) {
  try {
    await ensureInvestmentsSchema();
    return res.json(await loadAll());
  } catch (error) {
    console.error('Investments API Error (GET):', error);
    return bad(res, 500, 'Internal Server Error');
  }
}

async function saveClass(res: Response, data: unknown) {
  const parsed = validateClassInput(data);
  if (!parsed.ok) return bad(res, 400, parsed.error);
  const input = parsed.value;
  const classes = await loadClasses();
  const now = nowDb();

  if (!input.id) {
    if (input.parentId) {
      const parent = classes.find((c) => c.id === input.parentId);
      if (!parent) return bad(res, 400, 'Categoria-pai não encontrada');
      if (parent.parentId) return bad(res, 400, 'As classes têm no máximo 2 níveis');
      if (parent.archived) return bad(res, 400, 'A categoria-pai está arquivada');
      const used = await query('SELECT 1 FROM investment_snapshot_entries WHERE class_id = ? LIMIT 1', [parent.id]);
      if (used.length > 0) {
        return bad(res, 409, 'Esta classe já tem lançamentos e não pode ser dividida em subclasses');
      }
    }
    const siblings = classes.filter((c) => c.parentId === input.parentId);
    const sortOrder = input.sortOrder ?? (siblings.length ? Math.max(...siblings.map((c) => c.sortOrder)) + 1 : 0);
    const id = newId('inv-class');
    await query(
      'INSERT INTO investment_classes (id, parent_id, name, sort_order, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      [id, input.parentId, input.name, sortOrder, now, now],
    );
    return res.json({ success: true, data: { id, parentId: input.parentId, name: input.name, sortOrder, archived: false } });
  }

  // Update: only name, order and archived change (the tree position is fixed after creation).
  const current = classes.find((c) => c.id === input.id);
  if (!current) return bad(res, 404, 'Classe não encontrada');
  const archived = input.archived ?? current.archived;
  if (!archived && current.parentId) {
    const parent = classes.find((c) => c.id === current.parentId);
    if (parent?.archived) return bad(res, 400, 'Reative a categoria-pai antes de reativar esta classe');
  }
  const sortOrder = input.sortOrder ?? current.sortOrder;
  await query('UPDATE investment_classes SET name = ?, sort_order = ?, archived = ?, updated_at = ? WHERE id = ?', [
    input.name,
    sortOrder,
    archived ? 1 : 0,
    now,
    current.id,
  ]);
  // Archiving a parent archives its children, so no active leaf is left under an archived parent.
  if (archived && !current.archived) {
    await query('UPDATE investment_classes SET archived = 1, updated_at = ? WHERE parent_id = ?', [now, current.id]);
  }
  return res.json({ success: true, data: { ...current, name: input.name, sortOrder, archived } });
}

async function saveSnapshot(res: Response, data: unknown) {
  const parsed = validateSnapshotInput(data);
  if (!parsed.ok) return bad(res, 400, parsed.error);
  const input = parsed.value;

  const classes = await loadClasses();
  const sameMonth = await query('SELECT id FROM investment_snapshots WHERE month = ?', [input.month]);
  if (sameMonth.length > 0 && sameMonth[0].id !== input.id) {
    return bad(res, 409, 'Já existe um lançamento para este mês. Edite o existente.');
  }

  let existingClassIds = new Set<string>();
  if (input.id) {
    const found = await query('SELECT id FROM investment_snapshots WHERE id = ?', [input.id]);
    if (found.length === 0) return bad(res, 404, 'Lançamento não encontrado');
    const rows = await query('SELECT class_id FROM investment_snapshot_entries WHERE snapshot_id = ?', [input.id]);
    existingClassIds = new Set(rows.map((r) => r.class_id as string));
  }

  for (const entry of input.entries) {
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) return bad(res, 400, 'Classe do lançamento não encontrada');
    if (!isLeafClass(cls.id, classes)) return bad(res, 400, `"${cls.name}" é uma categoria: lance nas subclasses`);
    // An archived class may stay in a snapshot that already had it, but cannot enter a new one.
    if (cls.archived && !existingClassIds.has(cls.id)) return bad(res, 400, `A classe "${cls.name}" está arquivada`);
  }

  const id = input.id ?? newId('inv-snap');
  const now = nowDb();
  const connection: PoolConnection = await getDbConnection().getConnection();
  try {
    await connection.beginTransaction();
    if (input.id) {
      await connection.execute('UPDATE investment_snapshots SET month = ?, snapshot_date = ?, updated_at = ? WHERE id = ?', [
        input.month,
        input.date,
        now,
        id,
      ]);
      await connection.execute('DELETE FROM investment_snapshot_entries WHERE snapshot_id = ?', [id]);
    } else {
      await connection.execute(
        'INSERT INTO investment_snapshots (id, month, snapshot_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, input.month, input.date, now, now],
      );
    }
    for (const e of input.entries) {
      await connection.execute(
        'INSERT INTO investment_snapshot_entries (snapshot_id, class_id, balance, contributions, withdrawals) VALUES (?, ?, ?, ?, ?)',
        [id, e.classId, e.balance, e.contributions, e.withdrawals],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return res.json({ success: true, data: { id, month: input.month, date: input.date, entries: input.entries } });
}

async function saveSettings(res: Response, data: unknown) {
  const parsed = validateSettingsInput(data);
  if (!parsed.ok) return bad(res, 400, parsed.error);
  const s = parsed.value;
  await query(
    `INSERT INTO investment_settings (id, reminder_day, target_return_annual, wealth_target_amount, wealth_target_date, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reminder_day = VALUES(reminder_day), target_return_annual = VALUES(target_return_annual),
       wealth_target_amount = VALUES(wealth_target_amount), wealth_target_date = VALUES(wealth_target_date),
       updated_at = VALUES(updated_at)`,
    [s.reminderDay, s.targetReturnAnnual, s.wealthTargetAmount, s.wealthTargetDate, nowDb()],
  );
  return res.json({ success: true, data: s });
}

// POST /api/investments  body: { type: 'class' | 'snapshot' | 'settings', data }
export async function POST(req: Request, res: Response) {
  try {
    await ensureInvestmentsSchema();
    const { type, data } = req.body ?? {};
    if (type === 'class') return await saveClass(res, data);
    if (type === 'snapshot') return await saveSnapshot(res, data);
    if (type === 'settings') return await saveSettings(res, data);
    return bad(res, 400, 'Invalid type');
  } catch (error) {
    console.error('Investments API Error (POST):', error);
    return bad(res, 500, 'Internal Server Error');
  }
}

// DELETE /api/investments?type=class|snapshot&id=...
export async function DELETE(req: Request, res: Response) {
  try {
    await ensureInvestmentsSchema();
    const type = queryParam(req, 'type');
    const id = queryParam(req, 'id');
    if (!type || !id) return bad(res, 400, 'Missing type or id');

    if (type === 'snapshot') {
      // Entries go with it (ON DELETE CASCADE).
      await query('DELETE FROM investment_snapshots WHERE id = ?', [id]);
      return res.json({ success: true });
    }
    if (type === 'class') {
      const classes = await loadClasses();
      const cls = classes.find((c) => c.id === id);
      if (!cls) return bad(res, 404, 'Classe não encontrada');
      if (classes.some((c) => c.parentId === id)) {
        return bad(res, 409, 'Remova ou arquive as subclasses antes de excluir esta categoria');
      }
      const used = await query('SELECT 1 FROM investment_snapshot_entries WHERE class_id = ? LIMIT 1', [id]);
      if (used.length > 0) {
        // Has history: keep it for the charts, just hide it from new snapshots.
        await query('UPDATE investment_classes SET archived = 1, updated_at = ? WHERE id = ?', [nowDb(), id]);
        return res.json({ success: true, archived: true });
      }
      await query('DELETE FROM investment_classes WHERE id = ?', [id]);
      return res.json({ success: true, archived: false });
    }
    return bad(res, 400, 'Invalid type');
  } catch (error) {
    console.error('Investments API Error (DELETE):', error);
    return bad(res, 500, 'Internal Server Error');
  }
}

export const investmentsRouter = Router();
investmentsRouter.get('/', route(GET));
investmentsRouter.post('/', route(POST));
investmentsRouter.delete('/', route(DELETE));
investmentsRouter.all('/', methodNotAllowed(['GET', 'POST', 'DELETE']));
