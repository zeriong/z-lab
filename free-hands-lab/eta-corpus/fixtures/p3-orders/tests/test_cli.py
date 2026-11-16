import json
import unittest

from support import run_cli, temp_db_path


class CliTests(unittest.TestCase):
    def setUp(self):
        self.db = temp_db_path(self)

    def cli(self, *argv):
        return run_cli(["--db", self.db] + list(argv))

    def seed(self):
        self.cli("add-product", "PEN", "Pen", "2.00", "--stock", "50")
        self.cli("add-product", "BOOK", "Book", "10.00", "--category", "books", "--stock", "4")
        self.cli("add-customer", "ann@example.com", "Ann", "--region", "US-CA", "--tier", "silver")

    def test_add_and_place_flow(self):
        self.seed()
        code, out, _ = self.cli("place", "1", "PEN:5", "BOOK:1", "--date", "2026-03-10")
        self.assertEqual(code, 0)
        self.assertIn("placed order 1", out)
        code, out, _ = self.cli("show", "1")
        self.assertIn("PEN x5", out)
        self.assertIn("(pending)", out)

    def test_quote_lists_discounts(self):
        self.seed()
        code, out, _ = self.cli("quote", "1", "PEN:10")
        self.assertEqual(code, 0)
        self.assertIn("discount volume: -$2.00", out)
        self.assertIn("discount tier-silver", out)

    def test_pay_and_cancel(self):
        self.seed()
        self.cli("place", "1", "PEN:1")
        self.cli("place", "1", "PEN:1")
        self.assertIn("paid", self.cli("pay", "1")[1])
        self.assertIn("cancelled", self.cli("cancel", "2")[1])

    def test_unknown_sku_is_a_clean_error(self):
        self.seed()
        code, out, err = self.cli("place", "1", "GHOST:1")
        self.assertEqual(code, 1)
        self.assertIn("unknown product", err)
        self.assertEqual(out, "")

    def test_bad_item_syntax(self):
        self.seed()
        code, _, err = self.cli("quote", "1", "PEN")
        self.assertEqual(code, 1)
        self.assertIn("SKU:QTY", err)

    def test_daily_report_json(self):
        self.seed()
        self.cli("place", "1", "PEN:2", "--date", "2026-03-10")
        code, out, _ = self.cli("report", "daily", "--date", "2026-03-10", "--format", "json")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out)["order_count"], 1)

    def test_low_stock_report(self):
        self.seed()
        code, out, _ = self.cli("report", "low-stock")
        self.assertEqual(code, 0)
        self.assertIn("BOOK", out)
        self.assertNotIn("PEN ", out)

    def test_restock_and_coupon(self):
        self.seed()
        self.assertIn("on hand: 9", self.cli("restock", "BOOK", "5")[1])
        self.assertIn("added coupon", self.cli("add-coupon", "TEN", "percent", "10")[1])


if __name__ == "__main__":
    unittest.main()
