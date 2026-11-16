"""Low-stock report."""

from dataclasses import dataclass

from orders import config
from orders.storage.catalog import ProductRepo
from orders.storage.stock import StockRepo


@dataclass
class LowStockRow:
    sku: str
    name: str
    on_hand: int
    reserved: int
    available: int


def low_stock(conn, threshold=None):
    """List active products that are running low, scarcest first."""
    if threshold is None:
        threshold = config.LOW_STOCK_THRESHOLD
    products = ProductRepo(conn)
    rows = []
    for level in StockRepo(conn).list_all():
        product = products.get(level.sku)
        if product is None or not product.active:
            continue
        if level.on_hand <= threshold:
            rows.append(LowStockRow(level.sku, product.name, level.on_hand, level.reserved,
                                    level.available))
    return sorted(rows, key=lambda row: (row.available, row.sku))
