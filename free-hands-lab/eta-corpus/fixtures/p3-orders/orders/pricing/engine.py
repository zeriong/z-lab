"""The pricing pipeline.

Order of operations: line volume discounts, customer tier discount, coupon, then tax per line
on the discounted amount. Order-level discounts are spread over the lines in proportion to
their post-volume amounts so tax can be computed line by line.
"""

from datetime import date

from orders.errors import InvalidOrderError
from orders.models import AppliedDiscount, LinePrice, PriceBreakdown
from orders.money import allocate, zero
from orders.pricing.coupons import coupon_discount, validate_coupon
from orders.pricing.discounts import tier_discount, volume_discount
from orders.pricing.tax import line_tax, tax_rate


def price_order(lines, tier, region, coupon=None, today=None):
    if not lines:
        raise InvalidOrderError("an order needs at least one line")
    today = today or date.today()

    subtotal = sum((line.subtotal for line in lines), zero())
    volume = [volume_discount(line) for line in lines]
    after_volume = subtotal - sum(volume, zero())

    tier_amount = tier_discount(tier, after_volume)
    after_tier = after_volume - tier_amount

    coupon_amount = zero()
    if coupon is not None:
        validate_coupon(coupon, after_tier, today)
        coupon_amount = coupon_discount(coupon, after_tier)

    order_level = tier_amount + coupon_amount
    weights = [line.subtotal - volume[i] for i, line in enumerate(lines)]
    shares = allocate(order_level, weights)

    priced = []
    for i, line in enumerate(lines):
        discount = volume[i] + shares[i]
        net = line.subtotal - discount
        tax = line_tax(net, region, line.category)
        priced.append(LinePrice(line.sku, line.subtotal, discount, net,
                                tax_rate(region, line.category), tax))

    discounts = []
    if sum(volume, zero()) > 0:
        discounts.append(AppliedDiscount("volume", sum(volume, zero())))
    if tier_amount > 0:
        discounts.append(AppliedDiscount("tier-%s" % tier, tier_amount))
    if coupon_amount > 0:
        discounts.append(AppliedDiscount("coupon-%s" % coupon.code, coupon_amount))

    tax_total = sum((p.tax for p in priced), zero())
    total = sum((p.net for p in priced), zero()) + tax_total
    discount_total = sum((d.amount for d in discounts), zero())
    return PriceBreakdown(subtotal, discounts, discount_total, tax_total, total, priced)
