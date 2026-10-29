#!/usr/bin/env python3
"""E9 (#7) deterministic count on a snapshot of the private repo, 0.3.0 vs 0.3.1, no model.

For every governed tracked file: the injection mode and how many qualified decision lines (`- 결정(…):`,
`- 결정 B1:`) the injected text carries. Over every record: decision blocks without a decision line, as
`records-lint` counts them (0.3.0: exact `- 결정:` only; 0.3.1: the hook's `field_line`). Prints counts only.

usage: python3 qualified.py <snapshot repo>
The snapshot holds `.claude/context-rail.json`; each hook is loaded from hooks/ and given that config.
"""
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = os.path.abspath(sys.argv[1])
RANK = {"noline": 1, "truncated": 2, "compressed": 3, "full": 4}


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace(".", "_"), HERE / "hooks" / f"precedent-context-{name}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    v030, v031 = load("0.3.0"), load("0.3.1")
    cfg = v031.config(os.path.join(REPO, ".claude"))
    exact = re.compile(r"^- " + re.escape(cfg["fieldLabels"][0]) + r":")
    qualified = v031.field_line(cfg["fieldLabels"][:1])
    files = [l for l in subprocess.run(["git", "-C", REPO, "ls-files"], capture_output=True, text=True).stdout.split("\n")
             if l and re.search(r"\.(" + "|".join(cfg["extensions"]) + r")$", l)]
    out = {"governed_files": 0, "mode_regressions_vs_030": 0, "files_compressed_or_truncated": 0,
           "qualified_lines_injected": {"0.3.0": 0, "0.3.1": 0}, "files_gaining_qualified_lines": 0,
           "slugs_lost_vs_030": 0, "worst_chars_031": 0}
    for rel in files:
        f = os.path.join(REPO, rel)
        rec = v031.nearest_record(f, REPO, cfg["recordFile"])
        if not rec:
            continue
        out["governed_files"] += 1
        res = {}
        for name, m in (("0.3.0", v030), ("0.3.1", v031)):
            mode, text = m.render(rec, REPO, f, cfg)
            q = sum(1 for l in text.split("\n") if qualified.match(l) and not exact.match(l))
            res[name] = (mode, text, q)
        (m0, t0, q0), (m1, t1, q1) = res["0.3.0"], res["0.3.1"]
        out["qualified_lines_injected"]["0.3.0"] += q0
        out["qualified_lines_injected"]["0.3.1"] += q1
        out["files_gaining_qualified_lines"] += q1 > q0
        out["mode_regressions_vs_030"] += RANK[m1] < RANK[m0]
        out["files_compressed_or_truncated"] += m1 in ("compressed", "truncated")
        lost = set(re.findall(r"^### (§\S+)", t0, re.M)) - set(re.findall(r"^### (§\S+)", t1, re.M))
        out["slugs_lost_vs_030"] += len(lost)
        out["worst_chars_031"] = max(out["worst_chars_031"], len(t1) + len(v031.STOP) + 1 + 220)
    blocks = {"0.3.0": 0, "0.3.1": 0}
    for rel in subprocess.run(["git", "-C", REPO, "ls-files"], capture_output=True, text=True).stdout.split("\n"):
        if not rel.endswith(cfg["recordFile"]):
            continue
        for name, rx in (("0.3.0", exact), ("0.3.1", qualified)):
            block = None
            for line in open(os.path.join(REPO, rel), encoding="utf-8").read().split("\n") + ["## end"]:
                if line.startswith(("### ", "## ")):
                    blocks[name] += bool(block is not None and not block)
                    block = False if line.startswith("### ") else None
                elif block is False and rx.match(line):
                    block = True
    out["blocks_without_decision"] = blocks
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
