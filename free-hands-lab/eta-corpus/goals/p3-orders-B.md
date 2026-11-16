# p3-orders goal B

## Prompt

Complete these five tasks in this repository. 1) Trace what happens when `python3 -m orders place` runs and write the answer to `notes/place-order-flow.md`: a top-level heading `# Place order flow`, a section `## Call sequence` with a numbered list of every function called from the command-line entry point down to the SQL statements, each with its file, a section `## Data read and written` with a table whose columns are Step, Tables read, Tables written and Configuration used, and a section `## Failure points` listing every exception that can be raised during placement, where it is raised and what the user sees. 2) Users report that the low-stock report hides products that are nearly sold out: after adding a product with 20 units in stock and placing an order for 18 of them, `python3 -m orders report low-stock --threshold 5` does not list it although only 2 units are still available. Make the report reflect what can still be sold and add a regression test. 3) Add a `report customers` command with the options `--from DATE`, `--to DATE` (both inclusive, both optional, meaning all time when absent), `--limit N` and `--format text|json`, which lists customers ranked by total spend over their non-cancelled orders in the range, showing customer id, name, order count and spend, ordered by spend descending and then customer id ascending; build it from a new report module under `orders/reports/`, a new repository query and a renderer, and add tests at the repository, report and CLI level. 4) Replace the string literals for the order statuses (`pending`, `paid`, `cancelled`) and the reservation statuses (`active`, `released`, `committed`) with named constants defined once in `orders/models.py` and used everywhere the literals appear in the package (including the SQL text), keeping the stored values and all behavior identical and the existing tests passing unedited. 5) Add docstrings to every module, class and public method in the `orders/storage/` package: a one-line summary plus what each argument means, what is returned and which errors can be raised.

## Checks

1. `notes/place-order-flow.md` exists with `# Place order flow`, `## Call sequence` (a numbered list naming at least `cli.main`, `dispatch`, `OrderService.place_order`, `price_order`, `InventoryService.reserve` and `OrderRepo.add`), `## Data read and written` with a four-column table, and `## Failure points` naming at least `InsufficientStockError`, `CouponError` and `NotFoundError`.
2. On a scratch database: product BOLT with `--stock 20`, a customer, `place 1 BOLT:18`, then `report low-stock --threshold 5` lists BOLT with available 2; a new test with a reservation exists; the suite passes.
3. `python3 -m orders --db x.db report customers --limit 2 --format json` returns the two top spenders in the right order; `--from`/`--to` restrict by order date inclusively; cancelled orders are excluded; new tests exist; the suite passes.
4. `grep -rnE "['\"](pending|paid|cancelled|active|released|committed)['\"]" orders | grep -v "orders/models.py"` finds nothing (code added for task 3 must use the constants too); the pre-existing tests are unchanged and the suite passes.
5. Run an `ast` check over `orders/storage/*.py`: every module, class and function whose name does not start with an underscore (and is not `__init__`) has a docstring; the suite passes.

## Categories

| Task | Category |
|---|---|
| 1 | research |
| 2 | fix |
| 3 | feature |
| 4 | refactor |
| 5 | docs |
