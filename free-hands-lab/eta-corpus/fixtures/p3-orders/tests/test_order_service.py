import unittest
from datetime import date
from decimal import Decimal

from orders.errors import (CouponError, InsufficientStockError, InvalidOrderError,
                           InvalidStateError, NotFoundError)
from support import DAY, DbTestCase


class OrderServiceTests(DbTestCase):
    def test_place_order_stores_priced_order(self):
        order = self.service.place_order(2, [("PEN", 10), ("BOOK", 1)], today=DAY)
        stored = self.service.get_order(order.id)
        self.assertEqual(stored.status, "pending")
        self.assertEqual(stored.subtotal, Decimal("27.00"))
        self.assertEqual(stored.region, "US-CA")
        self.assertEqual(len(stored.lines), 2)
        self.assertEqual(stored.total, order.total)

    def test_place_order_reserves_stock(self):
        self.service.place_order(1, [("SHIRT", 3)], today=DAY)
        self.assertEqual(self.catalog.stock.get("SHIRT").reserved, 3)

    def test_insufficient_stock_leaves_no_order_behind(self):
        with self.assertRaises(InsufficientStockError):
            self.service.place_order(1, [("PEN", 1), ("SHIRT", 50)], today=DAY)
        self.assertEqual(self.service.orders.for_date(DAY), [])
        self.assertEqual(self.catalog.stock.get("PEN").reserved, 0)

    def test_unknown_customer_and_product(self):
        with self.assertRaises(NotFoundError):
            self.service.place_order(99, [("PEN", 1)])
        with self.assertRaises(NotFoundError):
            self.service.place_order(1, [("GHOST", 1)])

    def test_rejects_bad_quantities_and_empty_orders(self):
        with self.assertRaises(InvalidOrderError):
            self.service.place_order(1, [("PEN", 0)])
        with self.assertRaises(InvalidOrderError):
            self.service.place_order(1, [])

    def test_inactive_product_cannot_be_ordered(self):
        self.catalog.products.set_active("PEN", False)
        with self.assertRaises(InvalidOrderError):
            self.service.place_order(1, [("PEN", 1)])

    def test_coupon_is_counted_once_per_order(self):
        self.service.place_order(1, [("BOOK", 2)], coupon_code="TEN", today=DAY)
        self.assertEqual(self.catalog.coupons.get("TEN").used, 1)

    def test_unknown_coupon(self):
        with self.assertRaises(CouponError):
            self.service.place_order(1, [("BOOK", 1)], coupon_code="NOPE", today=DAY)

    def test_quote_has_no_side_effects(self):
        breakdown = self.service.quote(1, [("BOOK", 2)], coupon_code="TEN", today=DAY)
        self.assertEqual(breakdown.total, Decimal("21.60"))
        self.assertEqual(self.catalog.stock.get("BOOK").reserved, 0)
        self.assertEqual(self.catalog.coupons.get("TEN").used, 0)

    def test_pay_commits_stock(self):
        order = self.service.place_order(1, [("BOOK", 4)], today=DAY)
        paid = self.service.pay_order(order.id)
        level = self.catalog.stock.get("BOOK")
        self.assertEqual(paid.status, "paid")
        self.assertEqual((level.on_hand, level.reserved), (16, 0))

    def test_cancel_releases_stock(self):
        order = self.service.place_order(1, [("BOOK", 4)], today=DAY)
        self.assertEqual(self.service.cancel_order(order.id).status, "cancelled")
        self.assertEqual(self.catalog.stock.get("BOOK").reserved, 0)

    def test_paid_order_cannot_be_cancelled_or_paid_twice(self):
        order = self.service.place_order(1, [("BOOK", 1)], today=DAY)
        self.service.pay_order(order.id)
        with self.assertRaises(InvalidStateError):
            self.service.cancel_order(order.id)
        with self.assertRaises(InvalidStateError):
            self.service.pay_order(order.id)

    def test_catalog_validation(self):
        with self.assertRaises(InvalidOrderError):
            self.catalog.add_product("NEG", "Negative", "-1")
        with self.assertRaises(InvalidOrderError):
            self.catalog.add_coupon("BAD", "percent", "150")


if __name__ == "__main__":
    unittest.main()
