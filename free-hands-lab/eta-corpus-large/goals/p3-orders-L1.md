# p3-orders goal L1

## Prompt

Complete these four tasks in this repository. 1) Add order returns: a customer can return some or all units of a line of a placed order; the returned units go back to inventory; the refund equals what was paid for those units, including the order's discounts, coupon and tax allocation, so that returning every unit of an order refunds exactly its total to the cent; a unit cannot be returned twice. Store returns in the sqlite database, add `python3 -m orders return <order-id> <sku> <qty>` and `python3 -m orders report returns`, and cover it with at least 15 new unit tests including rounding cases. 2) Introduce versioned schema migrations for the sqlite storage: a `schema_version` table, numbered migration functions applied in order, automatic upgrade when a database is opened, one migration that adds a nullable `notes` column to orders, a `python3 -m orders db status` and `python3 -m orders db upgrade` command, and tests that create a database with the current schema, fill it, upgrade it and find every row intact. 3) Add `python3 -m orders report monthly --year YYYY` printing, per month, gross sales, discounts, tax per region, refunds (zero when there are none) and net, with `--format table|json|csv`; the yearly totals must reconcile to the cent with the daily sales report over the same days; add at least 10 tests. 4) Write `docs/review.md`: for every module under `orders/`, its responsibility and what it imports (a mermaid graph of the internal imports that matches the code), the three riskiest pieces of logic with `file:line` references and why each is risky, and five concrete improvement proposals ranked by value; every `file:line` must point at an existing line.

## Checks

1. `python3 -m orders return …` restores stock and records a return; returning every unit of an order refunds its total exactly; a second return of the same unit fails; at least 15 new tests; the suite passes.
2. A database created before the change upgrades on open; `db status` shows the version; existing rows survive; tests cover it; the suite passes.
3. `report monthly --year` prints twelve months in three formats; its yearly totals equal the daily report summed over the year; at least 10 tests; the suite passes.
4. `docs/review.md` covers every module with a mermaid import graph, three risks with valid `file:line`, five ranked proposals.

## Categories

| Task | Category |
|---|---|
| 1 | feature |
| 2 | refactor |
| 3 | feature |
| 4 | research |
