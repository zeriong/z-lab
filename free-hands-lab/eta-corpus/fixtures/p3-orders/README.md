# orders

A small order management toolkit: a product catalog, customers, coupons, stock reservations,
a pricing engine (volume and tier discounts, coupons, regional tax), daily sales and low-stock
reports, and a command-line interface. Python 3.9+, standard library only, data in SQLite.

## Quick start

```
python3 -m orders --db shop.db init
python3 -m orders --db shop.db add-product PEN "Ballpoint pen" 1.50 --stock 100
python3 -m orders --db shop.db add-customer ann@example.com Ann --region US-CA
python3 -m orders --db shop.db place 1 PEN:10
python3 -m orders --db shop.db report daily
```

Set `ORDERS_DB` to avoid repeating `--db`. Run `python3 -m orders --help` for the list of commands.

## Layout

See `docs/architecture.md` for how the packages fit together.

## Tests

```
python3 -m unittest discover -s tests -q
```
