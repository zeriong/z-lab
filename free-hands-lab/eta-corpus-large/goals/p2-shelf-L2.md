# p2-shelf goal L2

## Prompt

Complete these four tasks in this repository. 1) Add API-token authentication: users stored with salted SHA-256 token hashes (node:crypto), an admin user created at start-up from the `SHELF_ADMIN_TOKEN` environment variable, `POST /users` (admin only) that creates a user and returns its token once, and a check that requires `Authorization: Bearer <token>` on every route that changes data, answering 401 without a valid token and 403 for a non-admin on admin routes, with JSON errors in the existing format; add at least 15 tests and keep the existing tests passing (give them a token). 2) Add `GET /search` with `q` (case-insensitive match on title and author), `type=books|loans`, `author`, `available`, `sort`, `order` and the existing `limit`/`offset` pagination envelope; sorting must be stable; an invalid parameter answers 422 naming the field; add at least 15 tests. 3) Refactor storage behind asynchronous `BookRepository` and `LoanRepository` interfaces with an in-memory and a JSON-file implementation chosen by configuration; every handler goes through the interfaces; the existing tests pass unchanged in what they assert, and the repository tests run against both implementations. 4) Write `openapi.yaml` (OpenAPI 3.0) describing every endpoint, parameter, request body and response, errors included, and `scripts/check-openapi.js` that starts the server and checks, for every documented operation, one valid request and one invalid request answer with the documented status codes; `node scripts/check-openapi.js` exits 0.

## Checks

1. Writes without a token answer 401; a non-admin creating a user answers 403; the admin token works; at least 15 new tests; `node --test` passes.
2. `GET /search` filters, sorts stably and paginates; an invalid parameter answers 422 naming it; at least 15 new tests; `node --test` passes.
3. Handlers use only the repository interfaces; both implementations pass the repository tests; `node --test` passes.
4. `openapi.yaml` covers every route; `node scripts/check-openapi.js` exits 0.

## Categories

| Task | Category |
|---|---|
| 1 | feature |
| 2 | feature |
| 3 | refactor |
| 4 | docs |
