/**
 * Pure mapping tests for the budget persistence (no database needed).
 * Run with: npm test (from backend/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    clampRolloverDay,
    mapBudgetFromRows,
    mapGoalBudgetFields,
    normalizeBudgetForSave,
    overrideToDb,
    parseAllocations,
    purchaseDateToDb,
    toBool,
} from '../src/domain/budgetMapping';

test('toBool understands TINYINT, boolean, string and Buffer', () => {
    assert.equal(toBool(1), true);
    assert.equal(toBool(0), false);
    assert.equal(toBool(true), true);
    assert.equal(toBool('1'), true);
    assert.equal(toBool(Buffer.from([1])), true);
    assert.equal(toBool(Buffer.from([0])), false);
    assert.equal(toBool(null), false);
    assert.equal(toBool(undefined), false);
});

test('parseAllocations accepts JSON string, parsed array, Buffer and garbage', () => {
    const arr = [{ goalId: 'g1', amount: '100.50' }, { goalId: 'g2', amount: 20 }];
    const expected = [{ goalId: 'g1', amount: 100.5 }, { goalId: 'g2', amount: 20 }];
    assert.deepEqual(parseAllocations(JSON.stringify(arr)), expected);
    assert.deepEqual(parseAllocations(arr), expected);
    assert.deepEqual(parseAllocations(Buffer.from(JSON.stringify(arr))), expected);
    assert.deepEqual(parseAllocations(null), []);
    assert.deepEqual(parseAllocations(''), []);
    assert.deepEqual(parseAllocations('not json'), []);
    assert.deepEqual(parseAllocations({ goalId: 'x' }), []);
    assert.deepEqual(parseAllocations([{ amount: 1 }, null]), []);
});

test('clampRolloverDay keeps 1..31', () => {
    assert.equal(clampRolloverDay(0), 1);
    assert.equal(clampRolloverDay(45), 31);
    assert.equal(clampRolloverDay('20'), 20);
    assert.equal(clampRolloverDay(undefined), 1);
    assert.equal(clampRolloverDay(15.9), 15);
});

test('mapBudgetFromRows returns undefined without a settings row', () => {
    assert.equal(mapBudgetFromRows(undefined, [], []), undefined);
});

test('mapBudgetFromRows converts DB rows into BudgetSettings', () => {
    const settings = { user_plan_id: 'p', enabled: 1, rollover_day: 20, enabled_at: '2026-11-20' };
    const history = [
        { id: 2, amount: '4500.00', effective_from: '2026-11-20' },
        { id: 1, amount: '5000.00', effective_from: '2026-10-20' },
    ];
    const closedAt = new Date(2026, 10, 20, 9, 30, 0);
    const closures = [
        {
            id: 1,
            period_start: '2026-10-20',
            period_end: '2026-11-19',
            status: 'confirmed',
            income: '6000.00',
            spent: '4380.00',
            budget_amount: '4500.00',
            allocations: '[{"goalId":"g1","amount":1200}]',
            closed_at: closedAt,
        },
        {
            id: 2,
            period_start: '2026-09-20',
            period_end: '2026-10-19',
            status: 'skipped',
            income: '0',
            spent: '0',
            budget_amount: '5000',
            allocations: null,
            closed_at: closedAt,
        },
    ];

    const budget = mapBudgetFromRows(settings, history, closures);
    assert.ok(budget);
    assert.equal(budget.enabled, true);
    assert.equal(budget.rolloverDay, 20);
    assert.equal(budget.enabledAt, '2026-11-20');
    assert.deepEqual(budget.amountHistory, [
        { amount: 5000, effectiveFrom: '2026-10-20' },
        { amount: 4500, effectiveFrom: '2026-11-20' },
    ]);
    assert.equal(budget.periodClosures.length, 2);
    assert.equal(budget.periodClosures[0].periodStart, '2026-09-20'); // sorted
    assert.equal(budget.periodClosures[0].status, 'skipped');
    assert.deepEqual(budget.periodClosures[0].allocations, []);
    assert.deepEqual(budget.periodClosures[1].allocations, [{ goalId: 'g1', amount: 1200 }]);
    assert.equal(budget.periodClosures[1].spent, 4380);
    assert.equal(budget.periodClosures[1].closedAt, closedAt.toISOString());
});

test('normalizeBudgetForSave sanitizes and de-duplicates', () => {
    assert.equal(normalizeBudgetForSave(undefined), undefined);
    assert.equal(normalizeBudgetForSave(null), undefined);

    const out = normalizeBudgetForSave({
        enabled: true,
        rolloverDay: 99,
        enabledAt: '2026-11-20',
        amountHistory: [
            { amount: 4500, effectiveFrom: '2026-11-20' },
            { amount: 5000, effectiveFrom: '2026-10-20' },
            { amount: 4400, effectiveFrom: '2026-11-20' }, // duplicate date: last wins
        ],
        periodClosures: [
            {
                periodStart: '2026-10-20',
                periodEnd: '2026-11-19',
                status: 'skipped',
                income: 1,
                spent: 2,
                budgetAmount: 3,
                allocations: [{ goalId: 'g1', amount: 10 }],
                closedAt: '2026-11-20T12:00:00.000Z',
            },
            {
                periodStart: '2026-10-20', // duplicate period: last wins
                periodEnd: '2026-11-19',
                status: 'confirmed',
                income: 6000,
                spent: 4380,
                budgetAmount: 4500,
                allocations: [{ goalId: 'g1', amount: 1200 }],
                closedAt: '2026-11-20T13:00:00.000Z',
            },
        ],
    });
    assert.ok(out);
    assert.equal(out.rolloverDay, 31);
    assert.deepEqual(out.amountHistory, [
        { amount: 5000, effectiveFrom: '2026-10-20' },
        { amount: 4400, effectiveFrom: '2026-11-20' },
    ]);
    assert.equal(out.periodClosures.length, 1);
    assert.equal(out.periodClosures[0].status, 'confirmed');
    assert.deepEqual(out.periodClosures[0].allocations, [{ goalId: 'g1', amount: 1200 }]);
});

test('normalizeBudgetForSave drops allocations of skipped closures', () => {
    const out = normalizeBudgetForSave({
        enabled: false,
        rolloverDay: 1,
        enabledAt: '',
        amountHistory: [],
        periodClosures: [
            {
                periodStart: '2026-10-01',
                periodEnd: '2026-10-31',
                status: 'skipped',
                income: 0,
                spent: 0,
                budgetAmount: 0,
                allocations: [{ goalId: 'g1', amount: 10 }],
                closedAt: '2026-11-01T00:00:00.000Z',
            },
        ],
    });
    assert.deepEqual(out?.periodClosures[0].allocations, []);
});

test('mapGoalBudgetFields normalizes goal columns', () => {
    assert.deepEqual(mapGoalBudgetFields({ reserveFromBudget: true, budgetReserveOverride: '412.00' }), {
        reserveFromBudget: true,
        budgetReserveOverride: 412,
    });
    assert.deepEqual(mapGoalBudgetFields({ reserveFromBudget: 0, budgetReserveOverride: null }), {
        reserveFromBudget: false,
        budgetReserveOverride: null,
    });
    assert.deepEqual(mapGoalBudgetFields({}), { reserveFromBudget: false, budgetReserveOverride: null });
});

test('overrideToDb / purchaseDateToDb', () => {
    assert.equal(overrideToDb(undefined), null);
    assert.equal(overrideToDb(null), null);
    assert.equal(overrideToDb(-5), null);
    assert.equal(overrideToDb(0), 0);
    assert.equal(overrideToDb('250.5'), 250.5);
    assert.equal(purchaseDateToDb(undefined), null);
    assert.equal(purchaseDateToDb(''), null);
    assert.equal(purchaseDateToDb('2026-11-20'), '2026-11-20');
    assert.equal(purchaseDateToDb('2026-11-20T10:00:00.000Z'), '2026-11-20');
});
