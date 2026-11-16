import { BadRequest, NotFound } from '../errors.js';
import { validateLoan } from '../validate.js';
import { readJsonBody } from '../util/http.js';
import { boolParam, intParam } from '../util/query.js';
import { DEFAULT_LIMIT, MAX_LIMIT, paginate } from '../util/pagination.js';
import { daysBetween, isOverdue, today } from '../util/dates.js';

export async function createLoan({ store, params, req }) {
  const bookId = Number(params.id);
  if (!Number.isInteger(bookId)) throw new BadRequest('Book id must be an integer');
  if (!store.getBook(bookId)) throw new NotFound('Book');
  const input = await readJsonBody(req);
  const loan = store.addLoan(bookId, validateLoan(input));
  return { status: 201, body: loan };
}

export function returnLoan({ store, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new BadRequest('Loan id must be an integer');
  if (!store.getLoan(id)) throw new NotFound('Loan');
  const loan = store.returnLoan(id);
  return { status: 200, body: loan };
}

export function listLoans({ store, query }) {
  const limit = intParam(query, 'limit', { min: 1, max: MAX_LIMIT, fallback: DEFAULT_LIMIT });
  const offset = intParam(query, 'offset', { min: 0, fallback: 0 });
  const bookId = intParam(query, 'bookId', { min: 1 });
  const active = boolParam(query, 'active');
  const loans = store.listLoans({ bookId, active });
  return { status: 200, body: paginate(loans, { limit, offset }) };
}

export function overdueLoans({ store }) {
  const now = today(store.clock);
  const overdue = store
    .listLoans({ active: true })
    .filter((loan) => isOverdue(loan.dueOn, now))
    .map((loan) => ({ ...loan, daysOverdue: daysBetween(loan.dueOn, now) }));
  return { status: 200, body: { items: overdue, total: overdue.length } };
}
