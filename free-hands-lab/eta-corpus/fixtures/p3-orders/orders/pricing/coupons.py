"""Coupon validation and the discount a coupon grants."""

from orders.errors import CouponError
from orders.money import percent_of, to_money


def validate_coupon(coupon, amount, today):
    """Raise CouponError unless ``coupon`` can be applied to ``amount`` on ``today``."""
    if coupon.expires_on is not None and today >= coupon.expires_on:
        raise CouponError("coupon %s expired on %s" % (coupon.code, coupon.expires_on))
    if coupon.max_uses is not None and coupon.used >= coupon.max_uses:
        raise CouponError("coupon %s has no uses left" % coupon.code)
    if amount < coupon.min_subtotal:
        raise CouponError(
            "coupon %s needs a subtotal of at least %s" % (coupon.code, coupon.min_subtotal)
        )


def coupon_discount(coupon, amount):
    if coupon.kind == "percent":
        return percent_of(amount, coupon.value)
    if coupon.kind == "fixed":
        return min(to_money(coupon.value), amount)
    raise CouponError("unknown coupon kind: %s" % coupon.kind)
