#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).  Usage: python3 metrics.py > METRICS.md"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(HERE, "runs")
TMP = re.compile(r"/(?:var/folders|tmp|private)/\S*?/probe/")   # mktemp prefix differs per machine
LIT = "${CLAUDE_PLUGIN_ROOT}"

print("# reference-plugin-root-2.1.283 지표\n")
print("`python3 metrics.py > METRICS.md` 로 생성. stream-json의 `tool_use` / `tool_result` 원문에서 셌고, mktemp 경로 앞부분은 "
      "`<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·턴·비용과 함께 CLI 자가보고.\n")
print("| run | Read 결과에 리터럴 변수 | 첫 Bash 명령 | 첫 Bash 결과 | HELLO-MARK 도달 | Bash 호출 수 | turns | 입력 토큰 | duration ms | usd |")
print("|---|---|---|---|---|---|---|---|---|---|")
for rep in sorted(os.listdir(R)):
    d = os.path.join(R, rep)
    if not os.path.isfile(os.path.join(d, "DONE")):
        continue
    uses, res, result = {}, [], {}
    for line in open(os.path.join(d, "stream.jsonl"), encoding="utf-8"):
        e = json.loads(line)
        for c in (e.get("message") or {}).get("content") or [] if e.get("type") in ("assistant", "user") else []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                uses[c["id"]] = (c["name"], c.get("input") or {})
            if isinstance(c, dict) and c.get("type") == "tool_result":
                t = c.get("content"); t = t if isinstance(t, str) else json.dumps(t)
                res.append((uses.get(c.get("tool_use_id"), ("", {})), " ".join(t.split())))
        if e.get("type") == "result":
            result = e
    reads = [r for (n, i), r in res if n == "Read" and "steps.md" in i.get("file_path", "")]
    bash = [(i.get("command", ""), r) for (n, i), r in res if n == "Bash"]
    u = result.get("usage") or {}
    tokens = sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
    s = lambda x: TMP.sub("<tmp>/probe/", x)
    c1, r1 = bash[0] if bash else ("", "")
    print(f"| {rep} | {'yes' if reads and LIT in reads[0] else 'no'} | `{s(c1)}` | `{s(r1)}` | "
          f"{'yes' if any('HELLO-MARK' in r for _, r in bash) else 'no'} | {len(bash)} | {result.get('num_turns')} | {tokens:,} | {result.get('duration_ms'):,} | "
          f"{result.get('total_cost_usd') or 0:.4f} |")
