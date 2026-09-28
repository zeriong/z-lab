#!/usr/bin/env python3
"""Generate METRICS.md from runs/.  Usage: python3 metrics.py > METRICS.md"""
import json, os, statistics
RUNS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "runs")
rows, agg = [], {}
for arm in ("allowed-only", "tools-set"):
    for rep in sorted(os.listdir(os.path.join(RUNS, arm))):
        d = os.path.join(RUNS, arm, rep)
        if not os.path.isfile(os.path.join(d, "DONE")):
            continue
        ctx, tried, res, seen, init = [], [], {}, set(), {}
        for line in open(os.path.join(d, "stream.jsonl")):
            e = json.loads(line)
            if e.get("type") == "system" and e.get("subtype") == "init":
                init = e
            if e.get("type") == "assistant":
                m = e["message"]
                for c in m.get("content") or []:
                    if c.get("type") == "tool_use":
                        tried.append(c["name"])
                if m.get("id") not in seen:
                    seen.add(m.get("id")); u = m.get("usage") or {}
                    ctx.append(u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0))
            if e.get("type") == "result":
                res = e
        u = res.get("usage") or {}
        so = res.get("structured_output")
        r = {"usd": res.get("total_cost_usd") or 0, "turns": res.get("num_turns"), "max_ctx": max(ctx) if ctx else 0,
             "create": u.get("cache_creation_input_tokens", 0), "read": u.get("cache_read_input_tokens", 0), "wall": int(open(os.path.join(d, "wall_ms")).read())}
        agg.setdefault(arm, []).append(r)
        rows.append(f"| {arm} | {rep} | {len(init.get('tools') or [])} | {','.join(t for t in tried if t != 'StructuredOutput') or '—'} | {' → '.join(f'{c:,}' for c in ctx)} | "
                    f"{r['create']:,} | {r['read']:,} | {r['turns']} | {r['usd']:.4f} | {'yes' if isinstance(so, dict) and 'verdict' in so else 'no'} | {r['wall']:,} |")
print("# reviewer-context-0.1.0-rev2 지표\n\n`python3 metrics.py > METRICS.md` 로 생성. 토큰·비용·턴은 CLI 자가보고, wall은 러너 측정 ms. 턴별 컨텍스트 = input + cache_creation + cache_read.\n")
print("| arm | run | init 도구 수 | 시도한 도구 | 턴별 컨텍스트 | cache_creation | cache_read | turns | usd | 구조화 출력 | wall |\n|---|---|---|---|---|---|---|---|---|---|---|")
print("\n".join(rows) + "\n")
for arm, rs in agg.items():
    print(f"- {arm}: usd 중앙값 {statistics.median(r['usd'] for r in rs):.4f} (범위 {min(r['usd'] for r in rs):.4f}–{max(r['usd'] for r in rs):.4f}), "
          f"최대 턴 컨텍스트 중앙값 {statistics.median(r['max_ctx'] for r in rs):,.0f}, turns 중앙값 {statistics.median(r['turns'] for r in rs)}, wall 중앙값 {statistics.median(r['wall'] for r in rs):,.0f}")
