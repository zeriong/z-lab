import json
import unittest
from datetime import date
from decimal import Decimal

from orders.reports.daily_sales import daily_sales
from orders.reports.low_stock import low_stock
from orders.reports.render import render_daily_sales, render_low_stock
from support import DAY, DbTestCase


class DailySalesTests(DbTestCase):
    def test_empty_day(self):
        report = daily_sales(self.conn, DAY)
        self.assertEqual(report.order_count, 0)
        self.assertEqual(report.net_total, Decimal("0.00"))

    def test_totals_exclude_cancelled_orders(self):
        keep = self.service.place_order(1, [("BOOK", 2)], today=DAY)
        drop = self.service.place_order(1, [("BOOK", 1)], today=DAY)
        self.service.cancel_order(drop.id)
        report = daily_sales(self.conn, DAY)
        self.assertEqual(report.order_count, 1)
        self.assertEqual(report.gross, Decimal("24.00"))
        self.assertEqual(report.net_total, keep.total)

    def test_other_days_are_ignored(self):
        self.service.place_order(1, [("BOOK", 1)], today=date(2026, 3, 9))
        self.assertEqual(daily_sales(self.conn, DAY).order_count, 0)

    def test_discount_breakdown(self):
        self.service.place_order(2, [("PEN", 10)], today=DAY)
        report = daily_sales(self.conn, DAY)
        self.assertEqual(report.discounts["volume"], Decimal("1.50"))
        self.assertEqual(report.discounts["tier"], Decimal("0.41"))
        self.assertNotIn("coupon", report.discounts)

    def test_coupon_share_of_discount(self):
        self.service.place_order(1, [("BOOK", 2)], coupon_code="TEN", today=DAY)
        report = daily_sales(self.conn, DAY)
        self.assertEqual(report.discounts, {"coupon": Decimal("2.40")})

    def test_tax_by_region_and_top_products(self):
        self.service.place_order(2, [("BOOK", 3), ("PEN", 1)], today=DAY)
        self.service.place_order(2, [("PEN", 6)], today=DAY)
        report = daily_sales(self.conn, DAY)
        self.assertEqual(list(report.tax_by_region), ["US-CA"])
        self.assertEqual(report.top_products, [("PEN", 7), ("BOOK", 3)])

    def test_render_text_and_json(self):
        self.service.place_order(1, [("BOOK", 2)], today=DAY)
        report = daily_sales(self.conn, DAY)
        self.assertIn("Daily sales for 2026-03-10", render_daily_sales(report))
        data = json.loads(render_daily_sales(report, "json"))
        self.assertEqual(data["order_count"], 1)
        self.assertEqual(data["gross"], "24.00")


class LowStockTests(DbTestCase):
    def test_default_threshold_flags_only_scarce_products(self):
        self.catalog.add_product("RARE", "Rare item", "9.00", initial_stock=3)
        rows = low_stock(self.conn)
        self.assertEqual([r.sku for r in rows], ["RARE"])

    def test_explicit_threshold_and_ordering(self):
        rows = low_stock(self.conn, threshold=20)
        self.assertEqual([r.sku for r in rows], ["SHIRT", "BOOK"])

    def test_inactive_products_are_skipped(self):
        self.catalog.products.set_active("SHIRT", False)
        self.assertEqual([r.sku for r in low_stock(self.conn, threshold=20)], ["BOOK"])

    def test_render(self):
        rows = low_stock(self.conn, threshold=10)
        text = render_low_stock(rows)
        self.assertIn("SHIRT", text)
        self.assertEqual(json.loads(render_low_stock(rows, "json"))[0]["sku"], "SHIRT")
        self.assertEqual(render_low_stock([]), "No products are low on stock.")


if __name__ == "__main__":
    unittest.main()
