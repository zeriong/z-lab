"""Stock reservation logic. Callers own the transaction."""

from orders.errors import InsufficientStockError, NotFoundError
from orders.storage.stock import StockRepo


class InventoryService:
    def __init__(self, conn):
        self.stock = StockRepo(conn)

    def reserve(self, order_id, lines):
        """Reserve every line or none: raises before touching anything if one line is short."""
        needed = {}
        for line in lines:
            needed[line.sku] = needed.get(line.sku, 0) + line.quantity
        for sku, quantity in needed.items():
            level = self.stock.get(sku)
            if level is None:
                raise NotFoundError("no stock record for %s" % sku)
            if level.available < quantity:
                raise InsufficientStockError(sku, quantity, level.available)
        for line in lines:
            self.stock.adjust(line.sku, reserved=line.quantity)
            self.stock.add_reservation(order_id, line.sku, line.quantity)

    def release(self, order_id):
        for reservation in self.stock.reservations_for(order_id, "active"):
            self.stock.adjust(reservation.sku, reserved=-reservation.quantity)
            self.stock.set_reservation_status(reservation.id, "released")

    def commit(self, order_id):
        for reservation in self.stock.reservations_for(order_id, "active"):
            self.stock.adjust(reservation.sku, on_hand=-reservation.quantity,
                              reserved=-reservation.quantity)
            self.stock.set_reservation_status(reservation.id, "committed")

    def restock(self, sku, quantity):
        self.stock.adjust(sku, on_hand=quantity)
