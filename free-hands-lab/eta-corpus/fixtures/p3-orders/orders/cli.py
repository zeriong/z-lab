"""Command-line interface: ``python3 -m orders [--db PATH] COMMAND ...``."""

import argparse
import sys
from datetime import date

from orders import config
from orders.errors import InvalidOrderError, OrdersError
from orders.money import format_money
from orders.reports.daily_sales import daily_sales
from orders.reports.low_stock import low_stock
from orders.reports.render import render_daily_sales, render_low_stock
from orders.services.catalog_service import CatalogService
from orders.services.order_service import OrderService
from orders.storage.db import connect, init_schema


def parse_day(text):
    try:
        return date.fromisoformat(text)
    except ValueError:
        raise argparse.ArgumentTypeError("expected YYYY-MM-DD, got %r" % text)


def parse_items(tokens):
    items = []
    for token in tokens:
        sku, sep, quantity = token.partition(":")
        if not sep or not quantity.isdigit():
            raise InvalidOrderError("item must look like SKU:QTY, got %r" % token)
        items.append((sku, int(quantity)))
    return items


def build_parser():
    parser = argparse.ArgumentParser(prog="orders", description="Order management toolkit.")
    parser.add_argument("--db", default=config.DEFAULT_DB_PATH, help="SQLite database path")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="create the database schema")

    p = sub.add_parser("add-product", help="add a product")
    p.add_argument("sku")
    p.add_argument("name")
    p.add_argument("price")
    p.add_argument("--category", default="general")
    p.add_argument("--stock", type=int, default=0)

    p = sub.add_parser("add-customer", help="add a customer")
    p.add_argument("email")
    p.add_argument("name")
    p.add_argument("--region", default=config.DEFAULT_REGION)
    p.add_argument("--tier", default="standard")

    p = sub.add_parser("add-coupon", help="add a coupon")
    p.add_argument("code")
    p.add_argument("kind", choices=("percent", "fixed"))
    p.add_argument("value")
    p.add_argument("--min-subtotal", default="0")
    p.add_argument("--expires", type=parse_day)
    p.add_argument("--max-uses", type=int)

    p = sub.add_parser("restock", help="add stock for a product")
    p.add_argument("sku")
    p.add_argument("quantity", type=int)

    for name, help_text in (("quote", "price an order without placing it"),
                            ("place", "place an order")):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("customer_id", type=int)
        p.add_argument("items", nargs="+", metavar="SKU:QTY")
        p.add_argument("--coupon")
        p.add_argument("--date", type=parse_day, dest="day")

    for name in ("pay", "cancel", "show"):
        p = sub.add_parser(name, help="%s an order" % name)
        p.add_argument("order_id", type=int)

    report = sub.add_parser("report", help="run a report")
    report_sub = report.add_subparsers(dest="report", required=True)
    p = report_sub.add_parser("daily", help="sales for one day")
    p.add_argument("--date", type=parse_day, dest="day")
    p.add_argument("--format", choices=("text", "json"), default="text")
    p = report_sub.add_parser("low-stock", help="products running low")
    p.add_argument("--threshold", type=int)
    p.add_argument("--format", choices=("text", "json"), default="text")
    return parser


def describe_breakdown(breakdown):
    lines = ["subtotal: %s" % format_money(breakdown.subtotal)]
    for discount in breakdown.discounts:
        lines.append("discount %s: -%s" % (discount.name, format_money(discount.amount)))
    lines.append("tax:      %s" % format_money(breakdown.tax_total))
    lines.append("total:    %s" % format_money(breakdown.total))
    return "\n".join(lines)


def describe_order(order):
    lines = ["order %d (%s) for customer %d on %s" % (
        order.id, order.status, order.customer_id, order.created_on.isoformat())]
    for line in order.lines:
        lines.append("  %s x%d @ %s" % (line.sku, line.quantity, format_money(line.unit_price)))
    lines.append("  subtotal: %s" % format_money(order.subtotal))
    lines.append("  discount: -%s" % format_money(order.discount_total))
    lines.append("  tax:      %s" % format_money(order.tax_total))
    lines.append("  total:    %s" % format_money(order.total))
    return "\n".join(lines)


def dispatch(args, conn):
    catalog = CatalogService(conn)
    service = OrderService(conn)
    command = args.command
    if command == "init":
        return "database ready"
    if command == "add-product":
        product = catalog.add_product(args.sku, args.name, args.price, args.category, args.stock)
        return "added product %s at %s" % (product.sku, format_money(product.unit_price))
    if command == "add-customer":
        customer = catalog.add_customer(args.email, args.name, args.region, args.tier)
        return "added customer %d" % customer.id
    if command == "add-coupon":
        coupon = catalog.add_coupon(args.code, args.kind, args.value, args.min_subtotal,
                                    args.expires, args.max_uses)
        return "added coupon %s" % coupon.code
    if command == "restock":
        level = catalog.restock(args.sku, args.quantity)
        return "%s on hand: %d" % (level.sku, level.on_hand)
    if command == "quote":
        breakdown = service.quote(args.customer_id, parse_items(args.items), args.coupon, args.day)
        return describe_breakdown(breakdown)
    if command == "place":
        order = service.place_order(args.customer_id, parse_items(args.items), args.coupon, args.day)
        return "placed order %d, total %s" % (order.id, format_money(order.total))
    if command == "pay":
        return "order %d is %s" % (args.order_id, service.pay_order(args.order_id).status)
    if command == "cancel":
        return "order %d is %s" % (args.order_id, service.cancel_order(args.order_id).status)
    if command == "show":
        return describe_order(service.get_order(args.order_id))
    if command == "report" and args.report == "daily":
        report = daily_sales(conn, args.day or date.today())
        return render_daily_sales(report, args.format)
    if command == "report" and args.report == "low-stock":
        return render_low_stock(low_stock(conn, args.threshold), args.format)
    raise InvalidOrderError("unhandled command: %s" % command)


def main(argv=None, out=None):
    out = out or sys.stdout
    args = build_parser().parse_args(argv)
    conn = connect(args.db)
    try:
        init_schema(conn)
        print(dispatch(args, conn), file=out)
        return 0
    except OrdersError as exc:
        print("orders: error: %s" % exc, file=sys.stderr)
        return 1
    finally:
        conn.close()
