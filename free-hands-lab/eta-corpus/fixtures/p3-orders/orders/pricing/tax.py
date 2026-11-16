"""Sales tax by region, with per-category exemptions."""

from decimal import Decimal

from orders import config
from orders.errors import UnknownRegionError
from orders.money import percent_of


def tax_rate(region, category="general"):
    if region not in config.TAX_RATES:
        raise UnknownRegionError(region)
    if category in config.TAX_EXEMPT.get(region, ()):
        return Decimal("0")
    return config.TAX_RATES[region]


def line_tax(net, region, category="general"):
    return percent_of(net, tax_rate(region, category))
