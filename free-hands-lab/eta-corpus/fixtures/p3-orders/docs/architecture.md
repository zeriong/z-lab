# Architecture

`orders` is layered. Each layer imports only from the layers below it.

```
cli  ->  services  ->  pricing, storage  ->  models, money, config, errors
cli  ->  reports   ->  pricing, storage
```

## Packages

- `models.py` holds dataclasses. They contain no database code.
- `money.py` holds Decimal helpers. Amounts are two-decimal Decimals.
- `config.py` holds constants: tax rates, tier discounts, volume tiers, low-stock threshold.
- `storage/` wraps `sqlite3`. One repository class per aggregate; repositories never commit.
  `storage.db.transaction` is the only place that commits or rolls back.
- `pricing/` is a set of pure functions with no database access. `pricing.engine.price_order`
  combines them.
- `services/` coordinates repositories and the pricing engine inside transactions.
- `reports/` reads orders and stock and produces report objects; `reports.render` formats them.
- `cli.py` parses arguments, calls a service or report, and prints. Domain errors derive from
  `OrdersError` and are printed as `orders: error: ...` with exit code 1.

## Data model

Money is stored as integer cents. Orders keep their priced totals (subtotal, discount, tax, total)
at placement time. Order statuses are `pending`, `paid` and `cancelled`; reservation statuses are
`active`, `released` and `committed`.

## Order lifecycle

Placing an order (`OrderService.place_order`) prices it, stores it as `pending` and reserves stock. Paying commits the
reservation (stock leaves the shelf). Cancelling a pending order releases the reservation.
Paid and cancelled orders are final.
