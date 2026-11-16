"""Catalog operations: products, customers, coupons and restocking."""

from decimal import Decimal

from orders import config
from orders.errors import InvalidOrderError, NotFoundError, UnknownRegionError, UnknownTierError
from orders.models import Coupon, Customer, Product
from orders.money import to_money
from orders.services.inventory import InventoryService
from orders.storage.catalog import CouponRepo, CustomerRepo, ProductRepo
from orders.storage.db import transaction
from orders.storage.stock import StockRepo


class CatalogService:
    def __init__(self, conn):
        self.conn = conn
        self.products = ProductRepo(conn)
        self.customers = CustomerRepo(conn)
        self.coupons = CouponRepo(conn)
        self.stock = StockRepo(conn)
        self.inventory = InventoryService(conn)

    def add_product(self, sku, name, price, category="general", initial_stock=0):
        price = to_money(price)
        if price <= 0:
            raise InvalidOrderError("price must be positive")
        if initial_stock < 0:
            raise InvalidOrderError("initial stock cannot be negative")
        with transaction(self.conn):
            self.products.add(Product(sku, name, price, category))
            self.stock.ensure(sku)
            if initial_stock:
                self.inventory.restock(sku, initial_stock)
        return self.products.get(sku)

    def add_customer(self, email, name, region=None, tier="standard"):
        region = region or config.DEFAULT_REGION
        if region not in config.TAX_RATES:
            raise UnknownRegionError(region)
        if tier not in config.TIER_DISCOUNT_PERCENT:
            raise UnknownTierError(tier)
        with transaction(self.conn):
            customer_id = self.customers.add(Customer(None, email, name, region, tier))
        return self.customers.get(customer_id)

    def add_coupon(self, code, kind, value, min_subtotal=0, expires_on=None, max_uses=None):
        if kind not in ("percent", "fixed"):
            raise InvalidOrderError("coupon kind must be 'percent' or 'fixed'")
        value = Decimal(str(value))
        if value <= 0 or (kind == "percent" and value > 100):
            raise InvalidOrderError("coupon value out of range")
        with transaction(self.conn):
            self.coupons.add(Coupon(code, kind, value, to_money(min_subtotal), expires_on, max_uses))
        return self.coupons.get(code)

    def restock(self, sku, quantity):
        if quantity <= 0:
            raise InvalidOrderError("restock quantity must be positive")
        if self.products.get(sku) is None:
            raise NotFoundError("unknown product: %s" % sku)
        with transaction(self.conn):
            self.inventory.restock(sku, quantity)
        return self.stock.get(sku)

    def list_products(self):
        return self.products.list()
