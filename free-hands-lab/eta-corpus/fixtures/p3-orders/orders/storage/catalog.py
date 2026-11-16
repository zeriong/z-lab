"""Repositories for products, customers and coupons."""

import sqlite3
from datetime import date
from decimal import Decimal

from orders.errors import DuplicateError
from orders.models import Coupon, Customer, Product


def _cents(amount):
    return int((Decimal(amount) * 100).to_integral_value())


class ProductRepo:
    def __init__(self, conn):
        self.conn = conn

    def add(self, product):
        try:
            self.conn.execute(
                "INSERT INTO products (sku, name, price_cents, category, active) VALUES (?, ?, ?, ?, ?)",
                (product.sku, product.name, _cents(product.unit_price), product.category,
                 1 if product.active else 0),
            )
        except sqlite3.IntegrityError:
            raise DuplicateError("product %s already exists" % product.sku)

    def get(self, sku):
        row = self.conn.execute("SELECT * FROM products WHERE sku = ?", (sku,)).fetchone()
        if row is None:
            return None
        return Product(row["sku"], row["name"], Decimal(row["price_cents"]) / 100,
                       row["category"], bool(row["active"]))

    def list(self, active_only=True):
        sql = "SELECT sku FROM products"
        if active_only:
            sql += " WHERE active = 1"
        rows = self.conn.execute(sql + " ORDER BY sku").fetchall()
        return [self.get(row["sku"]) for row in rows]

    def set_active(self, sku, active):
        self.conn.execute("UPDATE products SET active = ? WHERE sku = ?", (1 if active else 0, sku))


class CustomerRepo:
    def __init__(self, conn):
        self.conn = conn

    def add(self, customer):
        try:
            cursor = self.conn.execute(
                "INSERT INTO customers (email, name, region, tier) VALUES (?, ?, ?, ?)",
                (customer.email, customer.name, customer.region, customer.tier),
            )
        except sqlite3.IntegrityError:
            raise DuplicateError("customer %s already exists" % customer.email)
        return cursor.lastrowid

    def _build(self, row):
        if row is None:
            return None
        return Customer(row["id"], row["email"], row["name"], row["region"], row["tier"])

    def get(self, customer_id):
        row = self.conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
        return self._build(row)

    def get_by_email(self, email):
        row = self.conn.execute("SELECT * FROM customers WHERE email = ?", (email,)).fetchone()
        return self._build(row)


class CouponRepo:
    def __init__(self, conn):
        self.conn = conn

    def add(self, coupon):
        try:
            self.conn.execute(
                "INSERT INTO coupons (code, kind, value, min_subtotal_cents, expires_on, max_uses, used) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (coupon.code, coupon.kind, str(coupon.value), _cents(coupon.min_subtotal),
                 coupon.expires_on.isoformat() if coupon.expires_on else None,
                 coupon.max_uses, coupon.used),
            )
        except sqlite3.IntegrityError:
            raise DuplicateError("coupon %s already exists" % coupon.code)

    def get(self, code):
        row = self.conn.execute("SELECT * FROM coupons WHERE code = ?", (code,)).fetchone()
        if row is None:
            return None
        expires = date.fromisoformat(row["expires_on"]) if row["expires_on"] else None
        return Coupon(row["code"], row["kind"], Decimal(row["value"]),
                      Decimal(row["min_subtotal_cents"]) / 100, expires, row["max_uses"], row["used"])

    def increment_used(self, code):
        self.conn.execute("UPDATE coupons SET used = used + 1 WHERE code = ?", (code,))
