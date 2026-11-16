import { ValidationError } from './errors.js';

const ISBN_PATTERN = /^\d{9}[\dX]$|^\d{13}$/;
const MAX_TITLE = 200;

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

export function validateBook(input, { partial = false } = {}) {
  const problems = [];
  const clean = {};

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError([{ field: 'body', message: 'must be a JSON object' }]);
  }

  if (!partial || input.title) {
    if (isBlank(input.title)) problems.push({ field: 'title', message: 'is required' });
    else if (input.title.length > MAX_TITLE) problems.push({ field: 'title', message: `must be at most ${MAX_TITLE} characters` });
    else clean.title = input.title.trim();
  }

  if (!partial || input.author !== undefined) {
    if (isBlank(input.author)) problems.push({ field: 'author', message: 'is required' });
    else clean.author = input.author.trim();
  }

  if (input.year !== undefined) {
    const year = input.year;
    if (!Number.isInteger(year) || year < 1400 || year > 2100) {
      problems.push({ field: 'year', message: 'must be an integer between 1400 and 2100' });
    } else clean.year = year;
  }

  if (input.isbn !== undefined) {
    const isbn = typeof input.isbn === 'string' ? input.isbn.replace(/-/g, '') : '';
    if (!ISBN_PATTERN.test(isbn)) problems.push({ field: 'isbn', message: 'must be a valid ISBN-10 or ISBN-13' });
    else clean.isbn = isbn;
  }

  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => isBlank(t))) {
      problems.push({ field: 'tags', message: 'must be an array of non-empty strings' });
    } else clean.tags = input.tags.map((t) => t.trim().toLowerCase());
  }

  if (problems.length > 0) throw new ValidationError(problems);
  return clean;
}

export function validateLoan(input) {
  const problems = [];
  const clean = {};
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError([{ field: 'body', message: 'must be a JSON object' }]);
  }
  if (isBlank(input.borrower)) problems.push({ field: 'borrower', message: 'is required' });
  else clean.borrower = input.borrower.trim();

  if (input.days === undefined) clean.days = 14;
  else if (!Number.isInteger(input.days) || input.days < 0 || input.days > 60) {
    problems.push({ field: 'days', message: 'must be an integer between 0 and 60' });
  } else clean.days = input.days;

  if (problems.length > 0) throw new ValidationError(problems);
  return clean;
}
