import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';

const dune = { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', tags: ['scifi'] };

test('adds and fetches a book', () => {
  const store = new Store();
  const book = store.addBook(dune);
  assert.equal(book.id, 1);
  assert.equal(store.getBook(1).title, 'Dune');
});

test('rejects a duplicate ISBN', () => {
  const store = new Store();
  store.addBook(dune);
  assert.throws(() => store.addBook({ ...dune, title: 'Other' }), (err) => err.status === 409);
});

test('persists to disk and reloads', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shelf-')), 'data.json');
  const first = new Store({ file });
  first.addBook(dune);
  first.addLoan(1, { borrower: 'Ann', days: 7 });
  const second = new Store({ file });
  assert.equal(second.listBooks().length, 1);
  assert.equal(second.listLoans({ active: true }).length, 1);
  assert.equal(second.nextBookId, 2);
});

test('refuses to delete a book that is on loan', () => {
  const store = new Store();
  store.addBook(dune);
  store.addLoan(1, { borrower: 'Ann', days: 7 });
  assert.throws(() => store.deleteBook(1), (err) => err.status === 409);
});

test('filters by title query and tag', () => {
  const store = new Store();
  store.addBook(dune);
  store.addBook({ title: 'Emma', author: 'Jane Austen', tags: ['classic'] });
  assert.deepEqual(store.listBooks({ q: 'dun' }).map((b) => b.title), ['Dune']);
  assert.deepEqual(store.listBooks({ tag: 'CLASSIC' }).map((b) => b.title), ['Emma']);
  assert.deepEqual(store.listBooks({ author: 'Jane Austen' }).map((b) => b.title), ['Emma']);
});

test('a returned loan frees the book for a new loan', () => {
  const store = new Store();
  store.addBook(dune);
  const loan = store.addLoan(1, { borrower: 'Ann', days: 7 });
  store.returnLoan(loan.id);
  assert.ok(store.addLoan(1, { borrower: 'Bob', days: 7 }));
});
