"""Text and JSON rendering for reports."""

import json

from orders.money import format_money


def _money_map(values):
    return {key: str(amount) for key, amount in sorted(values.items())}


def render_daily_sales(report, fmt="text"):
    if fmt == "json":
        return json.dumps({
            "day": report.day.isoformat(),
            "order_count": report.order_count,
            "gross": str(report.gross),
            "discounts": _money_map(report.discounts),
            "discount_total": str(report.discount_total),
            "tax_by_region": _money_map(report.tax_by_region),
            "net_total": str(report.net_total),
            "top_products": [{"sku": s, "quantity": q} for s, q in report.top_products],
        }, indent=2)
    lines = [
        "Daily sales for %s" % report.day.isoformat(),
        "  orders:    %d" % report.order_count,
        "  gross:     %s" % format_money(report.gross),
    ]
    for name, amount in sorted(report.discounts.items()):
        lines.append("  discount (%s): -%s" % (name, format_money(amount)))
    for region, amount in sorted(report.tax_by_region.items()):
        lines.append("  tax %s: %s" % (region, format_money(amount)))
    lines.append("  net total: %s" % format_money(report.net_total))
    if report.top_products:
        lines.append("  top products:")
        for sku, quantity in report.top_products:
            lines.append("    %s x%d" % (sku, quantity))
    return "\n".join(lines)


def render_low_stock(rows, fmt="text"):
    if fmt == "json":
        return json.dumps([{
            "sku": r.sku, "name": r.name, "on_hand": r.on_hand,
            "reserved": r.reserved, "available": r.available,
        } for r in rows], indent=2)
    if not rows:
        return "No products are low on stock."
    lines = ["%-10s %-24s %8s %8s %9s" % ("SKU", "NAME", "ON HAND", "RESERVED", "AVAILABLE")]
    for r in rows:
        lines.append("%-10s %-24s %8d %8d %9d" % (r.sku, r.name, r.on_hand, r.reserved, r.available))
    return "\n".join(lines)
