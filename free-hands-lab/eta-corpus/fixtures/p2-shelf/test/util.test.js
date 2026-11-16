import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, isOverdue } from '../src/util/dates.js';
import { paginate } from '../src/util/pagination.js';
import { intParam, boolParam } from '../src/util/query.js';

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-01-30', 5), '2026-02-04');
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
});

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-11'), 10);
});

test('isOverdue is true for past due dates and false for future ones', () => {
  assert.equal(isOverdue('2026-03-01', '2026-03-10'), true);
  assert.equal(isOverdue('2026-03-20', '2026-03-10'), false);
});

test('paginate returns the first page and totals', () => {
  const page = paginate([1, 2, 3, 4, 5], { limit: 2 });
  assert.deepEqual(page.items, [1, 2]);
  assert.equal(page.total, 5);
});

test('intParam applies the fallback and rejects garbage', () => {
  assert.equal(intParam({}, 'limit', { fallback: 20 }), 20);
  assert.equal(intParam({ limit: '5' }, 'limit'), 5);
  assert.throws(() => intParam({ limit: 'abc' }, 'limit'), (err) => err.status === 400);
});

test('boolParam parses true and false only', () => {
  assert.equal(boolParam({ active: 'true' }, 'active'), true);
  assert.equal(boolParam({}, 'active'), undefined);
  assert.throws(() => boolParam({ active: 'yes' }, 'active'), (err) => err.status === 400);
});
