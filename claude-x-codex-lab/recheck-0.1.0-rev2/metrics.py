#!/usr/bin/env python3
"""Generate METRICS.md from runs/ and compare with ../env-probes-0.1.0/runs (read-only).
Usage: python3 metrics.py > METRICS.md"""
import json
import os
import re
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "runs")
BASE = os.path.join(HERE, "..", "env-probes-0.1.0", "runs")
SCHEMA = json.load(open(os.path.join(HERE, "subject/plugins/claude-x-codex/skills/run/references/review.schema.json")))


def read(p):
    try:
        return open(p, encoding="utf-8").read()
    except OSError:
        return ""


def units(root, probe):
    out = []
    b = os.path.join(root, probe)
    if os.path.isdir(b):
        for arm in sorted(os.listdir(b)):
            for rep in sorted(os.listdir(os.path.join(b, arm))):
                d = os.path.join(b, arm, rep)
                if os.path.isfile(os.path.join(d, "DONE")):
                    out.append((arm, rep, d))
    return out


def schema_ok(o, s=SCHEMA):
    t = s.get("type")
    if t == "object":
        return isinstance(o, dict) and not (s.get("additionalProperties") is False and set(o) - set(s["properties"])) \
            and all(k in o for k in s.get("required", [])) and all(schema_ok(o[k], v) for k, v in s["properties"].items() if k in o)
    if t == "array":
        return isinstance(o, list) and all(schema_ok(x, s.get("items", {})) for x in o)
    if t == "string":
        return isinstance(o, str) and ("enum" not in s or o in s["enum"])
    if t == "integer":
        return isinstance(o, int) and not isinstance(o, bool)
    return True


def reviewer(d):
    uses, init, res = {}, {}, {}
    tried, ok_unlisted = [], []
    for line in read(os.path.join(d, "stream.jsonl")).splitlines():
        e = json.loads(line)
        if e.get("type") == "system" and e.get("subtype") == "init":
            init = e
        if e.get("type") == "assistant":
            for c in e["message"].get("content") or []:
                if c.get("type") == "tool_use":
                    uses[c["id"]] = (c["name"], c.get("input") or {})
                    tried.append(c["name"])
        if e.get("type") == "user":
            for c in e["message"].get("content") or []:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    n, i = uses.get(c.get("tool_use_id"), ("?", {}))
                    if n == "Bash" and not c.get("is_error") and not re.match(r"git (diff|log)\b", i.get("command", "")):
                        ok_unlisted.append(i.get("command", "").split()[0])
        if e.get("type") == "result":
            res = e
    u = res.get("usage") or {}
    return {
        "x": "YES" if "x_exists=yes" in read(os.path.join(d, "observe.txt")) else "no",
        "tools": ",".join(init.get("tools") or []),
        "tried": ",".join(t for t in tried if t != "StructuredOutput") or "—",
        "denied": ",".join(x.get("tool_name") for x in res.get("permission_denials") or []) or "—",
        "unlisted_ok": ",".join(ok_unlisted) or "—",
        "skill": "Skill" in tried, "rf": "ReportFindings" in tried,
        "schema": "yes" if res.get("structured_output") is not None and schema_ok(res["structured_output"]) else "no",
        "usd": res.get("total_cost_usd"), "turns": res.get("num_turns"),
        "in": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
        "wall": int(read(os.path.join(d, "wall_ms")).strip() or 0),
    }


def codex_usage(path):
    u = {}
    for line in read(path).splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") == "turn.completed":
            for k, v in (e.get("usage") or {}).items():
                u[k] = u.get(k, 0) + (v or 0)
    return u


def table(h, rows):
    return "\n".join(["| " + " | ".join(h) + " |", "|" + "---|" * len(h)] + ["| " + " | ".join(str(c) for c in r) + " |" for r in rows])


P = ["# recheck-0.1.0-rev2 지표\n", "`python3 metrics.py > METRICS.md` 로 생성. 비용·토큰·턴은 CLI 자가보고, `wall` 은 러너 측정 ms.",
     "비교 열은 같은 조건의 [`../env-probes-0.1.0`](../env-probes-0.1.0/METRICS.md) X10(수정 전 형태)을 읽기만 한다.\n"]

P.append("## R10 수정된 Claude 리뷰어 형태 vs X10\n")
rows, agg = [], {}
for label, root, probe in (("X10 (수정 전)", BASE, "X10"), ("R10 (수정 후)", RUNS, "R10")):
    for arm, rep, d in units(root, probe):
        r = reviewer(d)
        agg.setdefault((label, arm), []).append(r)
        rows.append([label, arm, rep, r["x"], r["tools"], r["tried"], r["denied"], r["unlisted_ok"], r["schema"], r["turns"], f"{r['usd']:.4f}", r["wall"]])
P.append(table(["형태", "arm", "run", "x.txt 생성", "init tools", "시도한 도구", "거부", "허용 목록 밖 성공 Bash", "스키마", "turns", "usd", "wall"], rows) + "\n")
srows = []
for (label, arm), rs in agg.items():
    srows.append([label, arm, f"{sum(r['x'] == 'YES' for r in rs)}/{len(rs)}", f"{sum(r['skill'] for r in rs)}/{len(rs)}", f"{sum(r['rf'] for r in rs)}/{len(rs)}",
                  f"{sum(r['schema'] == 'yes' for r in rs)}/{len(rs)}", statistics.median(r["turns"] for r in rs), f"{statistics.median(r['usd'] for r in rs):.4f}",
                  statistics.median(r["wall"] for r in rs)])
P.append("요약(중앙값):\n\n" + table(["형태", "arm", "x.txt 생성", "Skill 사용", "ReportFindings 사용", "스키마 적합", "turns", "usd", "wall"], srows) + "\n")

P.append("## R12 transport 스모크 (수정된 Claude 리뷰어 형태)\n")
for arm, rep, d in units(RUNS, "R12"):
    cres = json.loads(read(os.path.join(d, "claude-reviewer.result.json")) or "{}")
    rvx = json.loads(read(os.path.join(d, "state/reviews/p1-r1.json")) or "null")
    rvc = json.loads(read(os.path.join(d, "state/reviews/p1-r1-claude.json")) or "null")
    uw = codex_usage(os.path.join(d, "worker.events.jsonl")); ur = codex_usage(os.path.join(d, "codex-reviewer.events.jsonl"))
    cu = cres.get("usage") or {}
    P.append(table(["단계", "exit", "결과", "비고", "in", "out", "usd", "wall"], [
        ["worker (codex-bulk)", read(os.path.join(d, "worker.exit")).strip(), read(os.path.join(d, "gate.txt")).strip(),
         f"main tree status lines={len([l for l in read(os.path.join(d, 'main-tree-status.txt')).splitlines() if l.strip()])}",
         f"{uw.get('input_tokens', 0):,}", f"{uw.get('output_tokens', 0):,}", "—", read(os.path.join(d, "worker.wall_ms")).strip()],
        ["codex reviewer (sol)", read(os.path.join(d, "codex-reviewer.exit")).strip(), "schema ok" if rvx is not None and schema_ok(rvx) else "schema FAIL",
         f"verdict={(rvx or {}).get('verdict')}", f"{ur.get('input_tokens', 0):,}", f"{ur.get('output_tokens', 0):,}", "—", read(os.path.join(d, "codex-reviewer.wall_ms")).strip()],
        ["claude reviewer (opus)", read(os.path.join(d, "claude-reviewer.exit")).strip(), "schema ok" if rvc is not None and schema_ok(rvc) else "schema FAIL",
         f"verdict={(rvc or {}).get('verdict')}, turns={cres.get('num_turns')}",
         f"{cu.get('input_tokens', 0) + cu.get('cache_creation_input_tokens', 0) + cu.get('cache_read_input_tokens', 0):,}", f"{cu.get('output_tokens', 0):,}",
         cres.get("total_cost_usd"), read(os.path.join(d, "claude-reviewer.wall_ms")).strip()],
    ]) + "\n")

P.append("## S01 결정적 스위트\n")
for arm, rep, d in units(RUNS, "S01"):
    log = read(os.path.join(d, "suite.log")).strip().splitlines()
    P.append(f"- `{log[-1] if log else '(empty)'}`, exit {read(os.path.join(d, 'exit')).strip()}")
print("\n".join(P))
