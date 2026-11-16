"""Decimal helpers. All amounts are two-decimal Decimals rounded half-up."""

from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def zero():
    return Decimal("0.00")


def to_money(value):
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def percent_of(amount, percent):
    return to_money(Decimal(amount) * Decimal(percent) / 100)


def format_money(amount):
    return "${:,.2f}".format(amount)


def allocate(total, weights):
    """Split ``total`` across ``weights`` in proportion to each weight."""
    if not weights:
        return []
    total_weight = sum(weights)
    if total_weight == 0:
        return [zero() for _ in weights]
    return [
        (Decimal(total) * weight / total_weight).quantize(CENT, rounding=ROUND_DOWN)
        for weight in weights
    ]
