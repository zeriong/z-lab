# p2-shelf goal C

## Prompt

Complete these five tasks in this repository. 1) Rename the store methods `addLoan` to `createLoan` and `returnLoan` to `closeLoan` everywhere they are defined or called (the handler function exported from `src/handlers/loans.js` keeps its name), including the tests, and keep the whole suite passing. 2) Add a "Data file format" section to `README.md` that describes the JSON file the server writes: every top-level key, the shape of a book record and of a loan record with an example of each, how ids are assigned, when the file is written, and what happens when the file does not exist at start-up. 3) Users report that a book can be blanked by accident: `PATCH /books/1` with the body `{ "title": "" }` (or `{ "title": null }`) answers 200 and silently changes nothing, but it should be rejected with a 422 and a problem entry for the `title` field like a create request is. Correct this and add a regression test. 4) Investigate input validation across the whole API and write the answer to `notes/validation-coverage.md`: a top-level heading `# Validation coverage`, a table with the columns Endpoint, Input (path parameter, query parameter or body field), Validated in (file and function), Rule and Gap, with one row for every input every endpoint accepts, and a section `## Gaps` that lists the inputs that are not validated or only partly validated, ordered by how likely they are to cause a wrong response. 5) Add a `POST /loans/:id/renew` endpoint that moves the due date of an active loan back by 7 days or by an optional integer `days` from 1 to 30 in the request body, allows at most two renewals per loan (answering 409 afterwards), answers 409 for a loan that was already returned and 404 for an unknown loan, exposes a `renewals` count on every loan (0 for loans that were stored before this change), and is listed in the README endpoint table; add tests.

## Checks

1. `grep -rnE "\.(addLoan|returnLoan)\(" src test` finds nothing; `createLoan` and `closeLoan` exist in `src/store.js`; `grep -n "returnLoan" src/handlers/loans.js src/server.js` still shows the handler; `node --test` passes.
2. `README.md` has a heading containing `Data file format` that mentions `nextBookId`, `nextLoanId`, `books`, `loans`, and includes JSON examples; compare the description with a file produced by running the server.
3. `PATCH /books/1` with `{"title": ""}` and with `{"title": null}` answers 422 with a `title` problem; `{"year": 2000}` still works; a new test exists; `node --test` passes.
4. `notes/validation-coverage.md` exists with `# Validation coverage`, a five-column table with at least twelve rows, and `## Gaps`.
5. A loan renewed once has `dueOn` 7 days later and `renewals: 1`; the third renewal answers 409; renewing a returned loan answers 409; `days: 31` answers 422; README table has the endpoint; new tests exist; `node --test` passes.

## Categories

| Task | Category |
|---|---|
| 1 | refactor |
| 2 | docs |
| 3 | fix |
| 4 | research |
| 5 | feature |
