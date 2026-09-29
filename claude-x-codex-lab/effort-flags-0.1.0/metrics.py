#!/usr/bin/env python3
"""Generate METRICS.md from runs/.  Usage: python3 metrics.py > METRICS.md"""
import json, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "runs")
def rd(*p):
    try: return open(os.path.join(R, *p), encoding="utf-8").read()
    except OSError: return ""
print("# effort-flags-0.1.0 지표\n\n`python3 metrics.py > METRICS.md` 로 생성. 비용은 CLI 자가보고.\n")
print(f"## E01 Codex 모델별 effort 단계 ({rd('E01', 'codex-version.txt').strip()})\n\n| 모델 | 기본 | 지원 단계 |\n|---|---|---|")
for line in rd("E01", "levels.jsonl").splitlines():
    m = json.loads(line); print(f"| `{m['slug']}` | {m['default']} | {', '.join(l for l, _ in m['levels'])} |")
desc = {}
for line in rd("E01", "levels.jsonl").splitlines():
    for l, dsc in json.loads(line)["levels"]: desc.setdefault(l, dsc)
print("\n단계 설명(모델 목록 원문): " + " · ".join(f"`{k}` {v}" for k, v in desc.items()) + "\n")
print("## E02 `-c model_reasoning_effort` (인증 없음, 헤더만)\n\n| 값 | 헤더의 `reasoning effort:` | 설정 오류 | 연결 |\n|---|---|---|---|")
for v in ("xhigh", "high", "bogus"):
    out = rd("E02", v, "out.txt")
    eff = next((l.split(":", 1)[1].strip() for l in out.splitlines() if l.startswith("reasoning effort:")), "—")
    cfg_err = "있음" if "Error loading config" in out else "없음"
    print(f"| `{v}` | {eff} | {cfg_err} | {'401 Unauthorized' if '401 Unauthorized' in out else '—'} |")
print("\n## E03 `claude -p --effort`\n\n| 조합 | exit | stderr | init model | per_turn_effort_active | 답 | usd |\n|---|---|---|---|---|---|---|")
for c in ("opus-xhigh", "sonnet-high", "haiku-bogus"):
    init, res = {}, {}
    for line in rd("E03", c, "stream.jsonl").splitlines():
        d = json.loads(line)
        if d.get("type") == "system" and d.get("subtype") == "init": init = d
        if d.get("type") == "result": res = d
    err = " ".join(rd("E03", c, "stderr.txt").split())[:110] or "—"
    print(f"| `{c}` | {rd('E03', c, 'exit').strip()} | {err} | {init.get('model')} | {init.get('per_turn_effort_active')} | {res.get('result')} | {res.get('total_cost_usd')} |")
