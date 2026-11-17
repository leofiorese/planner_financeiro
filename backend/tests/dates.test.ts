/**
 * Regression test for the "+3h on every save" bug.
 * Run with: npm test (from backend/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDbDate } from '../src/db/dates';

/** Same rule mysql2 uses to read a DATETIME with `timezone: 'local'`. */
function readAsLocal(literal: string): Date {
  const [datePart, timePart] = literal.split(' ');
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, mi, s] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi, s);
}

test('save -> load round trip keeps the same instant', () => {
  const samples = [
    '2026-11-09T00:28:47.000Z',
    '2026-02-21T01:09:09.000Z', // crosses midnight when converted to UTC-3
    '2026-12-31T23:59:59.000Z', // crosses year boundary
    '2026-01-01T02:00:00.000Z',
  ];
  for (const iso of samples) {
    const literal = toDbDate(iso);
    assert.ok(literal, `expected a literal for ${iso}`);
    assert.match(literal, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(readAsLocal(literal).toISOString(), iso);
  }
});

test('repeated round trips never drift', () => {
  let iso = '2026-11-09T00:28:47.000Z';
  for (let i = 0; i < 10; i++) {
    iso = readAsLocal(toDbDate(iso)!).toISOString();
  }
  assert.equal(iso, '2026-11-09T00:28:47.000Z');
});

test('accepts Date objects and drops milliseconds', () => {
  const date = new Date('2026-05-10T12:34:56.789Z');
  assert.equal(readAsLocal(toDbDate(date)!).toISOString(), '2026-05-10T12:34:56.000Z');
});

test('empty and invalid values become null', () => {
  for (const value of [undefined, null, '', 0, 'not-a-date']) {
    assert.equal(toDbDate(value), null);
  }
});
