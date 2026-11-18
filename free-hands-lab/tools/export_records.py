#!/usr/bin/env python3
"""Export a project's free-hands records as numbers only. Usage:
    python3 export_records.py <project>/.free-hands <label> <out.csv>

Writes one row per finished item: label, goal (G1, G2 … in first-seen order), order within the goal, finish time
(UTC), estimator (`self` = the working agent's own estimate, `haiku` = the isolated estimator), estimate and measured
minutes, batch size, outcome, model family, effort, category. No item text, goal text, issue, branch, path or project
name leaves the folder — the label is whatever the caller passes. Estimates the isolated estimator wrote after an item
was done are joined, also through an item's earlier text (free-hands 0.6.0 `was`). Read-only.
"""
import csv
import json
from pathlib import Path
import sys


def lines(path):
    try:
        return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]
    except (OSError, ValueError):
        return []


def main():
    folder, label, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    estimates = {}
    for e in lines(folder / "estimates.jsonl"):
        if isinstance(e, dict) and e.get("minutes"):
            estimates[(e.get("run"), e.get("item"))] = (e["minutes"], e.get("cat"), e.get("estimator") or "haiku")
    goals, rows = {}, []
    for r in lines(folder / "timings.jsonl"):
        if not isinstance(r, dict) or not r.get("actual_min"):
            continue
        goal = goals.setdefault(r.get("goal"), f"G{len(goals) + 1}")
        minutes, category, estimator = r.get("est_min"), r.get("cat"), r.get("estimator") or "self"
        if not minutes:
            minutes, category, estimator = (estimates.get((r.get("run"), r.get("item")))
                                            or estimates.get((r.get("run"), r.get("was"))) or (None, None, None))
        rows.append({"project": label, "goal": goal, "order": sum(1 for x in rows if x["goal"] == goal) + 1,
                     "at": r.get("at"), "estimator": estimator, "est_min": minutes, "actual_min": r["actual_min"],
                     "batch": r.get("batch"), "outcome": r.get("outcome"), "family": r.get("family"),
                     "effort": r.get("effort"), "cat": category})
    fields = ["project", "goal", "order", "at", "estimator", "est_min", "actual_min", "batch", "outcome", "family",
              "effort", "cat"]
    with open(out, "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    haiku = sum(1 for r in rows if r["estimator"] == "haiku" and r["est_min"] and r["outcome"] == "done")
    print(f"{len(rows)} rows ({haiku} finished with a Haiku estimate) → {out}")


if __name__ == "__main__":
    main()
