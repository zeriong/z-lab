import { BadRequest, PayloadTooLarge } from '../errors.js';

const DEFAULT_LIMIT = 64 * 1024;

export async function readJsonBody(req, limit = DEFAULT_LIMIT) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new PayloadTooLarge(limit);
    chunks.push(chunk);
  }
  if (size === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequest('Request body is not valid JSON');
  }
}

export function sendJson(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}
