import unittest
from decimal import Decimal

from orders.errors import InsufficientStockError, NotFoundError
from orders.models import OrderLine
from orders.services.inventory import InventoryService
from support import DbTestCase


class InventoryTests(DbTestCase):
    def setUp(self):
        super().setUp()
        self.inventory = InventoryService(self.conn)

    def lines(self, *pairs):
        return [OrderLine(sku, qty, Decimal("1.00")) for sku, qty in pairs]

    def test_reserve_reduces_available(self):
        order = self.service.place_order(1, [("PEN", 5)])
        level = self.inventory.stock.get("PEN")
        self.assertEqual((level.on_hand, level.reserved, level.available), (100, 5, 95))
        self.assertEqual(len(self.inventory.stock.reservations_for(order.id, "active")), 1)

    def test_insufficient_stock_raises(self):
        with self.assertRaises(InsufficientStockError) as ctx:
            self.inventory.reserve(1, self.lines(("SHIRT", 9)))
        self.assertEqual(ctx.exception.available, 8)

    def test_reservation_is_all_or_nothing(self):
        with self.assertRaises(InsufficientStockError):
            self.inventory.reserve(1, self.lines(("PEN", 2), ("SHIRT", 99)))
        self.assertEqual(self.inventory.stock.get("PEN").reserved, 0)

    def test_duplicate_lines_are_summed_before_checking(self):
        with self.assertRaises(InsufficientStockError):
            self.inventory.reserve(1, self.lines(("SHIRT", 5), ("SHIRT", 5)))

    def test_unknown_sku(self):
        with self.assertRaises(NotFoundError):
            self.inventory.reserve(1, self.lines(("GHOST", 1)))

    def test_release_and_commit(self):
        first = self.service.place_order(1, [("BOOK", 4)])
        second = self.service.place_order(1, [("BOOK", 3)])
        self.inventory.release(first.id)
        self.inventory.commit(second.id)
        level = self.inventory.stock.get("BOOK")
        self.assertEqual((level.on_hand, level.reserved), (17, 0))

    def test_restock(self):
        self.inventory.restock("PEN", 25)
        self.assertEqual(self.inventory.stock.get("PEN").on_hand, 125)


if __name__ == "__main__":
    unittest.main()
