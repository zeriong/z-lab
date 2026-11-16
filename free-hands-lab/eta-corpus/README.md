# eta-corpus

A task corpus for the free-hands ETA timing experiment. An autonomous agent receives one goal at a time on a
fresh copy of one fixture project, writes a checklist, estimates minutes per item, then does the work; the
experiment compares the estimates with the actual times.

The runner copies only `fixtures/<name>/` into the working copy. Everything in this README, including the
seeded-bug list, stays out of the agent's view. No fixture file mentions a seeded bug.

## Layout

```
eta-corpus/
  fixtures/p1-tally/    small   (Python CLI, one module)
  fixtures/p2-shelf/    medium  (Node ESM HTTP API)
  fixtures/p3-orders/   large   (Python package, multi-module, sqlite3)
  goals/<fixture>-<A|B|C>.md   prompt + human checks + categories
```

Each goal file has `## Prompt` (one paragraph, passed verbatim), `## Checks` (how a human verifies each task) and
`## Categories`. Every goal has exactly one task per category: docs, fix, feature, refactor, research. Category
order differs between goals. Research tasks write to `notes/<name>.md`; the `notes/` directory does not exist in
the fixtures.

## Fixtures

Toolchain: system Python 3.9.6 and Node 25. Standard library only; nothing to install.

| Fixture | Size | Files | Lines | Tests | Test command |
|---|---|---|---|---|---|
| p1-tally | small | 4 (`tally.py`, `test_tally.py`, `README.md`, `data/sample.csv`) | 302 Python (177 source + 125 tests) | 15 | `python3 -m unittest -q` |
| p2-shelf | medium | 19 (11 source modules under `src/`, 4 test files, `support/harness.js`, `package.json`, `README.md`) | 836 JavaScript (570 source and support + 266 tests) | 37 | `node --test` |
| p3-orders | large | 36 (25 modules in `orders/`, 9 files in `tests/`, `README.md`, `docs/architecture.md`) | 1814 Python (1194 package + 620 tests) | 75 | `python3 -m unittest discover -s tests -q` |

Lines were counted with `wc -l` over `*.py` and `*.js` files. All three suites pass as shipped.

p3-orders cross-module structure: `pricing/engine.py` is used by `services/order_service.py` (placing and
quoting); `pricing/discounts.py` is used again by `reports/daily_sales.py`, which rebuilds the discount
breakdown from stored orders; `config.py` feeds pricing, the catalog service, the CLI defaults and the
low-stock report.

## Goals

Task order inside each goal is the order in the prompt.

| Fixture | Goal | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| p1-tally | A | fix | research | docs | feature | refactor |
| p1-tally | B | docs | refactor | research | fix | feature |
| p1-tally | C | refactor | feature | research | fix | docs |
| p2-shelf | A | fix | feature | refactor | docs | research |
| p2-shelf | B | research | feature | fix | refactor | docs |
| p2-shelf | C | refactor | docs | fix | research | feature |
| p3-orders | A | fix | refactor | feature | docs | research |
| p3-orders | B | research | fix | feature | refactor | docs |
| p3-orders | C | docs | fix | refactor | feature | research |

Independence: goals A, B and C touch different bugs and mostly different code, so each can run on a fresh
copy. B and C were designed to run one after the other on the same copy. Known soft overlaps when they share
a copy: p3-orders B's status-constant refactor should also cover code added by C; p1-tally B's docstring task
and its module extraction both touch `tally.py`.

## Seeded bugs

One per goal, each in different code, none caught by the shipped suite (the suite is green). The goal's `fix`
task describes the symptom with a reproducing input. Experimenter only.

| Goal | File | Function | Symptom |
|---|---|---|---|
| p1-tally A | `tally.py` | `column_stats` | `mean` divides by the number of rows, not the number of numeric cells; blank cells pull the mean down (10, blank, 20 gives 10, expected 15). |
| p1-tally B | `tally.py` | `parse_number` | The numeric check is `replace(".", "", 1).isdigit()`, which rejects a leading minus; negative amounts are skipped (10 and -5 give count 1, sum 10). |
| p1-tally C | `tally.py` | `top_n` | Sorts `(value, key)` with `reverse=True`, so ties come out Z to A; the README says A to Z. |
| p2-shelf A | `src/util/pagination.js` | `paginate` | `items.slice(offset, limit)` instead of `slice(offset, offset + limit)`; any non-zero offset returns too few items (limit 2, offset 2 gives none). |
| p2-shelf B | `src/util/dates.js` | `isOverdue` | Uses `dueDate <= now`; a loan due today counts as overdue (`days: 0` is overdue at once). |
| p2-shelf C | `src/validate.js` | `validateBook` (partial mode) | The title check is `!partial \|\| input.title`, so `""` and `null` skip validation on PATCH and the request answers 200 without a change. |
| p3-orders A | `orders/money.py` | `allocate` | Shares are rounded down and the remainder is dropped, so three 10.00 lines with a 10.00 coupon sum to 9.99 of discount and the total is 20.01. |
| p3-orders B | `orders/reports/low_stock.py` | `low_stock` | Compares `on_hand` to the threshold instead of `available`, so reserved stock is ignored (20 on hand, 18 reserved, threshold 5: not listed). |
| p3-orders C | `orders/pricing/coupons.py` | `validate_coupon` | `today >= coupon.expires_on` rejects a coupon on its last valid day. |

Reproductions were run against the shipped fixtures when the corpus was built.

## Design notes

- Fixtures have no git history and no dependencies; the runner may `git init` its own copy.
- Feature tasks add new surface (flag, endpoint, report); refactor tasks keep the suite green without
  editing existing tests; docs tasks have a verifiable file condition; research tasks need a named file
  under `notes/` with required headings.
- Known accidental behaviors that research tasks may surface (not seeded, not counted): `Store#listBooks`
  filters `author` by case-sensitive substring; `daily_sales` recomputes the tier discount from the
  customer's current tier; `paginate` has no argument checks.
- Task text avoids the category words (fix, feature, refactor, docs, research).
