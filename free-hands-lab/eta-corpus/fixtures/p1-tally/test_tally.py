import contextlib
import io
import json
import os
import tempfile
import unittest

import tally


def write_csv(text):
    handle = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8")
    handle.write(text)
    handle.close()
    return handle.name


def run_main(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = tally.main(argv)
    return code, out.getvalue(), err.getvalue()


ROWS = [
    {"region": "north", "amount": "10"},
    {"region": "south", "amount": "30.5"},
    {"region": "north", "amount": "5"},
    {"region": "east", "amount": "20"},
]


class ParseNumberTests(unittest.TestCase):
    def test_integer(self):
        self.assertEqual(tally.parse_number("42"), 42.0)

    def test_decimal(self):
        self.assertEqual(tally.parse_number(" 3.25 "), 3.25)

    def test_thousands_separator(self):
        self.assertEqual(tally.parse_number("1,200.50"), 1200.5)

    def test_blank_and_text_are_none(self):
        self.assertIsNone(tally.parse_number(""))
        self.assertIsNone(tally.parse_number("n/a"))
        self.assertIsNone(tally.parse_number(None))


class StatsTests(unittest.TestCase):
    def test_column_stats(self):
        stats = tally.column_stats(ROWS, "amount")
        self.assertEqual(stats["count"], 4)
        self.assertEqual(stats["sum"], 65.5)
        self.assertEqual(stats["min"], 5.0)
        self.assertEqual(stats["max"], 30.5)
        self.assertAlmostEqual(stats["mean"], 16.375)

    def test_column_stats_empty(self):
        stats = tally.column_stats([], "amount")
        self.assertEqual(stats["count"], 0)
        self.assertIsNone(stats["mean"])
        self.assertIsNone(stats["min"])


class GroupTests(unittest.TestCase):
    def test_group_counts_and_sums(self):
        groups = {g["key"]: g for g in tally.group_by(ROWS, "region", "amount")}
        self.assertEqual(groups["north"]["count"], 2)
        self.assertEqual(groups["north"]["sum"], 15.0)
        self.assertEqual(groups["south"]["sum"], 30.5)

    def test_blank_key(self):
        groups = tally.group_by([{"region": "  "}, {"region": "x"}], "region")
        self.assertEqual(sorted(g["key"] for g in groups), ["(blank)", "x"])

    def test_top_n_orders_by_sum(self):
        groups = tally.group_by(ROWS, "region", "amount")
        top = tally.top_n(groups, 2)
        self.assertEqual([g["key"] for g in top], ["south", "east"])

    def test_top_n_without_limit_returns_all(self):
        groups = tally.group_by(ROWS, "region", "amount")
        self.assertEqual(len(tally.top_n(groups)), 3)


class FormatTests(unittest.TestCase):
    def test_table_alignment(self):
        text = tally.format_table(["key", "count"], [["alpha", 3], ["b", 12]])
        lines = text.splitlines()
        self.assertEqual(lines[0], "key    count")
        self.assertEqual(lines[2], "alpha      3")
        self.assertEqual(lines[3], "b         12")


class MainTests(unittest.TestCase):
    def setUp(self):
        self.path = write_csv("region,amount\nnorth,10\nsouth,30.5\nnorth,5\neast,20\n")
        self.addCleanup(os.unlink, self.path)

    def test_summary_table(self):
        code, out, _ = run_main([self.path, "--column", "amount"])
        self.assertEqual(code, 0)
        self.assertIn("rows", out)
        self.assertIn("65.50", out)

    def test_group_json(self):
        code, out, _ = run_main([self.path, "--group-by", "region", "--column", "amount",
                                 "--format", "json", "--top", "1"])
        self.assertEqual(code, 0)
        data = json.loads(out)
        self.assertEqual(data["groups"], [{"key": "south", "count": 1, "sum": 30.5}])

    def test_missing_file(self):
        code, _, err = run_main(["/nonexistent/file.csv"])
        self.assertEqual(code, 2)
        self.assertIn("cannot read", err)

    def test_unknown_column(self):
        code, _, err = run_main([self.path, "--column", "nope"])
        self.assertEqual(code, 2)
        self.assertIn("unknown column", err)


if __name__ == "__main__":
    unittest.main()
