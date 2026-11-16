"""Repository for orders and their lines."""

from datetime import date
from decimal import Decimal

from orders.models import Order, OrderLine


def _to_cents(amount):
    return int(round(Decimal(amount) * 100))


def _from_cents(cents):
    return (Decimal(cents) / 100).quantize(Decimal("0.01"))


class OrderRepo:
    def __init__(self, conn):
        self.conn = conn

    def add(self, order):
        cursor = self.conn.execute(
            "INSERT INTO orders (customer_id, region, status, created_on, coupon_code, "
            "subtotal_cents, discount_cents, tax_cents, total_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (order.customer_id, order.region, order.status, order.created_on.isoformat(),
             order.coupon_code, _to_cents(order.subtotal), _to_cents(order.discount_total),
             _to_cents(order.tax_total), _to_cents(order.total)),
        )
        order_id = cursor.lastrowid
        for line in order.lines:
            self.conn.execute(
                "INSERT INTO order_lines (order_id, sku, quantity, unit_price_cents, category) "
                "VALUES (?, ?, ?, ?, ?)",
                (order_id, line.sku, line.quantity, _to_cents(line.unit_price), line.category),
            )
        return order_id

    def _lines(self, order_id):
        rows = self.conn.execute(
            "SELECT * FROM order_lines WHERE order_id = ? ORDER BY rowid", (order_id,)
        ).fetchall()
        return [OrderLine(r["sku"], r["quantity"], _from_cents(r["unit_price_cents"]), r["category"])
                for r in rows]

    def _build(self, row):
        return Order(
            id=row["id"],
            customer_id=row["customer_id"],
            region=row["region"],
            status=row["status"],
            created_on=date.fromisoformat(row["created_on"]),
            lines=self._lines(row["id"]),
            coupon_code=row["coupon_code"],
            subtotal=_from_cents(row["subtotal_cents"]),
            discount_total=_from_cents(row["discount_cents"]),
            tax_total=_from_cents(row["tax_cents"]),
            total=_from_cents(row["total_cents"]),
        )

    def get(self, order_id):
        row = self.conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return self._build(row) if row else None

    def set_status(self, order_id, status):
        self.conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))

    def for_date(self, day):
        rows = self.conn.execute(
            "SELECT * FROM orders WHERE created_on = ? ORDER BY id", (day.isoformat(),)
        ).fetchall()
        return [self._build(row) for row in rows]
