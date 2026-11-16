"""Shared helpers for the tests (not a test module)."""

import contextlib
import io
import os
import tempfile
import unittest
from datetime import date

from orders.services.catalog_service import CatalogService
from orders.services.order_service import OrderService
from orders.storage.db import connect, init_schema

DAY = date(2026, 3, 10)


def make_conn():
    conn = connect(":memory:")
    init_schema(conn)
    return conn


def seed(conn):
    """Three products, three customers, one coupon. Returns (catalog, service)."""
    catalog = CatalogService(conn)
    catalog.add_product("PEN", "Ballpoint pen", "1.50", "stationery", initial_stock=100)
    catalog.add_product("BOOK", "Paperback", "12.00", "books", initial_stock=20)
    catalog.add_product("SHIRT", "Cotton shirt", "25.00", "clothing", initial_stock=8)
    catalog.add_customer("ann@example.com", "Ann", "US-OR", "standard")
    catalog.add_customer("bob@example.com", "Bob", "US-CA", "silver")
    catalog.add_customer("cy@example.com", "Cy", "EU-FR", "gold")
    catalog.add_coupon("TEN", "percent", "10")
    return catalog, OrderService(conn)


class DbTestCase(unittest.TestCase):
    def setUp(self):
        self.conn = make_conn()
        self.addCleanup(self.conn.close)
        self.catalog, self.service = seed(self.conn)


def run_cli(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stderr(err):
        from orders.cli import main
        code = main(argv, out=out)
    return code, out.getvalue(), err.getvalue()


def temp_db_path(testcase):
    directory = tempfile.mkdtemp()
    testcase.addCleanup(lambda: [os.unlink(os.path.join(directory, f)) for f in os.listdir(directory)]
                        or os.rmdir(directory))
    return os.path.join(directory, "test.db")
