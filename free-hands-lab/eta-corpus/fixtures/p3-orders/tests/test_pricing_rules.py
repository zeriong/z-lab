import unittest
from datetime import date
from decimal import Decimal

from orders.errors import CouponError, UnknownRegionError, UnknownTierError
from orders.models import Coupon, OrderLine
from orders.pricing.coupons import coupon_discount, validate_coupon
from orders.pricing.discounts import tier_discount, volume_discount, volume_percent
from orders.pricing.tax import line_tax, tax_rate

TODAY = date(2026, 3, 10)


class DiscountTests(unittest.TestCase):
    def test_volume_tiers(self):
        self.assertEqual(volume_percent(4), Decimal("0"))
        self.assertEqual(volume_percent(5), Decimal("5"))
        self.assertEqual(volume_percent(10), Decimal("10"))

    def test_volume_discount_amount(self):
        line = OrderLine("PEN", 10, Decimal("2.00"))
        self.assertEqual(volume_discount(line), Decimal("2.00"))

    def test_tier_discount(self):
        self.assertEqual(tier_discount("gold", Decimal("100.00")), Decimal("7.00"))
        self.assertEqual(tier_discount("standard", Decimal("100.00")), Decimal("0.00"))

    def test_unknown_tier(self):
        with self.assertRaises(UnknownTierError):
            tier_discount("platinum", Decimal("10.00"))


class TaxTests(unittest.TestCase):
    def test_known_region(self):
        self.assertEqual(tax_rate("US-CA"), Decimal("7.25"))

    def test_exempt_category(self):
        self.assertEqual(tax_rate("US-NY", "clothing"), Decimal("0"))
        self.assertEqual(tax_rate("US-NY", "books"), Decimal("8.00"))

    def test_unknown_region(self):
        with self.assertRaises(UnknownRegionError):
            tax_rate("MARS")

    def test_line_tax_rounds_to_cents(self):
        self.assertEqual(line_tax(Decimal("19.99"), "US-TX"), Decimal("1.25"))


class CouponTests(unittest.TestCase):
    def test_percent_coupon(self):
        coupon = Coupon("P", "percent", Decimal("15"))
        self.assertEqual(coupon_discount(coupon, Decimal("40.00")), Decimal("6.00"))

    def test_fixed_coupon_is_capped_at_amount(self):
        coupon = Coupon("F", "fixed", Decimal("25"))
        self.assertEqual(coupon_discount(coupon, Decimal("10.00")), Decimal("10.00"))

    def test_expired_coupon(self):
        coupon = Coupon("OLD", "percent", Decimal("5"), expires_on=date(2026, 1, 1))
        with self.assertRaises(CouponError):
            validate_coupon(coupon, Decimal("50.00"), TODAY)

    def test_future_expiry_is_valid(self):
        coupon = Coupon("NEW", "percent", Decimal("5"), expires_on=date(2026, 12, 31))
        validate_coupon(coupon, Decimal("50.00"), TODAY)

    def test_minimum_subtotal(self):
        coupon = Coupon("BIG", "percent", Decimal("5"), min_subtotal=Decimal("100.00"))
        with self.assertRaises(CouponError):
            validate_coupon(coupon, Decimal("99.99"), TODAY)

    def test_usage_limit(self):
        coupon = Coupon("ONCE", "percent", Decimal("5"), max_uses=1, used=1)
        with self.assertRaises(CouponError):
            validate_coupon(coupon, Decimal("50.00"), TODAY)


if __name__ == "__main__":
    unittest.main()
