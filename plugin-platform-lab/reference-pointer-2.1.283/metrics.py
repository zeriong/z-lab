#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).  Usage: python3 metrics.py > METRICS.md"""
import json, os, re, statistics
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "runs")
TMP = re.compile(r"/(?:var/folders|tmp|private)/\S*?/probe/")   # mktemp prefix differs per machine


def run(d):
    uses, bash, res = {}, [], {}
    for line in open(os.path.join(d, "stream.jsonl"), encoding="utf-8"):
        e = json.loads(line)
        for c in (e.get("message") or {}).get("content") or [] if e.get("type") in ("assistant", "user") else []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                uses[c["id"]] = (c["name"], c.get("input") or {})
            if isinstance(c, dict) and c.get("type") == "tool_result":
                n, i = uses.get(c.get("tool_use_id"), ("", {}))
                t = c.get("content"); t = t if isinstance(t, str) else json.dumps(t)
                if n == "Bash":
                    bash.append((i.get("command", ""), " ".join(t.split())))
        if e.get("type") == "result":
            res = e
    u = res.get("usage") or {}
    tokens = sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
    return bash, tokens, res.get("duration_ms"), res.get("total_cost_usd") or 0


print("# reference-pointer-2.1.283 지표\n")
print("`python3 metrics.py > METRICS.md` 로 생성. 명령·결과는 stream-json의 Bash `tool_use` / `tool_result` 원문이고 mktemp 경로 앞부분은 "
      "`<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·비용과 함께 CLI 자가보고.\n")
print("| arm | run | 첫 Bash 명령 | 첫 Bash 결과 | 첫 호출 HELLO-MARK | Bash 호출 수 | 입력 토큰 | duration ms | usd |")
print("|---|---|---|---|---|---|---|---|---|")
summary = {}
for arm in ("pointer", "alias"):
    for rep in sorted(os.listdir(os.path.join(R, arm))):
        d = os.path.join(R, arm, rep)
        if not os.path.isfile(os.path.join(d, "DONE")):
            continue
        bash, tokens, ms, usd = run(d)
        c1, r1 = bash[0] if bash else ("", "")
        ok = "HELLO-MARK" in r1
        summary.setdefault(arm, []).append((ok, tokens, ms, usd))
        s = lambda x: TMP.sub("<tmp>/probe/", x)
        print(f"| {arm} | {rep} | `{s(c1)}` | `{s(r1)[:90]}` | {'yes' if ok else 'no'} | {len(bash)} | {tokens:,} | {ms:,} | {usd:.4f} |")
print("\n## 요약\n")
for arm, rs in summary.items():
    print(f"- {arm}: 첫 호출 HELLO-MARK {sum(r[0] for r in rs)}/{len(rs)}, 입력 토큰 중앙값 {statistics.median(r[1] for r in rs):,.0f}, "
          f"duration 중앙값 {statistics.median(r[2] for r in rs):,.0f} ms, 비용 합계 ${sum(r[3] for r in rs):.4f}")
