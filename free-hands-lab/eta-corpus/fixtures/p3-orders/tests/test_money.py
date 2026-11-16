import unittest
from decimal import Decimal

from orders.money import allocate, format_money, percent_of, to_money


class MoneyTests(unittest.TestCase):
    def test_to_money_rounds_half_up(self):
        self.assertEqual(to_money("1.005"), Decimal("1.01"))
        self.assertEqual(to_money(2), Decimal("2.00"))

    def test_percent_of(self):
        self.assertEqual(percent_of(Decimal("80.00"), Decimal("7.25")), Decimal("5.80"))

    def test_format_money_groups_thousands(self):
        self.assertEqual(format_money(Decimal("1234.5")), "$1,234.50")

    def test_allocate_even_split(self):
        self.assertEqual(allocate(Decimal("10.00"), [Decimal("1"), Decimal("1")]),
                         [Decimal("5.00"), Decimal("5.00")])

    def test_allocate_proportional(self):
        shares = allocate(Decimal("8.00"), [Decimal("30"), Decimal("10")])
        self.assertEqual(shares, [Decimal("6.00"), Decimal("2.00")])

    def test_allocate_edge_cases(self):
        self.assertEqual(allocate(Decimal("5.00"), []), [])
        self.assertEqual(allocate(Decimal("5.00"), [Decimal("0"), Decimal("0")]),
                         [Decimal("0.00"), Decimal("0.00")])


if __name__ == "__main__":
    unittest.main()
