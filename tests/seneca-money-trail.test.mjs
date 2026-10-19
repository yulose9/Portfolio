import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMoneyTrail, moneyDayChange, moneyStory } from '../lib/seneca/utils/moneyTrail.ts';
const now = new Date('2026-10-07T06:00:00Z');
const transaction = (id, type, amount, date = '2026-10-02T12:00:00Z', note = null) => ({ id, type, amount, date, note });
test('money story qualifies incomplete records and categorizes outflows in cents', () => {
  const story = records => moneyStory(buildMoneyTrail([], records, 'all', now));
  assert.match(story([]).subtitle, /starts/);
  assert.equal(story([transaction(1, 'withdrawal', 20)]).spentPercent, null);
  assert.match(story([transaction(1, 'withdrawal', 20)]).subtitle, /Add income/);
  assert.match(story([transaction(1, 'deposit', 20)]).subtitle, /No outflows/);
  const records = [transaction(1, 'deposit', 10), { ...transaction(2, 'withdrawal', 10.1), category: 'Food' }, { ...transaction(3, 'payment', .2), category: 'Food' }];
  const result = story(records);
  assert.match(result.subtitle, /spending is ahead/);
  assert.equal(result.categories[0].amount, 10.3);
  assert.equal(result.categories[0].share, 1);
  assert.ok(Math.abs(result.spentPercent - 103) < .00001);
  assert.match(story([transaction(1, 'deposit', 20), transaction(2, 'withdrawal', 20)]).subtitle, /in balance/);
  assert.match(story([transaction(1, 'deposit', 30), transaction(2, 'withdrawal', 20)]).subtitle, /income is ahead/);
});
test('money ribbon conserves cents without counting deposits twice, includes debt payments, and ignores balance edits', () => {
  const trail = buildMoneyTrail([{ id: 'bank', amount: 1500.25 }], [transaction(1, 'deposit', 2500), transaction(2, 'withdrawal', 200.10), transaction(3, 'payment', 300.15), transaction(4, 'deposit', 999, undefined, 'Balance Adjustment')], 'all', now);
  assert.equal(trail.held, 1500.25); assert.equal(trail.incoming, 2500); assert.equal(trail.outgoing, 500.25);
  assert.equal(trail.tracked, 2000.50); assert.equal(trail.net, 1999.75);
  assert.equal(trail.slices.length, 3); assert.equal(trail.slices[0].start, 0); assert.equal(trail.slices.at(-1).end, 1);
  assert.deepEqual(trail.points.map(p => p.value), [2500, 2299.90, 1999.75]);
});
test('period filtering follows Philippine date boundaries and preserves current holdings', () => {
  const trail = buildMoneyTrail([{ id: 'bank', amount: 100 }], [transaction(1, 'deposit', 20, '2026-09-30T16:00:00Z'), transaction(2, 'withdrawal', 5, '2026-09-30T15:59:00Z'), transaction(3, 'deposit', 40, '2026-11-01T00:00:00Z')], 'month', now);
  assert.equal(trail.incoming, 20); assert.equal(trail.outgoing, 0); assert.equal(trail.held, 100);
});
test('empty records, invalid data, and negative recorded movement stay honest', () => {
  const empty = buildMoneyTrail([], [], 'all', now); assert.equal(empty.tracked, 0); assert.deepEqual(empty.slices, []);
  const trail = buildMoneyTrail([{ id: 'invalid', amount: NaN }], [transaction(1, 'withdrawal', 20), transaction(2, 'deposit', -5), transaction(3, 'deposit', 10, 'broken'), transaction(4, 'transfer', 99)], 'all', now);
  assert.equal(trail.invalid, 3); assert.equal(trail.net, -20); assert.equal(trail.outgoing, 20); assert.equal(trail.incoming, 0);
});
test('daily comparisons use Manila dates, count debt payments, and exclude balance adjustments', () => {
  const changes = moneyDayChange([
    transaction(1, 'deposit', 100, '2026-10-06T15:59:00Z'),
    transaction(2, 'withdrawal', 20, '2026-10-06T12:00:00Z'),
    transaction(3, 'deposit', 250, '2026-10-06T16:00:00Z'),
    transaction(4, 'payment', 30, '2026-10-07T01:00:00Z'),
    transaction(5, 'deposit', 999, '2026-10-07T01:00:00Z', 'Balance Adjustment'),
  ], now);
  assert.deepEqual(changes, { net: 220, income: 150, spending: 10 });
  assert.deepEqual(moneyDayChange([], now), { net: 0, income: 0, spending: 0 });
});
