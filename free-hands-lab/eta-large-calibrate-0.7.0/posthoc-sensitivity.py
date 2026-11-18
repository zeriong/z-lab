#!/usr/bin/env python3
"""Post hoc, not in SPEC.md, decides nothing (FINDINGS K07). The 0.7.0 subject asked again about items longer than
200 characters (K04), so many large items hold several Haiku estimates; analyze.py takes the last. This repeats the
(a) validation with each item's first and median estimate, and prints the estimate statistics FINDINGS quotes.
Usage: python3 posthoc-sensitivity.py
"""
import json
import math
import statistics

import analyze as a


def items(pick):
    out = []
    for cell in a.cells(a.RUNS):
        notes, folder = a.after(cell)
        seen = {}
        for e in a.lines(folder / "estimates.jsonl"):
            if e.get("minutes"):
                seen.setdefault((e.get("run"), e.get("item")), []).append(float(e["minutes"]))
        for r in a.lines(folder / "timings.jsonl"):
            got = seen.get((r.get("run"), r.get("item"))) or seen.get((r.get("run"), r.get("was")))
            if r.get("outcome") == "done" and got and r.get("actual_min"):
                out.append({"group": notes["goals"][0], "cell": cell.name, "family": notes["family"],
                            "est": pick(got), "actual": float(r["actual_min"]), "asked": len(got)})
    return out


def validate(L, S):
    res = {}
    for k, fit in (("M0", lambda rows: None), ("M1", a.fit_m1), ("M2", a.fit_m2)):
        errs, totals = [], []
        for held in sorted({r["group"] for r in L}):
            model = fit(S + [r for r in L if r["group"] != held])
            test = [r for r in L if r["group"] == held]
            errs += [a.err(r["actual"], a.predict(model, k, r)) for r in test]
            for cell in sorted({r["cell"] for r in test}):
                mine = [r for r in test if r["cell"] == cell]
                totals.append(a.err(sum(r["actual"] for r in mine), sum(a.predict(model, k, r) for r in mine)))
        res[k] = (statistics.median(errs), statistics.median(totals))
    return res


def main():
    S = a.small()
    for name, pick in (("last", lambda v: v[-1]), ("first", lambda v: v[0]), ("median", statistics.median)):
        L = items(pick)
        res = validate(L, S)
        print(name, {k: f"items {v[0]:.2f} totals {v[1]:.2f}" for k, v in res.items()},
              "slope", round(a.fit_m2(S + L)["slope"], 3))
    L = items(lambda v: v[-1])
    print("large: items", len(L), "asked more than once", sum(r["asked"] > 1 for r in L),
          "max asks", max(r["asked"] for r in L))
    print("median Haiku est: large", statistics.median(r["est"] for r in L), "small", statistics.median(r["est"] for r in S))
    print("median measured min: large", statistics.median(r["actual"] for r in L), "small",
          statistics.median(r["actual"] for r in S))
    for fam in ("opus", "sonnet"):
        mine = [r for r in L if r["family"] == fam]
        print(fam, "large geo ratio", round(math.exp(statistics.mean(math.log(r["actual"] / r["est"]) for r in mine)), 3),
              "n", len(mine))
    cost = 0.0
    for cell in a.cells(a.RUNS):
        _, folder = a.after(cell)
        cost += sum(e.get("cost_usd") or 0 for e in a.lines(folder / "estimates.jsonl"))
        rows = a.lines(folder / "estimates.jsonl")
        print(cell.name, "estimate rows", len(rows), "distinct keys", len({e.get("item") for e in rows}))
    print("estimator cost USD (sum of cost_usd over rows; a call's cost repeats on each of its rows)", round(cost, 3))


if __name__ == "__main__":
    main()
