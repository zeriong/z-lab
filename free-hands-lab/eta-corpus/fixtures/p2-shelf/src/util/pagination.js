export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function paginate(items, { limit = DEFAULT_LIMIT, offset = 0 } = {}) {
  const page = items.slice(offset, limit);
  return {
    items: page,
    total: items.length,
    limit,
    offset,
  };
}
