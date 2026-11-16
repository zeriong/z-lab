import { createServer, listen } from '../src/server.js';
import { Store } from '../src/store.js';

export async function startApp({ file = null, start = '2026-03-01T12:00:00Z' } = {}) {
  let now = new Date(start);
  const clock = () => now;
  const store = new Store({ file, clock });
  const server = createServer({ store });
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;

  async function request(method, path, body) {
    const init = { method, headers: {} };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      init.headers['content-type'] = 'application/json';
    }
    const res = await fetch(base + path, init);
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  }

  return {
    base,
    store,
    request,
    setNow(value) {
      now = new Date(value);
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
