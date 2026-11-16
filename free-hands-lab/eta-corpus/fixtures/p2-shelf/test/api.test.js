import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from '../support/harness.js';

let app;
before(async () => {
  app = await startApp();
});
after(async () => {
  await app.close();
});

test('GET /health', async () => {
  const res = await app.request('GET', '/health');
  assert.deepEqual(res, { status: 200, body: { ok: true } });
});

test('creates and fetches a book', async () => {
  const created = await app.request('POST', '/books', { title: 'Dune', author: 'Frank Herbert', year: 1965 });
  assert.equal(created.status, 201);
  const fetched = await app.request('GET', `/books/${created.body.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.title, 'Dune');
  assert.equal(fetched.body.onLoan, false);
});

test('returns 422 with field problems for an invalid book', async () => {
  const res = await app.request('POST', '/books', { author: 'Nobody' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'validation_failed');
});

test('returns 400 for malformed JSON', async () => {
  const res = await app.request('POST', '/books', '{not json');
  assert.equal(res.status, 400);
});

test('returns 404 for a missing book and 400 for a non-numeric id', async () => {
  assert.equal((await app.request('GET', '/books/9999')).status, 404);
  assert.equal((await app.request('GET', '/books/abc')).status, 400);
});

test('lists books with limit and reports the total', async () => {
  for (const title of ['One', 'Two', 'Three']) {
    await app.request('POST', '/books', { title, author: 'Lister' });
  }
  const res = await app.request('GET', '/books?author=Lister&limit=2');
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.total, 3);
});

test('rejects a limit above the maximum', async () => {
  assert.equal((await app.request('GET', '/books?limit=1000')).status, 400);
});

test('patches a book', async () => {
  const { body } = await app.request('POST', '/books', { title: 'Old', author: 'Patcher' });
  const res = await app.request('PATCH', `/books/${body.id}`, { title: 'New' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'New');
  assert.equal(res.body.author, 'Patcher');
});

test('deletes a book', async () => {
  const { body } = await app.request('POST', '/books', { title: 'Gone', author: 'Deleter' });
  assert.equal((await app.request('DELETE', `/books/${body.id}`)).status, 204);
  assert.equal((await app.request('GET', `/books/${body.id}`)).status, 404);
});

test('loan lifecycle: borrow, conflict, return, delete', async () => {
  const { body: book } = await app.request('POST', '/books', { title: 'Loaned', author: 'Lender' });
  const loan = await app.request('POST', `/books/${book.id}/loans`, { borrower: 'Ann', days: 10 });
  assert.equal(loan.status, 201);
  assert.equal(loan.body.dueOn, '2026-03-11');
  assert.equal((await app.request('POST', `/books/${book.id}/loans`, { borrower: 'Bob' })).status, 409);
  assert.equal((await app.request('DELETE', `/books/${book.id}`)).status, 409);
  const returned = await app.request('POST', `/loans/${loan.body.id}/return`);
  assert.equal(returned.status, 200);
  assert.equal(returned.body.returnedOn, '2026-03-01');
  assert.equal((await app.request('POST', `/loans/${loan.body.id}/return`)).status, 409);
});

test('available filter reflects active loans', async () => {
  const { body: book } = await app.request('POST', '/books', { title: 'Busy', author: 'Filterer' });
  await app.request('POST', `/books/${book.id}/loans`, { borrower: 'Cy' });
  const out = await app.request('GET', '/books?author=Filterer&available=false');
  assert.deepEqual(out.body.items.map((b) => b.title), ['Busy']);
});

test('overdue endpoint lists loans past their due date', async () => {
  const { body: book } = await app.request('POST', '/books', { title: 'Late', author: 'Overdue' });
  const loan = await app.request('POST', `/books/${book.id}/loans`, { borrower: 'Dee', days: 2 });
  app.setNow('2026-03-10T12:00:00Z');
  const res = await app.request('GET', '/loans/overdue');
  const mine = res.body.items.find((l) => l.id === loan.body.id);
  assert.equal(mine.daysOverdue, 7);
  app.setNow('2026-03-01T12:00:00Z');
});

test('unknown routes return a JSON 404', async () => {
  const res = await app.request('GET', '/nowhere');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'not_found');
});
