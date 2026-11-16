"""Plain dataclasses shared across layers. They carry data and hold no database logic."""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import List, Optional


def _zero():
    return Decimal("0.00")


@dataclass
class Product:
    sku: str
    name: str
    unit_price: Decimal
    category: str = "general"
    active: bool = True


@dataclass
class Customer:
    id: Optional[int]
    email: str
    name: str
    region: str
    tier: str = "standard"


@dataclass
class Coupon:
    code: str
    kind: str  # "percent" or "fixed"
    value: Decimal
    min_subtotal: Decimal = field(default_factory=_zero)
    expires_on: Optional[date] = None
    max_uses: Optional[int] = None
    used: int = 0


@dataclass
class OrderLine:
    sku: str
    quantity: int
    unit_price: Decimal
    category: str = "general"

    @property
    def subtotal(self):
        return self.unit_price * self.quantity


@dataclass
class Order:
    id: Optional[int]
    customer_id: int
    region: str
    status: str
    created_on: date
    lines: List[OrderLine]
    coupon_code: Optional[str] = None
    subtotal: Decimal = field(default_factory=_zero)
    discount_total: Decimal = field(default_factory=_zero)
    tax_total: Decimal = field(default_factory=_zero)
    total: Decimal = field(default_factory=_zero)


@dataclass
class StockLevel:
    sku: str
    on_hand: int
    reserved: int

    @property
    def available(self):
        return self.on_hand - self.reserved


@dataclass
class Reservation:
    id: Optional[int]
    order_id: int
    sku: str
    quantity: int
    status: str


@dataclass
class AppliedDiscount:
    name: str
    amount: Decimal


@dataclass
class LinePrice:
    sku: str
    subtotal: Decimal
    discount: Decimal
    net: Decimal
    tax_rate: Decimal
    tax: Decimal


@dataclass
class PriceBreakdown:
    subtotal: Decimal
    discounts: List[AppliedDiscount]
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    lines: List[LinePrice]
