import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBook, validateLoan } from '../src/validate.js';

test('accepts a minimal book and trims strings', () => {
  const clean = validateBook({ title: '  Dune ', author: 'Frank Herbert' });
  assert.deepEqual(clean, { title: 'Dune', author: 'Frank Herbert' });
});

test('rejects a missing title with a field problem', () => {
  assert.throws(
    () => validateBook({ author: 'X' }),
    (err) => err.status === 422 && err.details.some((p) => p.field === 'title'),
  );
});

test('rejects an out-of-range year', () => {
  assert.throws(() => validateBook({ title: 'T', author: 'A', year: 1200 }), (err) => err.status === 422);
});

test('normalizes ISBN dashes and rejects bad ISBNs', () => {
  assert.equal(validateBook({ title: 'T', author: 'A', isbn: '978-0-441-17271-9' }).isbn, '9780441172719');
  assert.throws(() => validateBook({ title: 'T', author: 'A', isbn: '12345' }), (err) => err.status === 422);
});

test('lowercases tags', () => {
  assert.deepEqual(validateBook({ title: 'T', author: 'A', tags: ['SciFi', ' Classic '] }).tags, ['scifi', 'classic']);
});

test('partial validation only checks supplied fields', () => {
  assert.deepEqual(validateBook({ year: 1999 }, { partial: true }), { year: 1999 });
});

test('loan defaults to 14 days and requires a borrower', () => {
  assert.deepEqual(validateLoan({ borrower: ' Ann ' }), { borrower: 'Ann', days: 14 });
  assert.throws(() => validateLoan({}), (err) => err.status === 422);
});
