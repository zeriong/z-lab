import test from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/router.js';

const noop = () => {};

test('matches static and parameterized routes', () => {
  const router = new Router().get('/books', noop).get('/books/:id', noop);
  assert.deepEqual(router.match('GET', '/books').params, {});
  assert.deepEqual(router.match('GET', '/books/42').params, { id: '42' });
});

test('decodes URL-encoded parameters', () => {
  const router = new Router().get('/tags/:name', noop);
  assert.equal(router.match('GET', '/tags/sci%20fi').params.name, 'sci fi');
});

test('tolerates a trailing slash', () => {
  const router = new Router().get('/books', noop);
  assert.ok(router.match('GET', '/books/'));
});

test('unknown path is a 404', () => {
  const router = new Router().get('/books', noop);
  assert.throws(() => router.match('GET', '/nope'), (err) => err.status === 404);
});

test('known path with the wrong method is a 405', () => {
  const router = new Router().get('/books', noop);
  assert.throws(() => router.match('DELETE', '/books'), (err) => err.status === 405);
});
