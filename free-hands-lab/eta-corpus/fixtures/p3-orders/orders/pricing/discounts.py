"""Automatic discounts: per-line volume discounts and the customer tier discount."""

from decimal import Decimal

from orders import config
from orders.errors import UnknownTierError
from orders.money import percent_of


def volume_percent(quantity):
    for minimum, percent in config.VOLUME_TIERS:
        if quantity >= minimum:
            return percent
    return Decimal("0")


def volume_discount(line):
    return percent_of(line.subtotal, volume_percent(line.quantity))


def tier_discount(tier, amount):
    if tier not in config.TIER_DISCOUNT_PERCENT:
        raise UnknownTierError(tier)
    return percent_of(amount, config.TIER_DISCOUNT_PERCENT[tier])
