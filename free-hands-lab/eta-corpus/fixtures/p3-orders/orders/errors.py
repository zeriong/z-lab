"""Exception types shared by every layer."""


class OrdersError(Exception):
    """Base class for all errors the CLI reports without a traceback."""


class NotFoundError(OrdersError):
    pass


class DuplicateError(OrdersError):
    pass


class InvalidOrderError(OrdersError):
    pass


class InvalidStateError(OrdersError):
    pass


class CouponError(OrdersError):
    pass


class UnknownRegionError(OrdersError):
    def __init__(self, region):
        super().__init__("unknown region: %s" % region)
        self.region = region


class UnknownTierError(OrdersError):
    def __init__(self, tier):
        super().__init__("unknown customer tier: %s" % tier)
        self.tier = tier


class InsufficientStockError(OrdersError):
    def __init__(self, sku, requested, available):
        super().__init__(
            "insufficient stock for %s: requested %d, available %d" % (sku, requested, available)
        )
        self.sku = sku
        self.requested = requested
        self.available = available
