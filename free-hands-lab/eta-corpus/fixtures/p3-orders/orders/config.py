"""Tunable constants. Percentages are Decimal values meaning "percent", not fractions."""

import os
from decimal import Decimal

DEFAULT_DB_PATH = os.environ.get("ORDERS_DB", "orders.db")
DEFAULT_REGION = "US-OR"
LOW_STOCK_THRESHOLD = 5

# Sales tax by region, in percent.
TAX_RATES = {
    "US-CA": Decimal("7.25"),
    "US-NY": Decimal("8.00"),
    "US-OR": Decimal("0"),
    "US-TX": Decimal("6.25"),
    "EU-DE": Decimal("19"),
    "EU-FR": Decimal("20"),
}

# Product categories that are not taxed in a region.
TAX_EXEMPT = {
    "US-NY": {"clothing"},
    "EU-FR": {"books"},
}

# Customer tiers and the percent discount each earns on the post-volume subtotal.
TIER_DISCOUNT_PERCENT = {
    "standard": Decimal("0"),
    "silver": Decimal("3"),
    "gold": Decimal("7"),
}

# (minimum quantity on one line, percent off that line), best tier first.
VOLUME_TIERS = [
    (10, Decimal("10")),
    (5, Decimal("5")),
]

# Reservation and order statuses are plain strings; see docs/architecture.md.
