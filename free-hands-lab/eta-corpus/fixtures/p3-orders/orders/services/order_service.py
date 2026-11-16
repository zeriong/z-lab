"""Order lifecycle: quote, place, pay and cancel."""

from datetime import date

from orders.errors import InvalidOrderError, InvalidStateError, CouponError, NotFoundError
from orders.models import Order, OrderLine
from orders.pricing.engine import price_order
from orders.services.inventory import InventoryService
from orders.storage.catalog import CouponRepo, CustomerRepo, ProductRepo
from orders.storage.db import transaction
from orders.storage.orders import OrderRepo


class OrderService:
    def __init__(self, conn):
        self.conn = conn
        self.customers = CustomerRepo(conn)
        self.products = ProductRepo(conn)
        self.coupons = CouponRepo(conn)
        self.orders = OrderRepo(conn)
        self.inventory = InventoryService(conn)

    def _customer(self, customer_id):
        customer = self.customers.get(customer_id)
        if customer is None:
            raise NotFoundError("unknown customer: %s" % customer_id)
        return customer

    def _lines(self, items):
        if not items:
            raise InvalidOrderError("an order needs at least one item")
        lines = []
        for sku, quantity in items:
            if quantity <= 0:
                raise InvalidOrderError("quantity for %s must be positive" % sku)
            product = self.products.get(sku)
            if product is None:
                raise NotFoundError("unknown product: %s" % sku)
            if not product.active:
                raise InvalidOrderError("product %s is not for sale" % sku)
            lines.append(OrderLine(sku, quantity, product.unit_price, product.category))
        return lines

    def _coupon(self, code):
        if not code:
            return None
        coupon = self.coupons.get(code)
        if coupon is None:
            raise CouponError("unknown coupon: %s" % code)
        return coupon

    def quote(self, customer_id, items, coupon_code=None, today=None):
        customer = self._customer(customer_id)
        lines = self._lines(items)
        coupon = self._coupon(coupon_code)
        return price_order(lines, customer.tier, customer.region, coupon, today)

    def place_order(self, customer_id, items, coupon_code=None, today=None):
        today = today or date.today()
        customer = self._customer(customer_id)
        lines = self._lines(items)
        coupon = self._coupon(coupon_code)
        breakdown = price_order(lines, customer.tier, customer.region, coupon, today)
        order = Order(
            id=None,
            customer_id=customer.id,
            region=customer.region,
            status="pending",
            created_on=today,
            lines=lines,
            coupon_code=coupon.code if coupon else None,
            subtotal=breakdown.subtotal,
            discount_total=breakdown.discount_total,
            tax_total=breakdown.tax_total,
            total=breakdown.total,
        )
        with transaction(self.conn):
            order.id = self.orders.add(order)
            self.inventory.reserve(order.id, lines)
            if coupon is not None:
                self.coupons.increment_used(coupon.code)
        return order

    def get_order(self, order_id):
        order = self.orders.get(order_id)
        if order is None:
            raise NotFoundError("unknown order: %s" % order_id)
        return order

    def pay_order(self, order_id):
        order = self.get_order(order_id)
        if order.status != "pending":
            raise InvalidStateError("order %s is %s, not pending" % (order_id, order.status))
        with transaction(self.conn):
            self.inventory.commit(order_id)
            self.orders.set_status(order_id, "paid")
        return self.get_order(order_id)

    def cancel_order(self, order_id):
        order = self.get_order(order_id)
        if order.status != "pending":
            raise InvalidStateError("order %s is %s and cannot be cancelled" % (order_id, order.status))
        with transaction(self.conn):
            self.inventory.release(order_id)
            self.orders.set_status(order_id, "cancelled")
        return self.get_order(order_id)
