# p3-orders goal C

## Prompt

Complete these five tasks in this repository. 1) Add a "CLI reference" section to `README.md` that documents every subcommand of `python3 -m orders` (`init`, `add-product`, `add-customer`, `add-coupon`, `restock`, `quote`, `place`, `pay`, `cancel`, `show`, `report daily`, `report low-stock`) under its own heading, each with its synopsis, every argument and option with its default and accepted values, one runnable example, and the exit codes, plus a short note about the global `--db` option and the `ORDERS_DB` variable. 2) Users report that a coupon stops working one day too early: after `add-coupon SPRING percent 10 --expires 2026-03-31`, placing an order with `--coupon SPRING --date 2026-03-31` fails with "coupon SPRING expired on 2026-03-31", but the expiry date is meant to be the last day the coupon can be used, and it should only be rejected from 2026-04-01 on. Make the behavior match that and add regression tests for the last valid day and the day after. 3) Rename the method `OrderService.place_order` to `submit_order` everywhere it is defined, called or mentioned (source, tests and documentation); the `place` command-line subcommand keeps its name, and every test must still pass. 4) Add a large-order discount: after the volume and tier discounts, an order whose remaining amount is at least 500.00 gets an additional 2 percent off, applied before any coupon; put the threshold and percentage in `orders/config.py`; it must show up as a discount named `large-order` in the output of `quote`, be spread over the lines and taxed like the other order-level discounts, and appear under the name `large-order` in the discount breakdown of `report daily` without being counted as a coupon discount; add tests for the engine, a report test and a CLI test. 5) Investigate how regions are used and write the answer to `notes/regions.md`: a top-level heading `# Regions`, a section `## Usage sites` with a table whose columns are File, Function, What it does with the region and What happens for an unknown region, covering every place in the package that reads a region or a tax rate, a section `## Adding a region` giving the exact edits needed to support a new region `US-WA` with a 6.5 percent rate and no tax on the category `groceries`, and a section `## Failure behavior` explaining what happens to existing orders and reports if a region is removed from the configuration.

## Checks

1. `README.md` has a `CLI reference` heading with one subheading per listed subcommand; compare each synopsis and option list with `python3 -m orders <command> --help`; the exit code `1` for domain errors and `2` for argument errors are mentioned; `--db` and `ORDERS_DB` are covered.
2. On a scratch database `place 1 PEN:1 --coupon SPRING --date 2026-03-31` succeeds and `--date 2026-04-01` fails with a coupon error; two new tests exist; the suite passes.
3. `grep -rn "place_order" .` finds nothing (excluding `notes/` if the research mentions the old name; prefer none); `submit_order` is defined in `orders/services/order_service.py`; `python3 -m orders place` still works; the suite passes.
4. With a $600.00 product and a standard customer in US-OR, `quote 1 BIG:1` shows `discount large-order: -$12.00` and total $588.00; adding `--coupon TEN` applies the coupon to the already reduced amount; `report daily` after placing it lists `large-order` and does not inflate `coupon`; existing tests still pass; new tests exist at engine, report and CLI level.
5. `notes/regions.md` exists with `# Regions`, a four-column `## Usage sites` table naming at least `pricing/tax.py`, `services/catalog_service.py`, `services/order_service.py` and `cli.py`, `## Adding a region` that mentions `config.TAX_RATES` and `config.TAX_EXEMPT`, and `## Failure behavior`.

## Categories

| Task | Category |
|---|---|
| 1 | docs |
| 2 | fix |
| 3 | refactor |
| 4 | feature |
| 5 | research |
