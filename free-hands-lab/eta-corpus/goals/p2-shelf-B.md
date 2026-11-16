# p2-shelf goal B

## Prompt

Complete these five tasks in this repository. 1) Investigate how the data file is written and write the answer to `notes/persistence-risks.md`: a top-level heading `# Persistence risks`, a section `## Writes` listing every method in `src/store.js` that causes the file to be written, a section `## Scenarios` with a table whose columns are Scenario, Current behavior, Risk and Suggested change covering at least a crash during a write, a corrupt or empty data file at start-up, two requests arriving at the same time, and a very large collection, and a section `## Recommendation` of at most five lines. 2) Add a `sort` query parameter to `GET /books` that accepts `title`, `author`, `year`, `-title`, `-author` and `-year` (a leading minus means descending), keeps ordering by id when absent, puts books without a year last for both `year` and `-year`, and answers 400 with the usual error body for any other value; sorting must happen before paging; document it in the README and add tests. 3) Users report that a book lent for zero days shows up as overdue the moment it is lent: after `POST /books/1/loans` with `{ "borrower": "Ann", "days": 0 }`, `GET /loans/overdue` already lists that loan, although the README says a loan is overdue only after its due date has passed. Make the behavior match the README and add a regression test. 4) Move the reading and writing of the data file out of `src/store.js` into a new module `src/persistence.js` that exports `loadSnapshot(file)` and `saveSnapshot(file, data)`, make `Store` use it, and keep every existing test passing unedited. 5) Add a JSDoc comment to the `Store` class, its constructor and every one of its methods in `src/store.js`, with `@param` and `@returns` tags and a mention of any error it throws.

## Checks

1. `notes/persistence-risks.md` exists with `# Persistence risks`, `## Writes` naming addBook, updateBook, deleteBook, addLoan, returnLoan (the methods that call save), `## Scenarios` with a four-column table and at least four rows, and `## Recommendation` (at most five lines).
2. `GET /books?sort=-year` and `sort=title` return correctly ordered items (null years last); `sort=bogus` returns 400; README mentions `sort`; new tests exist; `node --test` passes.
3. With a loan created with `days: 0`, `GET /loans/overdue` returns an empty list on the day of lending and lists it the next day; a new test (using the harness `setNow`) covers it; `node --test` passes.
4. `src/persistence.js` exists and exports both functions; `grep -n "node:fs" src/store.js` finds nothing; existing tests are unchanged; `node --test` passes.
5. `grep -c "/\*\*" src/store.js` is at least 14 (class, constructor and 12 methods); each block has `@param` and `@returns` where applicable; `node --test` passes.

## Categories

| Task | Category |
|---|---|
| 1 | research |
| 2 | feature |
| 3 | fix |
| 4 | refactor |
| 5 | docs |
