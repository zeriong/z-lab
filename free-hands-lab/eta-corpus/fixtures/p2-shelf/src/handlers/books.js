import { BadRequest, NotFound } from '../errors.js';
import { validateBook } from '../validate.js';
import { readJsonBody } from '../util/http.js';
import { boolParam, intParam } from '../util/query.js';
import { DEFAULT_LIMIT, MAX_LIMIT, paginate } from '../util/pagination.js';

export function listBooks({ store, query }) {
  const limit = intParam(query, 'limit', { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
  const offset = intParam(query, 'offset', { min: 0, fallback: 0 });
  const available = boolParam(query, 'available');
  let books = store.listBooks({ author: query.author, q: query.q, tag: query.tag });
  if (available !== undefined) {
    books = books.filter((b) => (store.activeLoanFor(b.id) === null) === available);
  }
  return { status: 200, body: paginate(books, { limit, offset }) };
}

export async function createBook({ store, req }) {
  const input = await readJsonBody(req);
  const book = store.addBook(validateBook(input));
  return { status: 201, body: book };
}

export function getBook({ store, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new BadRequest('Book id must be an integer');
  const book = store.getBook(id);
  if (!book) throw new NotFound('Book');
  return { status: 200, body: { ...book, onLoan: store.activeLoanFor(id) !== null } };
}

export async function updateBook({ store, params, req }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new BadRequest('Book id must be an integer');
  if (!store.getBook(id)) throw new NotFound('Book');
  const input = await readJsonBody(req);
  const book = store.updateBook(id, validateBook(input, { partial: true }));
  return { status: 200, body: book };
}

export function deleteBook({ store, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new BadRequest('Book id must be an integer');
  store.deleteBook(id);
  return { status: 204 };
}
