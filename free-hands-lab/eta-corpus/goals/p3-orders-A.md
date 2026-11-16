# p3-orders goal A

## Prompt

Complete these five tasks in this repository. 1) Users report a one-cent error with coupons: after adding three products that each cost 10.00 in the default region (US-OR, no tax) and a fixed coupon `FLAT10` worth 10, `python3 -m orders quote 1 A:1 B:1 C:1 --coupon FLAT10` prints a total of $20.01, while 30.00 minus a 10.00 discount is exactly $20.00. Make the totals add up in every case and add regression tests. 2) Money is converted between Decimal amounts and integer cents by several private helpers and inline expressions in the storage modules: add `to_cents` and `from_cents` helpers to `orders/money.py`, use them in every storage module in place of the private helpers and inline arithmetic, and remove the duplicates, keeping behavior identical and all existing tests passing unedited. 3) Add a `--format csv` choice to both `report daily` and `report low-stock`. The low-stock output is a header row `sku,name,on_hand,reserved,available` followed by one row per product; the daily output uses the header `section,key,value` with rows `summary,order_count`, `summary,gross`, `summary,discount_total`, `summary,net_total`, one `discount,<name>` row per discount, one `tax,<region>` row per region and one `top_product,<sku>` row per top product, each with its value; build both with the `csv` module so names containing commas are quoted, and add tests for both. 4) Add a "Pricing pipeline" section to `docs/architecture.md` that explains, in order, every step the pricing engine performs (which function in which module performs it, what it receives and what it returns), how discounts are spread across lines and how tax and rounding are applied, and ends with a worked example for one multi-line order whose numbers you have verified by running `quote`. 5) Investigate how database writes are protected and write the answer to `notes/transactions.md`: a top-level heading `# Transactions`, a section `## Write paths` with a table whose columns are Entry point, Writes to (tables), Inside `transaction()` (yes or no) and What happens if it fails halfway, listing every service method that writes, a section `## Races` describing every read-then-write sequence that could misbehave with two concurrent writers, and a section `## Recommendations` of at most six bullet points.

## Checks

1. Add three $10.00 products, a customer and the coupon via the CLI on a scratch database; the quote total is $20.00 and `subtotal - discount == total` for the printed lines; new tests (indivisible amounts, e.g. 10.00 over three equal lines) exist; `python3 -m unittest discover -s tests -q` passes.
2. `grep -rnE "def _cents|def _to_cents|def _from_cents|/ 100|\* 100" orders/storage` finds nothing; `orders/money.py` defines `to_cents` and `from_cents`; the pre-existing tests are unchanged and the suite passes.
3. `python3 -m orders --db x.db report low-stock --format csv` starts with `sku,name,on_hand,reserved,available`; `report daily --date <day> --format csv` starts with `section,key,value`; a product name containing a comma is quoted; new tests exist; the suite passes.
4. `docs/architecture.md` has a heading `Pricing pipeline`, steps naming `volume_discount`, `tier_discount`, `validate_coupon`, `coupon_discount`, `allocate`, `line_tax`, and a worked example; re-run the example's `quote` command and compare the numbers.
5. `notes/transactions.md` exists with `# Transactions`, `## Write paths` (a four-column table covering at least place, pay, cancel, add-product, add-customer, add-coupon and restock), `## Races`, and `## Recommendations` (at most six bullets).

## Categories

| Task | Category |
|---|---|
| 1 | fix |
| 2 | refactor |
| 3 | feature |
| 4 | docs |
| 5 | research |
