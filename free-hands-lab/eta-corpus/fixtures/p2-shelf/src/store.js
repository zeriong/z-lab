import fs from 'node:fs';
import { Conflict, NotFound } from './errors.js';
import { addDays, today } from './util/dates.js';

export class Store {
  constructor({ file = null, clock = () => new Date() } = {}) {
    this.file = file;
    this.clock = clock;
    this.books = new Map();
    this.loans = new Map();
    this.nextBookId = 1;
    this.nextLoanId = 1;
    if (file && fs.existsSync(file)) this.load();
  }

  load() {
    const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    this.books = new Map(data.books.map((b) => [b.id, b]));
    this.loans = new Map(data.loans.map((l) => [l.id, l]));
    this.nextBookId = data.nextBookId;
    this.nextLoanId = data.nextLoanId;
  }

  save() {
    if (!this.file) return;
    const data = {
      nextBookId: this.nextBookId,
      nextLoanId: this.nextLoanId,
      books: [...this.books.values()],
      loans: [...this.loans.values()],
    };
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  // ---- books ----

  addBook(data) {
    if (data.isbn && [...this.books.values()].some((b) => b.isbn === data.isbn)) {
      throw new Conflict(`A book with ISBN ${data.isbn} already exists`);
    }
    const book = {
      id: this.nextBookId++,
      title: data.title,
      author: data.author,
      year: data.year ?? null,
      isbn: data.isbn ?? null,
      tags: data.tags ?? [],
      createdAt: this.clock().toISOString(),
    };
    this.books.set(book.id, book);
    this.save();
    return book;
  }

  getBook(id) {
    return this.books.get(id) ?? null;
  }

  listBooks({ author, q, tag } = {}) {
    let books = [...this.books.values()];
    if (author) books = books.filter((b) => b.author.includes(author));
    if (q) {
      const needle = q.toLowerCase();
      books = books.filter((b) => b.title.toLowerCase().includes(needle));
    }
    if (tag) books = books.filter((b) => b.tags.includes(tag.toLowerCase()));
    return books.sort((a, b) => a.id - b.id);
  }

  updateBook(id, patch) {
    const book = this.getBook(id);
    if (!book) throw new NotFound('Book');
    if (patch.isbn && patch.isbn !== book.isbn) {
      const clash = [...this.books.values()].some((b) => b.id !== id && b.isbn === patch.isbn);
      if (clash) throw new Conflict(`A book with ISBN ${patch.isbn} already exists`);
    }
    Object.assign(book, patch);
    this.save();
    return book;
  }

  deleteBook(id) {
    if (!this.books.has(id)) throw new NotFound('Book');
    if (this.activeLoanFor(id)) throw new Conflict('Book is currently on loan');
    this.books.delete(id);
    this.save();
  }

  // ---- loans ----

  activeLoanFor(bookId) {
    return [...this.loans.values()].find((l) => l.bookId === bookId && l.returnedOn === null) ?? null;
  }

  addLoan(bookId, { borrower, days }) {
    if (!this.books.has(bookId)) throw new NotFound('Book');
    if (this.activeLoanFor(bookId)) throw new Conflict('Book is already on loan');
    const loanedOn = today(this.clock);
    const loan = {
      id: this.nextLoanId++,
      bookId,
      borrower,
      loanedOn,
      dueOn: addDays(loanedOn, days),
      returnedOn: null,
    };
    this.loans.set(loan.id, loan);
    this.save();
    return loan;
  }

  getLoan(id) {
    return this.loans.get(id) ?? null;
  }

  returnLoan(id) {
    const loan = this.getLoan(id);
    if (!loan) throw new NotFound('Loan');
    if (loan.returnedOn !== null) throw new Conflict('Loan was already returned');
    loan.returnedOn = today(this.clock);
    this.save();
    return loan;
  }

  listLoans({ bookId, active } = {}) {
    let loans = [...this.loans.values()];
    if (bookId !== undefined) loans = loans.filter((l) => l.bookId === bookId);
    if (active === true) loans = loans.filter((l) => l.returnedOn === null);
    if (active === false) loans = loans.filter((l) => l.returnedOn !== null);
    return loans.sort((a, b) => a.id - b.id);
  }
}
