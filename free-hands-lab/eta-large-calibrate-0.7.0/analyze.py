#!/usr/bin/env python3
"""SPEC.md's analysis. Usage: python3 analyze.py  → METRICS.md, items.csv, baseline-candidate.json

Exports the maintainer's records first (numbers only) into data/real-3.csv when that file does not exist yet.
"""
import csv
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
SHIPPED = {"sonnet": 0.040, "opus": 0.070, "fable": 0.074, "default": 0.061}  # 0.7.0's Haiku factors
REAL = Path("/Users/jeonjelyong/WorkSpace/CloudHospital/synolink-ehr/.free-hands")
LIVE_SMALL = LAB.parent / "eta-isolated-run-r2-0.6.0" / "runs"
MIN_PER_GOAL, MIN_PER_FAMILY, MATERIAL, SMALL_SLACK = 3, 2, 0.25, 0.1


def lines(path):
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()] if path.exists() else []


def cells(root):
    """Finished headless cells (a summary naming its goals; V00 and r2's band case have none)."""
    if not root.exists():
        return []
    return sorted(p for p in root.iterdir() if (p / "DONE").exists() and (p / "summary.json").exists()
                  and "goals" in json.loads((p / "summary.json").read_text()))


def after(cell):
    notes = json.loads((cell / "summary.json").read_text())
    return notes, cell / f"free-hands-dir-after-{notes['goals'][0]}"


def estimates(folder):
    out = {}
    for e in lines(folder / "estimates.jsonl"):
        if e.get("minutes"):
            out[(e.get("run"), e.get("item"))] = float(e["minutes"])
            out.setdefault((None, e.get("item")), float(e["minutes"]))
    return out


def measured(root, source):
    items = []
    for cell in cells(root):
        notes, folder = after(cell)
        est = estimates(folder)
        for r in lines(folder / "timings.jsonl"):
            minutes = (r.get("est_min") if r.get("estimator") == "haiku" else None) \
                or est.get((r.get("run"), r.get("item"))) or est.get((r.get("run"), r.get("was")))
            if r.get("outcome") == "done" and minutes and r.get("actual_min"):
                items.append({"source": source, "group": notes["goals"][0], "cell": cell.name,
                              "family": notes["family"], "est": float(minutes), "actual": float(r["actual_min"])})
    return items


def censored():
    """The item each large cell was on when it ended: actual ≥ its elapsed active time (reported, never fitted)."""
    out = []
    for cell in cells(RUNS):
        notes, folder = after(cell)
        state = json.loads((folder / "eta.json").read_text()) if (folder / "eta.json").exists() else {}
        est = estimates(folder)
        for key, item in (state.get("items") or {}).items():
            if isinstance(item, dict) and item.get("mark") == " ":
                minutes = est.get((None, key))
                elapsed = (float(state.get("active") or 0) - float(state.get("mark") or 0)) / 60.0
                if minutes and elapsed > 0:
                    out.append({"cell": cell.name, "family": notes["family"], "est": minutes, "at_least": elapsed})
                break
    return out


def small():
    out = []
    for r in csv.DictReader(open(LAB.parent / "eta-haiku-calibrate-0.6.0" / "items.csv")):
        if r["haiku"] and r["actual"]:
            out.append({"source": "small", "group": r["fixture"], "cell": r["goal_run"], "family": r["family"],
                         "est": float(r["haiku"]), "actual": float(r["actual"])})
    return out


def real():
    path = LAB / "data" / "real-3.csv"
    if not path.exists():
        path.parent.mkdir(exist_ok=True)
        subprocess.run([sys.executable, str(LAB.parent / "tools" / "export_records.py"), str(REAL), "real-1", str(path)],
                       check=True)
    return [{"source": "real", "group": r["goal"], "cell": r["goal"], "family": r["family"],
             "est": float(r["est_min"]), "actual": float(r["actual_min"])}
            for r in csv.DictReader(open(path)) if r["estimator"] == "haiku" and r["est_min"] and r["outcome"] == "done"]


def fit_m1(rows):
    fams = {}
    for r in rows:
        fams.setdefault(r["family"], []).append(math.log(r["actual"] / r["est"]))
    out = {f: math.exp(statistics.mean(v)) for f, v in fams.items()}
    out["default"] = statistics.mean(out.values())
    return out


def fit_m2(rows):
    """ln(actual) = a_f + b ln(est), b shared (within-family least squares)."""
    fams = {}
    for r in rows:
        fams.setdefault(r["family"], []).append((math.log(r["est"]), math.log(r["actual"])))
    num = den = 0.0
    for points in fams.values():
        mx = statistics.mean(x for x, _ in points)
        my = statistics.mean(y for _, y in points)
        num += sum((x - mx) * (y - my) for x, y in points)
        den += sum((x - mx) ** 2 for x, _ in points)
    b = num / den if den else 1.0
    a = {f: statistics.mean(y for _, y in p) - b * statistics.mean(x for x, _ in p) for f, p in fams.items()}
    a["default"] = statistics.mean(a.values())
    return {"slope": b, "intercepts": a}


def predict(model, kind, r):
    if kind == "M0":
        return r["est"] * SHIPPED.get(r["family"], SHIPPED["default"])
    if kind in ("M1", "B0"):
        return r["est"] * model.get(r["family"], model["default"])
    a = model["intercepts"].get(r["family"], model["intercepts"]["default"])
    return math.exp(a) * r["est"] ** model["slope"]


def err(actual, predicted):
    return abs(math.log2(actual / predicted))


def median(values):
    return statistics.median(values) if values else None


def show(value):
    return "–" if value is None else f"{value:.2f}"


def main():
    L, S, R = measured(RUNS, "large"), small(), real()
    live = measured(LIVE_SMALL, "live-small")
    cut = censored()
    with open(LAB / "items.csv", "w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source", "group", "cell", "family", "est", "actual"])
        writer.writeheader()
        writer.writerows(L + live + R)
    out = ["# Metrics", "", "Generated by analyze.py. Error = |log2(measured / predicted)| (0 = exact, 1 = off by 2x).",
           "", f"Items: large {len(L)} ({len({r['cell'] for r in L})} cells), small {len(S)}, live small {len(live)}, "
           f"real (Haiku) {len(R)}; cut off by the end of a cell {len(cut)}.", ""]
    out += ["## Large items", "", "| Cell | Family | n | Σ Haiku est | Σ measured | measured / est (geo) |",
            "|---|---|---:|---:|---:|---:|"]
    for cell in sorted({r["cell"] for r in L}):
        mine = [r for r in L if r["cell"] == cell]
        geo = math.exp(statistics.mean(math.log(r["actual"] / r["est"]) for r in mine))
        out.append(f"| {cell} | {mine[0]['family']} | {len(mine)} | {sum(r['est'] for r in mine):.0f} | "
                   f"{sum(r['actual'] for r in mine):.1f} | {geo:.3f} |")
    out += ["", "| Cell | Family | Haiku est | measured |", "|---|---|---:|---:|"]
    out += [f"| {r['cell']} | {r['family']} | {r['est']:g} | {r['actual']:.1f} |" for r in L]
    fitters = {"M0": lambda rows: None, "M1": fit_m1, "M2": fit_m2}
    # (a) each large goal held out
    a_items = {k: [] for k in fitters}
    a_totals = {k: [] for k in fitters}
    for held in sorted({r["group"] for r in L}):
        train = S + [r for r in L if r["group"] != held]
        test = [r for r in L if r["group"] == held]
        for k, fit in fitters.items():
            model = fit(train)
            a_items[k] += [err(r["actual"], predict(model, k, r)) for r in test]
            for cell in sorted({r["cell"] for r in test}):
                mine = [r for r in test if r["cell"] == cell]
                a_totals[k].append(err(sum(r["actual"] for r in mine), sum(predict(model, k, r) for r in mine)))
    # (b) small, leave one fixture out; B0 = the 0.7.0 method refit without that fixture
    b_items = {k: [] for k in ("B0", "M1", "M2")}
    for held in sorted({r["group"] for r in S}):
        rest = [r for r in S if r["group"] != held]
        test = [r for r in S if r["group"] == held]
        for k, model in (("B0", fit_m1(rest)), ("M1", fit_m1(L + rest)), ("M2", fit_m2(L + rest))):
            b_items[k] += [err(r["actual"], predict(model, k, r)) for r in test]
    # (c) real, and the live small cross-check: fitted on small + large
    whole = {"M0": None, "M1": fit_m1(S + L), "M2": fit_m2(S + L)} if L else {"M0": None}
    c_items = {k: [err(r["actual"], predict(m, k, r)) for r in R] for k, m in whole.items()}
    live_items = {k: [err(r["actual"], predict(m, k, r)) for r in live] for k, m in whole.items()}
    a_med = {k: median(v) for k, v in a_items.items()}
    t_med = {k: median(v) for k, v in a_totals.items()}
    b_med = {k: median(v) for k, v in b_items.items()}
    out += ["", "## Validation (median error, n in brackets)", "",
            "| Model | (a) large items | (a) large cell totals | (b) small items | (c) real items | live small items |",
            "|---|---:|---:|---:|---:|---:|"]
    for k in ("M0", "B0", "M1", "M2"):
        out.append(f"| {k} | {show(a_med.get(k))} ({len(a_items.get(k, []))}) | {show(t_med.get(k))} "
                   f"({len(a_totals.get(k, []))}) | {show(b_med.get(k))} ({len(b_items.get(k, []))}) | "
                   f"{show(median(c_items.get(k, [])))} ({len(c_items.get(k, []))}) | "
                   f"{show(median(live_items.get(k, [])))} ({len(live_items.get(k, []))}) |")
    # the decision, as SPEC.md freezes it
    per_goal = {g: sum(1 for r in L if r["group"] == g) for g in ("L1", "L2")}
    per_family = {f: sum(1 for r in L if r["family"] == f) for f in ("opus", "sonnet")}
    if min(per_goal.values()) < MIN_PER_GOAL or min(per_family.values()) < MIN_PER_FAMILY:
        decision = f"inconclusive: finished large items per goal {per_goal}, per family {per_family}"
    elif (a_med["M2"] <= min(a_med["M0"], a_med["M1"]) and t_med["M2"] <= min(t_med["M0"], t_med["M1"])
          and a_med["M0"] - a_med["M2"] >= MATERIAL and b_med["M2"] <= b_med["B0"] + SMALL_SLACK):
        decision = "M2"
    elif (a_med["M0"] - a_med["M1"] >= MATERIAL and t_med["M1"] <= t_med["M0"]
          and b_med["M1"] <= b_med["B0"] + SMALL_SLACK):
        decision = "M1"
    else:
        decision = "no change"
    out += ["", f"**Decision (SPEC rule): {decision}**", ""]
    if L:
        out += ["## Fitted on small + large", "", "```json",
                json.dumps({"M1": whole["M1"], "M2": whole["M2"]}, indent=1), "```", ""]
    out += ["## Items a cell ended on (actual ≥ elapsed; reported, not fitted)", "",
            "| Cell | Family | Haiku est | elapsed ≥ | M0 | M1 | M2 |", "|---|---|---:|---:|---:|---:|---:|"]
    for r in cut:
        preds = [predict(whole.get(k), k, r) if k in whole else None for k in ("M0", "M1", "M2")]
        out.append(f"| {r['cell']} | {r['family']} | {r['est']:g} | {r['at_least']:.1f} | "
                   + " | ".join(show(p) for p in preds) + " |")
    out += ["", "## Dashboard in the large cells (0.7.0 subject)", "",
            "| Cell | Marks | Shown | Shown left min | Wall min to the last finished item |", "|---|---|---|---:|---:|"]
    for cell in cells(RUNS):
        witness = lines(cell / "lab" / "witness.jsonl")
        done_at = [w["at"] for i, w in enumerate(witness) if i and w.get("marks", "").count("x") >
                   witness[i - 1].get("marks", "").count("x")]
        last = max(done_at) if done_at else None
        for w in witness:
            status = w.get("status") or {}
            if not status:
                continue
            left = None
            detail = status.get("detail") or ""
            if "left" in detail:
                part = detail.split("left")[0].strip().split()[-1].lstrip("~")
                hours, _, mins = part.partition("h")
                left = (int(hours) * 60 + int(mins.rstrip("m"))) if mins else int(part.rstrip("m"))
            wall = round((last - w["at"]) / 60, 1) if last and last >= w["at"] else None
            out.append(f"| {cell.name} | `{w.get('marks')}` | {status.get('value')} | {left} | {wall} |")
    (LAB / "METRICS.md").write_text("\n".join(out) + "\n")
    if L:
        m1, m2 = whole["M1"], whole["M2"]
        choice = {"decision": decision,
                  "M2": {"slope": round(m2["slope"], 3),
                         **{f: {"all": round(math.exp(a), 4)} for f, a in m2["intercepts"].items()}},
                  "M1": {f: {"all": round(v, 4)} for f, v in m1.items()}}
        (LAB / "baseline-candidate.json").write_text(json.dumps(choice, indent=1) + "\n")
    print("\n".join(out[:60]))


if __name__ == "__main__":
    main()
