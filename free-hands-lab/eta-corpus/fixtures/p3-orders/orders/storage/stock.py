"""Stock levels and reservations."""

from orders.errors import NotFoundError
from orders.models import Reservation, StockLevel


class StockRepo:
    def __init__(self, conn):
        self.conn = conn

    def ensure(self, sku):
        self.conn.execute("INSERT OR IGNORE INTO stock (sku, on_hand, reserved) VALUES (?, 0, 0)", (sku,))

    def get(self, sku):
        row = self.conn.execute("SELECT * FROM stock WHERE sku = ?", (sku,)).fetchone()
        if row is None:
            return None
        return StockLevel(row["sku"], row["on_hand"], row["reserved"])

    def adjust(self, sku, on_hand=0, reserved=0):
        cursor = self.conn.execute(
            "UPDATE stock SET on_hand = on_hand + ?, reserved = reserved + ? WHERE sku = ?",
            (on_hand, reserved, sku),
        )
        if cursor.rowcount == 0:
            raise NotFoundError("no stock record for %s" % sku)

    def list_all(self):
        rows = self.conn.execute("SELECT * FROM stock ORDER BY sku").fetchall()
        return [StockLevel(r["sku"], r["on_hand"], r["reserved"]) for r in rows]

    def add_reservation(self, order_id, sku, quantity):
        cursor = self.conn.execute(
            "INSERT INTO reservations (order_id, sku, quantity, status) VALUES (?, ?, ?, 'active')",
            (order_id, sku, quantity),
        )
        return cursor.lastrowid

    def reservations_for(self, order_id, status=None):
        sql = "SELECT * FROM reservations WHERE order_id = ?"
        params = [order_id]
        if status is not None:
            sql += " AND status = ?"
            params.append(status)
        rows = self.conn.execute(sql + " ORDER BY id", params).fetchall()
        return [Reservation(r["id"], r["order_id"], r["sku"], r["quantity"], r["status"]) for r in rows]

    def set_reservation_status(self, reservation_id, status):
        self.conn.execute("UPDATE reservations SET status = ? WHERE id = ?", (status, reservation_id))
