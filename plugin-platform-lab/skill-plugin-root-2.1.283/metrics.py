#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).  Usage: python3 metrics.py > METRICS.md"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "runs")
TMP = re.compile(r"/(?:var/folders|tmp|private)/\S*?/probe/")   # mktemp prefix differs per machine


def calls(path):
    uses, out, res = {}, [], {}
    for line in open(path, encoding="utf-8"):
        e = json.loads(line)
        for c in (e.get("message") or {}).get("content") or [] if e.get("type") in ("assistant", "user") else []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                uses[c["id"]] = (c.get("input") or {}).get("command", "")
            if isinstance(c, dict) and c.get("type") == "tool_result":
                t = c.get("content"); t = t if isinstance(t, str) else json.dumps(t)
                out.append((uses.get(c.get("tool_use_id"), ""), " ".join(t.split())))
        if e.get("type") == "result":
            res = e
    u = res.get("usage") or {}
    tokens = sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
    return out, tokens, res.get("duration_ms"), res.get("total_cost_usd") or 0


print("# skill-plugin-root-2.1.283 지표\n")
print("`python3 metrics.py > METRICS.md` 로 생성. 명령·결과는 stream-json의 Bash `tool_use` / `tool_result` 원문이고, "
      "mktemp 경로 앞부분만 `<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·비용과 함께 CLI 자가보고.\n")
print("| run | 명령 1 (중괄호 `${CLAUDE_PLUGIN_ROOT}`) | 텍스트 치환 | 결과 1 | 명령 2 (중괄호 없는 `$CLAUDE_PLUGIN_ROOT`) | 결과 2 | 입력 토큰 | duration ms | usd |")
print("|---|---|---|---|---|---|---|---|---|")
for rep in sorted(os.listdir(R)):
    d = os.path.join(R, rep)
    if not os.path.isfile(os.path.join(d, "DONE")):
        continue
    out, tokens, ms, usd = calls(os.path.join(d, "stream.jsonl"))
    c1, r1 = next(((c, r) for c, r in out if "hello.sh" in c), ("", ""))
    c2, r2 = next(((c, r) for c, r in out if "CPR=" in c), ("", ""))
    sub = "yes" if "${CLAUDE_PLUGIN_ROOT}" not in c1 and "/probe/scripts/hello.sh" in c1 else "no"
    s = lambda x: TMP.sub("<tmp>/probe/", x)
    print(f"| {rep} | `{s(c1)}` | {sub} | `{s(r1)}` | `{c2}` | `{r2}` | {tokens:,} | {ms:,} | {usd:.4f} |")
