#!/usr/bin/env python3
"""Generate METRICS.md from runs/.  Usage: python3 metrics.py > METRICS.md"""
import json, os, statistics
RUNS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "runs")
vals = {}
rows = []
for arm in ("declared", "undeclared", "none"):
    for rep in sorted(os.listdir(os.path.join(RUNS, arm))) if os.path.isdir(os.path.join(RUNS, arm)) else []:
        d = os.path.join(RUNS, arm, rep)
        if not os.path.isfile(os.path.join(d, "DONE")):
            continue
        res = next((json.loads(l) for l in open(os.path.join(d, "stream.jsonl")) if '"type": "result"' in l), {})
        u = res.get("usage") or {}
        tin = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
        vals.setdefault(arm, []).append(tin)
        hb = open(os.path.join(d, "hook-output-bytes.txt")).read().strip() if os.path.isfile(os.path.join(d, "hook-output-bytes.txt")) else "—"
        rows.append(f"| {arm} | {rep} | {hb} | {tin:,} | {res.get('total_cost_usd')} | {open(os.path.join(d, 'wall_ms')).read().strip()} |")
print("# hook-injection-2.1.283 지표\n\n`python3 metrics.py > METRICS.md` 로 생성. 입력 토큰 = input + cache_creation + cache_read (CLI 자가보고).\n")
print("| arm | run | 훅 출력 bytes | 입력 토큰 | usd | wall ms |\n|---|---|---|---|---|---|\n" + "\n".join(rows) + "\n")
if "none" in vals:
    base = statistics.median(vals["none"])
    for arm in ("declared", "undeclared", "none"):
        if arm in vals:
            print(f"- {arm}: 중앙값 {statistics.median(vals[arm]):,.0f} (범위 {min(vals[arm]):,}–{max(vals[arm]):,}), none 대비 Δ {statistics.median(vals[arm]) - base:,.0f}")
