#!/usr/bin/env python3
"""Count every model call recorded in the 2026-09-28 experiments of claude-x-codex-lab and plugin-platform-lab.
All numbers are CLI self-reports read from runs/. Usage: python3 analyze/usage.py > analyze/USAGE.md  (from claude-x-codex-lab/)"""
import json, os
LAB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOTS = [os.path.join(LAB, x) for x in sorted(os.listdir(LAB)) if os.path.isdir(os.path.join(LAB, x, "runs"))]
PLAT = os.path.join(os.path.dirname(LAB), "plugin-platform-lab")
ROOTS += [os.path.join(PLAT, x) for x in sorted(os.listdir(PLAT)) if os.path.isdir(os.path.join(PLAT, x, "runs"))]
rows = []
tot = {"codex_calls": 0, "codex_in": 0, "codex_cached": 0, "codex_out": 0, "claude_calls": 0, "usd": 0.0, "unauth": 0}
for root in ROOTS:
    e = {"codex_calls": 0, "codex_in": 0, "codex_cached": 0, "codex_out": 0, "claude_calls": 0, "usd": 0.0, "unauth": 0}
    for dp, _, files in os.walk(os.path.join(root, "runs")):
        for f in files:
            p = os.path.join(dp, f)
            if f.endswith("events.jsonl"):
                u, seen = {}, False
                for line in open(p, encoding="utf-8"):
                    try: d = json.loads(line)
                    except ValueError: continue
                    if d.get("type") == "turn.completed":
                        seen = True
                        for k, v in (d.get("usage") or {}).items(): u[k] = u.get(k, 0) + (v or 0)
                if seen:
                    e["codex_calls"] += 1; e["codex_in"] += u.get("input_tokens", 0); e["codex_cached"] += u.get("cached_input_tokens", 0); e["codex_out"] += u.get("output_tokens", 0)
            elif f == "out.txt" and "401 Unauthorized" in open(p, encoding="utf-8", errors="replace").read():
                e["unauth"] += 1
            elif f.endswith("stream.jsonl") or f in ("claude-reviewer.result.json", "stdout.txt"):
                txt = open(p, encoding="utf-8").read()
                res = None
                if not f.endswith("stream.jsonl"):
                    try: res = json.loads(txt)
                    except ValueError: res = None
                else:
                    for line in txt.splitlines():
                        try: d = json.loads(line)
                        except ValueError: continue
                        if d.get("type") == "result": res = d
                if res and res.get("total_cost_usd") is not None:
                    e["claude_calls"] += 1; e["usd"] += res["total_cost_usd"]
    rows.append((os.path.relpath(root, os.path.dirname(LAB)), e))
    for k in tot: tot[k] += e[k]
print("# 모델 호출 사용량 (2026-09-28 실험 전체)\n")
print("`python3 analyze/usage.py > analyze/USAGE.md` (claude-x-codex-lab/ 에서) 로 생성. 전부 CLI 자가보고. Codex in 은 캐시 입력을 포함한다.")
print("인증 없이 돌린 Codex 호출(임시 `CODEX_HOME`, 401)은 계정 사용이 아니므로 따로 센다.\n")
print("| 실험 | Codex 호출(인증) | Codex in | 그중 cached | Codex out | Codex 인증 없음 | Claude 호출 | Claude usd |\n|---|---|---|---|---|---|---|---|")
for name, e in rows + [("**합계**", tot)]:
    print(f"| {name} | {e['codex_calls']} | {e['codex_in']:,} | {e['codex_cached']:,} | {e['codex_out']:,} | {e['unauth']} | {e['claude_calls']} | {e['usd']:.2f} |")
print("\n이 표는 z-lab의 runs/에 남은 호출만 센다. 초안 작성 세션에서 scratchpad에서 돌린 확인 호출(Codex 5회 등)은 포함하지 않는다.")
