import { BadRequest } from '../errors.js';

export function parseQuery(url) {
  const params = {};
  for (const [key, value] of url.searchParams) params[key] = value;
  return params;
}

export function intParam(params, name, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback } = {}) {
  const raw = params[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequest(`Query parameter "${name}" must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function boolParam(params, name) {
  const raw = params[name];
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new BadRequest(`Query parameter "${name}" must be "true" or "false"`);
}
