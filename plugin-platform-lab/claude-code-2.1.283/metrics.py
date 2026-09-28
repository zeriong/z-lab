#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).  Usage: python3 metrics.py > METRICS.md"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "runs")


def read(path):
    try:
        return open(path, encoding="utf-8").read()
    except OSError:
        return ""


def units(probe):
    base = os.path.join(RUNS, probe)
    out = []
    if os.path.isdir(base):
        for arm in sorted(os.listdir(base)):
            for rep in sorted(os.listdir(os.path.join(base, arm))):
                d = os.path.join(base, arm, rep)
                if os.path.isfile(os.path.join(d, "DONE")):
                    out.append((arm, rep, d))
    return out


def stream(d):
    r = {"init": {}, "ups": [], "tool_uses": [], "tool_results": [], "result": {}}
    for line in read(os.path.join(d, "stream.jsonl")).splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") == "system" and e.get("subtype") == "init":
            r["init"] = e
        if e.get("type") == "system" and e.get("subtype") == "hook_response" and e.get("hook_event") == "UserPromptSubmit":
            r["ups"].append(e.get("output") or "")
        if e.get("type") == "assistant":
            for c in (e.get("message") or {}).get("content") or []:
                if c.get("type") == "tool_use":
                    r["tool_uses"].append((c.get("name"), c.get("input") or {}))
        if e.get("type") == "user":
            for c in (e.get("message") or {}).get("content") or []:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    txt = c.get("content")
                    txt = txt if isinstance(txt, str) else json.dumps(txt, ensure_ascii=False)
                    r["tool_results"].append((bool(c.get("is_error")), txt))
        if e.get("type") == "result":
            r["result"] = e
    return r


def one(s, n=80):
    s = " ".join(str(s).split())
    return s[: n - 1] + "…" if len(s) > n else s


def table(h, rows):
    return "\n".join(["| " + " | ".join(h) + " |", "|" + "---|" * len(h)] + ["| " + " | ".join(str(c) for c in r) + " |" for r in rows])


def steps(tr):
    """Parse a transcript into rows of (command, exit, output lines); '# …' lines become phase rows."""
    out, cur = [], None
    for line in read(tr).splitlines():
        if line.startswith("# "):
            out.append((line[2:], "", ["(phase)"]))
        elif line.startswith("$ "):
            cur = [line[2:], "?", []]
        elif cur and line.startswith("exit="):
            cur[1] = line[5:]; out.append(tuple(cur)); cur = None
        elif cur and line.strip():
            cur[2].append(line.strip())
    return out


P = ["# claude-code-2.1.283 지표\n", "`python3 metrics.py > METRICS.md` 로 생성한다. 비용·시간은 CLI 자가보고(`usd`, `dur`), `wall` 은 러너 측정 ms.\n"]

P.append("## P01 스킬 호출명의 출처\n")
for arm, rep, d in units("P01"):
    s = stream(d)
    fm = re.search(r"^name: (.*)$", read(os.path.join(d, "plugin.txt")), re.M)
    P.append(table(["폴더", "frontmatter name", "init skills", "init slash_commands", "usd"],
                   [["skills/dirname/", fm.group(1) if fm else "—", ", ".join(s["init"].get("skills", [])), ", ".join(s["init"].get("slash_commands", [])),
                     s["result"].get("total_cost_usd")]]) + "\n")

for probe, title in (("P02", "P02 마켓플레이스·플러그인 이름 변경"), ("P03", "P03 재추가·재설치·없는 플러그인")):
    P.append(f"## {title}\n")
    for arm, rep, d in units(probe):
        rows = []
        for cmd, ex, body in steps(os.path.join(d, "transcript.txt")):
            cmd = re.sub(r"/\S*/(mkt|cfg)\b", r"<\1>", cmd)
            rows.append([f"`{cmd}`", ex, one(" / ".join(body), 110) or "(no output)"])
        P.append(table(["명령", "exit", "출력(요약: 줄 이어붙임)"], rows) + "\n")
        reg = read(os.path.join(d, "registered-names.txt")).strip()
        if reg:
            P.append(f"실행 후 등록된 마켓플레이스 이름: `{reg}`\n")

P.append("## P04 훅 자동 로드·중복·print 모드\n")
rows = []
for arm, rep, d in units("P04"):
    s = stream(d)
    v = read(os.path.join(d, "validate.txt"))
    rows.append([arm, len(s["ups"]), one(" / ".join(s["ups"]), 40) or "—", one(" ".join(l for l in v.splitlines() if "❯" in l or "✔" in l or "✘" in l), 90),
                 s["result"].get("total_cost_usd"), read(os.path.join(d, "wall_ms")).strip()])
P.append(table(["arm", "UserPromptSubmit 훅 응답 수", "훅 출력", "validate", "usd", "wall"], rows) + "\n")

P.append("## P05 `disable-model-invocation`\n")
rows = []
for arm, rep, d in units("P05"):
    s = stream(d)
    calls = [i.get("skill") or i.get("command") or json.dumps(i) for n, i in s["tool_uses"] if n == "Skill"]
    res = [("error: " if e else "ok: ") + one(t, 50) for e, t in s["tool_results"]]
    rows.append([arm, rep, ", ".join(s["init"].get("skills", [])), ",".join(s["init"].get("tools", [])), ", ".join(calls) or "—",
                 " / ".join(res) or "—", one(s["result"].get("result", ""), 20), s["result"].get("total_cost_usd")])
P.append(table(["arm", "run", "init skills", "init tools", "Skill 호출", "도구 결과", "최종 답", "usd"], rows) + "\n")
print("\n".join(P))
