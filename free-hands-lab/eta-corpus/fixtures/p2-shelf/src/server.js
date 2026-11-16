import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { Router } from './router.js';
import { Store } from './store.js';
import { toErrorBody } from './errors.js';
import { parseQuery } from './util/query.js';
import { sendJson } from './util/http.js';
import * as books from './handlers/books.js';
import * as loans from './handlers/loans.js';

export function buildRouter() {
  const router = new Router();
  router.get('/books', books.listBooks);
  router.post('/books', books.createBook);
  router.get('/books/:id', books.getBook);
  router.patch('/books/:id', books.updateBook);
  router.delete('/books/:id', books.deleteBook);
  router.post('/books/:id/loans', loans.createLoan);
  router.get('/loans', loans.listLoans);
  router.get('/loans/overdue', loans.overdueLoans);
  router.post('/loans/:id/return', loans.returnLoan);
  router.get('/health', () => ({ status: 200, body: { ok: true } }));
  return router;
}

export function createServer({ store = new Store(), router = buildRouter() } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const { handler, params } = router.match(req.method, url.pathname);
      const result = await handler({ store, req, params, query: parseQuery(url) });
      sendJson(res, result.status, result.body);
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) console.error(err);
      sendJson(res, status, toErrorBody(err));
    }
  });
}

export function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const store = new Store({ file: process.env.SHELF_DATA ?? 'shelf-data.json' });
  const server = createServer({ store });
  listen(server, port).then((p) => console.log(`shelf listening on http://127.0.0.1:${p}`));
}
