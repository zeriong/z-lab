# shelf

A small JSON API for a book collection and its loans. Node 20+, ESM, no dependencies.

## Run

```
npm start            # listens on PORT (default 3000), data in SHELF_DATA (default shelf-data.json)
npm test             # node --test
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /health | liveness check |
| GET | /books | list books (`author`, `q`, `tag`, `available`, `limit`, `offset`) |
| POST | /books | create a book |
| GET | /books/:id | fetch one book |
| PATCH | /books/:id | update some fields of a book |
| DELETE | /books/:id | delete a book (409 while it is on loan) |
| POST | /books/:id/loans | lend a book |
| GET | /loans | list loans (`bookId`, `active`, `limit`, `offset`) |
| GET | /loans/overdue | active loans whose due date has passed |
| POST | /loans/:id/return | mark a loan as returned |

## Behavior notes

- Lists are paginated: `limit` defaults to 20 (maximum 100) and `offset` to 0. The response is
  `{ items, total, limit, offset }`, where `total` counts all matches before paging.
- A loan lasts `days` days (default 14, maximum 60). A loan is overdue only after its due date has
  passed; a book due back today is not overdue yet.
- Errors have the shape `{ "error": { "code", "message", "details"? } }`.
- Book data is written to the JSON file after every change.
