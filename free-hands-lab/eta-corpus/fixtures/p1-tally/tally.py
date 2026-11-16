#!/usr/bin/env python3
"""tally - summarize a CSV file from the command line."""

import argparse
import csv
import json
import sys


class TallyError(Exception):
    """Raised for user-facing problems such as a missing column."""


def read_rows(path):
    try:
        with open(path, newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    except OSError as exc:
        raise TallyError("cannot read %s: %s" % (path, exc.strerror))


def check_column(rows, column):
    if rows and column not in rows[0]:
        raise TallyError("unknown column: %s" % column)


def parse_number(text):
    if text is None:
        return None
    cleaned = text.strip().replace(",", "")
    if not cleaned:
        return None
    if cleaned.replace(".", "", 1).isdigit():
        return float(cleaned)
    return None


def column_stats(rows, column):
    values = []
    for row in rows:
        number = parse_number(row.get(column))
        if number is not None:
            values.append(number)
    total = sum(values)
    return {
        "column": column,
        "count": len(values),
        "sum": total,
        "min": min(values) if values else None,
        "max": max(values) if values else None,
        "mean": total / len(rows) if rows else None,
    }


def group_by(rows, key, column=None):
    groups = {}
    for row in rows:
        name = (row.get(key) or "").strip() or "(blank)"
        group = groups.setdefault(name, {"key": name, "count": 0, "sum": 0.0})
        group["count"] += 1
        if column:
            number = parse_number(row.get(column))
            if number is not None:
                group["sum"] += number
    return list(groups.values())


def top_n(groups, n=None, by="sum"):
    ordered = sorted(groups, key=lambda g: (g[by], g["key"]), reverse=True)
    if n:
        return ordered[:n]
    return ordered


def summarize(rows, column=None):
    summary = {"rows": len(rows)}
    if column:
        summary["stats"] = column_stats(rows, column)
    return summary


def format_cell(value):
    if value is None:
        return "-"
    if isinstance(value, float):
        if value == int(value):
            return str(int(value))
        return "%.2f" % value
    return str(value)


def format_table(headers, rows):
    cells = [[format_cell(value) for value in row] for row in rows]
    widths = [len(h) for h in headers]
    for row in cells:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))
    lines = []
    lines.append("  ".join(h.ljust(widths[i]) for i, h in enumerate(headers)))
    lines.append("  ".join("-" * w for w in widths))
    for row in cells:
        parts = []
        for index, cell in enumerate(row):
            if cell.replace(".", "", 1).lstrip("-").isdigit():
                parts.append(cell.rjust(widths[index]))
            else:
                parts.append(cell.ljust(widths[index]))
        lines.append("  ".join(parts))
    return "\n".join(lines)


def round_numbers(value):
    if isinstance(value, float):
        return round(value, 2)
    if isinstance(value, dict):
        return {k: round_numbers(v) for k, v in value.items()}
    if isinstance(value, list):
        return [round_numbers(v) for v in value]
    return value


def render(headers, table_rows, payload, fmt):
    if fmt == "json":
        return json.dumps(round_numbers(payload), indent=2)
    return format_table(headers, table_rows)


def run(args):
    rows = read_rows(args.file)
    if args.column:
        check_column(rows, args.column)
    if args.group_by:
        check_column(rows, args.group_by)
        groups = group_by(rows, args.group_by, args.column)
        by = "sum" if args.column else "count"
        groups = top_n(groups, args.top, by)
        headers = ["key", "count"] + (["sum"] if args.column else [])
        table_rows = []
        for group in groups:
            row = [group["key"], group["count"]]
            if args.column:
                row.append(group["sum"])
            table_rows.append(row)
        payload = {"groups": [{h: g[h] for h in headers} for g in groups]}
        return render(headers, table_rows, payload, args.format)
    summary = summarize(rows, args.column)
    table_rows = [["rows", summary["rows"]]]
    stats = summary.get("stats")
    if stats:
        for name in ("count", "sum", "min", "max", "mean"):
            table_rows.append([name, stats[name]])
    return render(["metric", "value"], table_rows, summary, args.format)


def build_arg_parser():
    parser = argparse.ArgumentParser(prog="tally", description="Summarize a CSV file.")
    parser.add_argument("file", help="path to the CSV file")
    parser.add_argument("--column", help="numeric column to total")
    parser.add_argument("--group-by", dest="group_by", help="column to group rows by")
    parser.add_argument("--top", type=int, help="keep only the first N groups")
    parser.add_argument("--format", choices=("table", "json"), default="table")
    return parser


def main(argv=None):
    args = build_arg_parser().parse_args(argv)
    try:
        output = run(args)
    except TallyError as exc:
        print("tally: error: %s" % exc, file=sys.stderr)
        return 2
    print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
