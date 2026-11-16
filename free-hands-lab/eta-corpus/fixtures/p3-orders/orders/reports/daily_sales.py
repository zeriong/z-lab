"""Daily sales report built from stored orders."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Tuple

from orders.errors import NotFoundError
from orders.money import zero
from orders.pricing.discounts import tier_discount, volume_discount
from orders.storage.catalog import CustomerRepo
from orders.storage.orders import OrderRepo


@dataclass
class DailySalesReport:
    day: object
    order_count: int = 0
    gross: Decimal = field(default_factory=zero)
    discounts: Dict[str, Decimal] = field(default_factory=dict)
    discount_total: Decimal = field(default_factory=zero)
    tax_by_region: Dict[str, Decimal] = field(default_factory=dict)
    net_total: Decimal = field(default_factory=zero)
    top_products: List[Tuple[str, int]] = field(default_factory=list)


def _add(target, key, amount):
    target[key] = target.get(key, zero()) + amount


def daily_sales(conn, day, top=3):
    """Summarize every non-cancelled order created on ``day``."""
    report = DailySalesReport(day=day)
    customers = CustomerRepo(conn)
    quantities = {}
    for order in OrderRepo(conn).for_date(day):
        if order.status == "cancelled":
            continue
        customer = customers.get(order.customer_id)
        if customer is None:
            raise NotFoundError("order %s refers to a missing customer" % order.id)

        volume = sum((volume_discount(line) for line in order.lines), zero())
        tier = tier_discount(customer.tier, order.subtotal - volume)
        coupon = order.discount_total - volume - tier

        report.order_count += 1
        report.gross += order.subtotal
        report.discount_total += order.discount_total
        report.net_total += order.total
        for name, amount in (("volume", volume), ("tier", tier), ("coupon", coupon)):
            if amount > 0:
                _add(report.discounts, name, amount)
        if order.tax_total > 0:
            _add(report.tax_by_region, order.region, order.tax_total)
        for line in order.lines:
            quantities[line.sku] = quantities.get(line.sku, 0) + line.quantity

    ranked = sorted(quantities.items(), key=lambda item: (-item[1], item[0]))
    report.top_products = ranked[:top]
    return report
