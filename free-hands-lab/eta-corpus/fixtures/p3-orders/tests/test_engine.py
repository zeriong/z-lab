import unittest
from datetime import date
from decimal import Decimal

from orders.errors import InvalidOrderError
from orders.models import Coupon, OrderLine
from orders.pricing.engine import price_order

TODAY = date(2026, 3, 10)


def line(sku, qty, price, category="general"):
    return OrderLine(sku, qty, Decimal(price), category)


class EngineTests(unittest.TestCase):
    def test_single_line_without_discounts(self):
        result = price_order([line("A", 2, "10.00")], "standard", "US-OR", today=TODAY)
        self.assertEqual(result.subtotal, Decimal("20.00"))
        self.assertEqual(result.discount_total, Decimal("0.00"))
        self.assertEqual(result.total, Decimal("20.00"))
        self.assertEqual(result.discounts, [])

    def test_volume_then_tier(self):
        result = price_order([line("A", 10, "10.00")], "gold", "US-OR", today=TODAY)
        self.assertEqual([d.name for d in result.discounts], ["volume", "tier-gold"])
        self.assertEqual(result.discount_total, Decimal("16.30"))
        self.assertEqual(result.total, Decimal("83.70"))

    def test_percent_coupon_applies_after_tier(self):
        coupon = Coupon("TEN", "percent", Decimal("10"))
        result = price_order([line("A", 2, "50.00")], "silver", "US-OR", coupon, TODAY)
        self.assertEqual(result.discount_total, Decimal("12.70"))
        self.assertEqual(result.total, Decimal("87.30"))

    def test_tax_by_region(self):
        result = price_order([line("A", 1, "100.00")], "standard", "US-CA", today=TODAY)
        self.assertEqual(result.tax_total, Decimal("7.25"))
        self.assertEqual(result.total, Decimal("107.25"))

    def test_exempt_line_is_not_taxed(self):
        lines = [line("S", 1, "50.00", "clothing"), line("B", 1, "50.00", "books")]
        result = price_order(lines, "standard", "US-NY", today=TODAY)
        self.assertEqual(result.tax_total, Decimal("4.00"))

    def test_fixed_coupon_across_two_lines(self):
        coupon = Coupon("FIVE", "fixed", Decimal("10"))
        lines = [line("A", 1, "30.00"), line("B", 1, "10.00")]
        result = price_order(lines, "standard", "US-OR", coupon, TODAY)
        self.assertEqual([p.discount for p in result.lines], [Decimal("7.50"), Decimal("2.50")])
        self.assertEqual(result.total, Decimal("30.00"))

    def test_empty_order_is_rejected(self):
        with self.assertRaises(InvalidOrderError):
            price_order([], "standard", "US-OR")


if __name__ == "__main__":
    unittest.main()
