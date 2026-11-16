import sqlite3
import unittest
from datetime import date
from decimal import Decimal

from orders.errors import DuplicateError
from orders.models import Coupon, Customer, Order, OrderLine, Product
from orders.storage.catalog import CouponRepo, CustomerRepo, ProductRepo
from orders.storage.db import init_schema, transaction
from orders.storage.orders import OrderRepo
from orders.storage.stock import StockRepo
from support import make_conn


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.conn = make_conn()
        self.addCleanup(self.conn.close)

    def test_init_schema_is_idempotent(self):
        init_schema(self.conn)
        init_schema(self.conn)

    def test_product_roundtrip(self):
        repo = ProductRepo(self.conn)
        repo.add(Product("PEN", "Pen", Decimal("1.50"), "stationery"))
        product = repo.get("PEN")
        self.assertEqual(product.unit_price, Decimal("1.5"))
        self.assertTrue(product.active)
        self.assertIsNone(repo.get("NOPE"))

    def test_duplicate_product(self):
        repo = ProductRepo(self.conn)
        repo.add(Product("PEN", "Pen", Decimal("1.50")))
        with self.assertRaises(DuplicateError):
            repo.add(Product("PEN", "Pen again", Decimal("2.00")))

    def test_list_hides_inactive_products(self):
        repo = ProductRepo(self.conn)
        repo.add(Product("A", "A", Decimal("1.00")))
        repo.add(Product("B", "B", Decimal("1.00")))
        repo.set_active("B", False)
        self.assertEqual([p.sku for p in repo.list()], ["A"])
        self.assertEqual([p.sku for p in repo.list(active_only=False)], ["A", "B"])

    def test_customer_roundtrip_and_unique_email(self):
        repo = CustomerRepo(self.conn)
        customer_id = repo.add(Customer(None, "a@x.com", "A", "US-CA", "gold"))
        self.assertEqual(repo.get(customer_id).tier, "gold")
        self.assertEqual(repo.get_by_email("a@x.com").id, customer_id)
        with self.assertRaises(DuplicateError):
            repo.add(Customer(None, "a@x.com", "Other", "US-CA"))

    def test_coupon_roundtrip_and_usage(self):
        repo = CouponRepo(self.conn)
        repo.add(Coupon("C", "fixed", Decimal("5"), Decimal("20.00"), date(2026, 5, 1), 3))
        repo.increment_used("C")
        coupon = repo.get("C")
        self.assertEqual((coupon.used, coupon.max_uses), (1, 3))
        self.assertEqual(coupon.min_subtotal, Decimal("20"))
        self.assertEqual(coupon.expires_on, date(2026, 5, 1))

    def test_order_roundtrip_and_for_date(self):
        ProductRepo(self.conn).add(Product("PEN", "Pen", Decimal("1.50")))
        customer_id = CustomerRepo(self.conn).add(Customer(None, "a@x.com", "A", "US-CA"))
        repo = OrderRepo(self.conn)
        order = Order(None, customer_id, "US-CA", "pending", date(2026, 3, 10),
                      [OrderLine("PEN", 3, Decimal("1.50"))], None,
                      Decimal("4.50"), Decimal("0.00"), Decimal("0.33"), Decimal("4.83"))
        order_id = repo.add(order)
        loaded = repo.get(order_id)
        self.assertEqual(loaded.total, Decimal("4.83"))
        self.assertEqual(loaded.lines[0].quantity, 3)
        self.assertEqual(len(repo.for_date(date(2026, 3, 10))), 1)
        self.assertEqual(repo.for_date(date(2026, 3, 11)), [])

    def test_transaction_rolls_back_on_error(self):
        repo = ProductRepo(self.conn)
        with self.assertRaises(RuntimeError):
            with transaction(self.conn):
                repo.add(Product("X", "X", Decimal("1.00")))
                raise RuntimeError("boom")
        self.assertIsNone(repo.get("X"))

    def test_stock_adjust_requires_a_record(self):
        with self.assertRaises(Exception):
            StockRepo(self.conn).adjust("MISSING", on_hand=1)


if __name__ == "__main__":
    unittest.main()
