/**
 * Pure mapping/validation tests for the Investimentos module (no database needed).
 * Run with: npm test (from backend/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INVESTMENT_CLASSES,
  isLeafClass,
  mapClassRow,
  mapSettingsRow,
  mapSnapshots,
  validateClassInput,
  validateSettingsInput,
  validateSnapshotInput,
} from '../src/domain/investmentMapping';

test('seed: 2 níveis, ids únicos, pais existentes e nomes pedidos', () => {
  const ids = new Set(DEFAULT_INVESTMENT_CLASSES.map((c) => c.id));
  assert.equal(ids.size, DEFAULT_INVESTMENT_CLASSES.length);
  for (const c of DEFAULT_INVESTMENT_CLASSES) {
    if (c.parentId) {
      const parent = DEFAULT_INVESTMENT_CLASSES.find((p) => p.id === c.parentId);
      assert.ok(parent, `pai de ${c.id}`);
      assert.equal(parent.parentId, null, 'no máximo 2 níveis');
    }
  }
  const names = DEFAULT_INVESTMENT_CLASSES.map((c) => c.name);
  for (const n of ['Renda Fixa', 'Ações', 'Fundos Imobiliários (Real Estate)', 'Alternativos', 'Ouro', 'Criptomoedas', 'Previdência Privada']) {
    assert.ok(names.includes(n), n);
  }
});

test('isLeafClass: pai não é folha, filho e classe sem filhos são', () => {
  assert.equal(isLeafClass('inv-acoes', DEFAULT_INVESTMENT_CLASSES), false);
  assert.equal(isLeafClass('inv-acoes-nacional', DEFAULT_INVESTMENT_CLASSES), true);
  assert.equal(isLeafClass('inv-fiis', DEFAULT_INVESTMENT_CLASSES), true);
});

test('mapClassRow converte archived e sort_order', () => {
  assert.deepEqual(mapClassRow({ id: 'a', parent_id: null, name: 'A', sort_order: '2', archived: 1 }), {
    id: 'a',
    parentId: null,
    name: 'A',
    sortOrder: 2,
    archived: true,
  });
  assert.equal(mapClassRow({ id: 'b', parent_id: 'a', name: 'B', sort_order: 0, archived: 0 }).archived, false);
});

test('mapSnapshots agrupa entradas, converte DECIMAL e ordena do mais novo', () => {
  const snaps = mapSnapshots(
    [
      { id: 's1', month: '2026-10', snapshot_date: '2026-10-05' },
      { id: 's2', month: '2026-11', snapshot_date: '2026-11-05' },
    ],
    [
      { snapshot_id: 's1', class_id: 'c1', balance: '1000.50', contributions: '100.00', withdrawals: '0.00' },
      { snapshot_id: 's2', class_id: 'c1', balance: '1200.00', contributions: '0.00', withdrawals: '50.25' },
    ],
  );
  assert.deepEqual(snaps.map((s) => s.month), ['2026-11', '2026-10']);
  assert.deepEqual(snaps[1].entries[0], { classId: 'c1', balance: 1000.5, contributions: 100, withdrawals: 0 });
  assert.equal(snaps[0].entries[0].withdrawals, 50.25);
});

test('mapSettingsRow: padrão sem linha e conversão de DECIMAL', () => {
  assert.deepEqual(mapSettingsRow(undefined), {
    reminderDay: 1,
    targetReturnAnnual: null,
    wealthTargetAmount: null,
    wealthTargetDate: null,
  });
  assert.deepEqual(
    mapSettingsRow({ reminder_day: 7, target_return_annual: '12.5000', wealth_target_amount: '1000000.00', wealth_target_date: '2035-12' }),
    { reminderDay: 7, targetReturnAnnual: 12.5, wealthTargetAmount: 1_000_000, wealthTargetDate: '2035-12' },
  );
});

test('validateClassInput: nome obrigatório e aparado', () => {
  assert.equal(validateClassInput({ name: '   ' }).ok, false);
  assert.equal(validateClassInput(null).ok, false);
  const r = validateClassInput({ name: '  Tesouro  ', parentId: 'inv-renda-fixa' });
  assert.ok(r.ok);
  assert.equal(r.value.name, 'Tesouro');
  assert.equal(r.value.parentId, 'inv-renda-fixa');
  assert.equal(validateClassInput({ name: 'x', archived: 'sim' }).ok, false);
});

const validSnapshot = {
  month: '2026-11',
  date: '2026-11-05',
  entries: [{ classId: 'c1', balance: 1000, contributions: 100, withdrawals: 0 }],
};

test('validateSnapshotInput: caso válido arredonda para centavos', () => {
  const r = validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: 10.005, contributions: 0, withdrawals: 0 }] });
  assert.ok(r.ok);
  assert.equal(r.value.entries[0].balance, 10.01);
});

test('validateSnapshotInput: aportes/resgates ausentes valem 0', () => {
  const r = validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: 5 }] });
  assert.ok(r.ok);
  assert.equal(r.value.entries[0].contributions, 0);
  assert.equal(r.value.entries[0].withdrawals, 0);
});

test('validateSnapshotInput: rejeita mês, data e valores inválidos', () => {
  assert.equal(validateSnapshotInput({ ...validSnapshot, month: '2026-13' }).ok, false);
  assert.equal(validateSnapshotInput({ ...validSnapshot, date: '2026-10-30' }).ok, false, 'data fora do mês');
  assert.equal(validateSnapshotInput({ ...validSnapshot, month: '2026-02', date: '2026-02-30' }).ok, false, 'dia inexistente');
  assert.equal(validateSnapshotInput({ ...validSnapshot, entries: [] }).ok, false);
  assert.equal(validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: -1 }] }).ok, false);
  assert.equal(validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: '10' }] }).ok, false);
  assert.equal(validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: NaN }] }).ok, false);
  assert.equal(
    validateSnapshotInput({ ...validSnapshot, entries: [{ classId: 'c1', balance: 1 }, { classId: 'c1', balance: 2 }] }).ok,
    false,
    'classe repetida',
  );
});

test('validateSettingsInput: dia 1–31 e metas opcionais', () => {
  const ok = validateSettingsInput({ reminderDay: 31, targetReturnAnnual: 12, wealthTargetAmount: null, wealthTargetDate: null });
  assert.ok(ok.ok);
  assert.equal(ok.value.reminderDay, 31);
  assert.equal(validateSettingsInput({ reminderDay: 0 }).ok, false);
  assert.equal(validateSettingsInput({ reminderDay: 32 }).ok, false);
  assert.equal(validateSettingsInput({ reminderDay: 1.5 }).ok, false);
  assert.equal(validateSettingsInput({ reminderDay: 5, targetReturnAnnual: 5000 }).ok, false);
  assert.equal(validateSettingsInput({ reminderDay: 5, wealthTargetAmount: 0 }).ok, false);
  assert.equal(validateSettingsInput({ reminderDay: 5, wealthTargetDate: '2035-13' }).ok, false);
  const minimal = validateSettingsInput({ reminderDay: 5 });
  assert.ok(minimal.ok);
  assert.equal(minimal.value.targetReturnAnnual, null);
});
