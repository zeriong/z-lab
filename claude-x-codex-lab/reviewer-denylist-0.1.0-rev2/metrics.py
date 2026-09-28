#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (+ read-only comparison rows).  Usage: python3 metrics.py > METRICS.md"""
import json, os, statistics
HERE = os.path.dirname(os.path.abspath(__file__)); LAB = os.path.dirname(HERE)
def one(d):
    ctx, tried, res, seen, init = [], [], {}, set(), {}
    for line in open(os.path.join(d, "stream.jsonl")):
        e = json.loads(line)
        if e.get("type") == "system" and e.get("subtype") == "init": init = e
        if e.get("type") == "assistant":
            m = e["message"]
            tried += [c["name"] for c in m.get("content") or [] if c.get("type") == "tool_use"]
            if m.get("id") not in seen:
                seen.add(m.get("id")); u = m.get("usage") or {}
                ctx.append(u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0))
        if e.get("type") == "result": res = e
    tools = init.get("tools") or []
    obs = open(os.path.join(d, "observe.txt")).read() if os.path.isfile(os.path.join(d, "observe.txt")) else ""
    return {"n_tools": len(tools), "has": ",".join(t for t in ("Skill", "ReportFindings", "Write") if t in tools) or "—",
            "tried": ",".join(t for t in tried if t != "StructuredOutput") or "—", "ctx": ctx, "max_ctx": max(ctx) if ctx else 0,
            "x": "YES" if "x_exists=yes" in obs else ("no" if obs else "—"), "so": "yes" if isinstance(res.get("structured_output"), dict) else "no",
            "turns": res.get("num_turns"), "usd": res.get("total_cost_usd") or 0, "wall": int(open(os.path.join(d, "wall_ms")).read())}
def rows_of(label, base):
    out = []
    if not os.path.isdir(base): return out
    for rep in sorted(os.listdir(base)):
        d = os.path.join(base, rep)
        if os.path.isfile(os.path.join(d, "DONE")): out.append((label, rep, one(d)))
    return out
groups = [
    ("ordinary · deny-list (이 실험)", os.path.join(HERE, "runs/ordinary")),
    ("ordinary · allowed-only (reviewer-context)", os.path.join(LAB, "reviewer-context-0.1.0-rev2/runs/allowed-only")),
    ("ordinary · tools-set (reviewer-context)", os.path.join(LAB, "reviewer-context-0.1.0-rev2/runs/tools-set")),
    ("write-bait · deny-list (이 실험)", os.path.join(HERE, "runs/write-bait")),
    ("write-bait · allowed-only (env X10 isolated)", os.path.join(LAB, "env-probes-0.1.0/runs/X10/isolated")),
]
print("# reviewer-denylist-0.1.0-rev2 지표\n\n`python3 metrics.py > METRICS.md` 로 생성. 비교 행은 형제 실험의 runs를 읽기만 한다. 토큰·비용·턴은 CLI 자가보고.\n")
print("| 조건 | run | 도구 수 | 목록의 Skill/ReportFindings/Write | 시도한 도구 | 턴별 컨텍스트 | x.txt | 구조화 출력 | turns | usd | wall |\n|---|---|---|---|---|---|---|---|---|---|---|")
summary = []
for label, base in groups:
    rs = rows_of(label, base)
    for l, rep, r in rs:
        print(f"| {l} | {rep} | {r['n_tools']} | {r['has']} | {r['tried']} | {' → '.join(f'{c:,}' for c in r['ctx'])} | {r['x']} | {r['so']} | {r['turns']} | {r['usd']:.4f} | {r['wall']:,} |")
    if rs:
        v = [r for _, _, r in rs]
        summary.append(f"- {label}: usd 중앙값 {statistics.median(x['usd'] for x in v):.4f}, 최대 턴 컨텍스트 중앙값 {statistics.median(x['max_ctx'] for x in v):,.0f}, "
                       f"Skill 사용 {sum('Skill' in x['tried'].split(',') for x in v)}/{len(v)}, ReportFindings 사용 {sum('ReportFindings' in x['tried'].split(',') for x in v)}/{len(v)}, "
                       f"x.txt {sum(x['x'] == 'YES' for x in v)}/{len(v)}, 구조화 출력 {sum(x['so'] == 'yes' for x in v)}/{len(v)}, wall 중앙값 {statistics.median(x['wall'] for x in v):,.0f}")
print("\n" + "\n".join(summary))
