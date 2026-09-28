#!/usr/bin/env python3
"""Generate METRICS.md from runs/ (never edit METRICS.md by hand).

Every number here comes from a file under runs/: CLI-reported tokens/cost/duration (Claude result event,
Codex turn.completed), runner-measured wall_ms, and the probe's own observation files.
Usage: python3 metrics.py > METRICS.md
"""
import json
import os
import re
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
RUNS = os.path.join(HERE, "runs")
SCHEMA = json.load(open(os.path.join(HERE, "subject/plugins/claude-x-codex/skills/run/references/review.schema.json")))


def read(path, default=""):
    try:
        return open(path, encoding="utf-8").read()
    except OSError:
        return default


def units(probe):
    base = os.path.join(RUNS, probe)
    out = []
    if not os.path.isdir(base):
        return out
    for arm in sorted(os.listdir(base)):
        for rep in sorted(os.listdir(os.path.join(base, arm))):
            d = os.path.join(base, arm, rep)
            if os.path.isfile(os.path.join(d, "DONE")):
                out.append((arm, rep, d))
    return out


def jsonl(path):
    rows = []
    for line in read(path).splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            pass
    return rows


def claude(d, name="stream.jsonl"):
    ev = jsonl(os.path.join(d, name))
    r = {"tools": None, "perm": None, "tool_uses": [], "hooks_ups": 0, "hook_outputs": [], "result": None}
    for e in ev:
        if e.get("type") == "system" and e.get("subtype") == "init":
            r["tools"] = e.get("tools")
            r["perm"] = e.get("permissionMode")
        if e.get("type") == "system" and e.get("subtype") == "hook_response" and e.get("hook_event") == "UserPromptSubmit":
            r["hooks_ups"] += 1
            r["hook_outputs"].append(e.get("output") or "")
        if e.get("type") == "assistant":
            for c in (e.get("message") or {}).get("content") or []:
                if c.get("type") == "tool_use":
                    r["tool_uses"].append((c.get("name"), c.get("input") or {}))
        if e.get("type") == "result":
            r["result"] = e
    return r


def claude_cost(res):
    if not res:
        return {}
    u = res.get("usage") or {}
    return {
        "in": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
        "cache_create": u.get("cache_creation_input_tokens", 0),
        "out": u.get("output_tokens", 0),
        "usd": res.get("total_cost_usd"),
        "dur": res.get("duration_ms"),
        "turns": res.get("num_turns"),
    }


def codex(d, name="events.jsonl"):
    ev = jsonl(os.path.join(d, name))
    r = {"cmds": [], "files": [], "usage": {}}
    for e in ev:
        it = e.get("item") or {}
        if e.get("type") == "item.completed" and it.get("type") == "command_execution":
            r["cmds"].append((it.get("command"), it.get("exit_code"), it.get("status")))
        if e.get("type") == "item.completed" and it.get("type") == "file_change":
            r["files"].append([c.get("path") for c in it.get("changes") or []])
        if e.get("type") == "turn.completed":
            u = e.get("usage") or {}
            for k, v in u.items():
                r["usage"][k] = r["usage"].get(k, 0) + (v or 0)
    return r


def schema_ok(obj, s=SCHEMA):
    t = s.get("type")
    if t == "object":
        if not isinstance(obj, dict):
            return False
        if s.get("additionalProperties") is False and set(obj) - set(s.get("properties", {})):
            return False
        if any(k not in obj for k in s.get("required", [])):
            return False
        return all(schema_ok(obj[k], sub) for k, sub in s.get("properties", {}).items() if k in obj)
    if t == "array":
        return isinstance(obj, list) and all(schema_ok(x, s.get("items", {})) for x in obj)
    if t == "string":
        return isinstance(obj, str) and ("enum" not in s or obj in s["enum"])
    if t == "integer":
        return isinstance(obj, int) and not isinstance(obj, bool)
    return True


def parse_json_text(text):
    try:
        return json.loads(text)
    except ValueError:
        return None


def wall(d, name="wall_ms"):
    v = read(os.path.join(d, name)).strip()
    return int(v) if v.isdigit() else None


def kn(pred, rows):
    return f"{sum(1 for x in rows if pred(x))}/{len(rows)}"


def one_line(s, n=70):
    s = " ".join(str(s).split())
    return (s[: n - 1] + "…") if len(s) > n else s


def fmt(v):
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:.4f}"
    return f"{v:,}" if isinstance(v, int) else str(v)


def table(header, rows):
    out = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    out += ["| " + " | ".join(fmt(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


P = []
P.append("# env-probes-0.1.0 지표\n")
P.append("`python3 metrics.py > METRICS.md` 로 생성한다 — 손으로 고치지 않는다. 토큰·비용·`dur`(duration_ms)은 CLI 자가보고,")
P.append("`wall` 은 러너가 잰 벽시계 ms. Claude 입력 토큰 `in` = input + cache_creation + cache_read. Codex `in` = input_tokens(캐시 포함), `cached` 는 그중 캐시분.")
P.append("S01·X16·X17·O01 전 arm과 X05 r1·X09 r1은 카나리 호출(`REPS=1`)에서 나온 단위다 — FINDINGS의 '실행 단위의 출처'.\n")

# ---------------------------------------------------------------- instruction files (Codex)
def codex_answer_rows(probe, words):
    rows = []
    for arm, rep, d in units(probe):
        c = codex(d)
        ans = read(os.path.join(d, "last.txt")).strip()
        rows.append([arm, rep, one_line(ans, 40), *["yes" if w in ans else "no" for w in words], len(c["cmds"]),
                     c["usage"].get("input_tokens"), c["usage"].get("cached_input_tokens"), c["usage"].get("output_tokens"), wall(d)])
    return rows


P.append("## 지침 파일 — Codex (X01–X04)\n")
for probe, words, title in [
    ("X01", ["PINEAPPLE-42"], "X01 `CLAUDE.md`만, 폴백 유무"),
    ("X02", ["GRAPE-2", "LEMON-1"], "X02 두 파일 다, 폴백 있음"),
    ("X03", ["ROOT-5", "SUB-6"], "X03 중첩 `sub/CLAUDE.md`, `-C sub`, 폴백 있음"),
    ("X04", ["IMPORT-8"], "X04 `CLAUDE.md` 안의 `@rules.md`, 폴백 있음"),
]:
    rows = codex_answer_rows(probe, words)
    P.append(f"### {title}\n")
    P.append(table(["arm", "run", "답", *[f"{w} 포함" for w in words], "실행한 명령", "in", "cached", "out", "wall"], rows) + "\n")

# ---------------------------------------------------------------- instruction files (Claude)
P.append("## 지침 파일 — Claude (X05–X07)\n")
for probe, words, title in [
    ("X05", ["MANGO-7"], "X05 `AGENTS.md`만, 도구 없음"),
    ("X06", ["LEMON-1", "GRAPE-2"], "X06 두 파일 다, 도구 없음"),
    ("X07", ["MANGO-7", "KIWI-3", "PLUM-9"], "X07 중첩 파일, `--tools Read`"),
]:
    rows = []
    for arm, rep, d in units(probe):
        c = claude(d)
        res = c["result"] or {}
        cost = claude_cost(res)
        reads = [i.get("file_path", "") for n, i in c["tool_uses"] if n == "Read"]
        instr_read = any(os.path.basename(x) in ("AGENTS.md", "CLAUDE.md") for x in reads)
        row = [arm, rep, one_line(res.get("result", ""), 36), *["yes" if w in str(res.get("result", "")) else "no" for w in words],
               "[]" if c["tools"] == [] else ",".join(c["tools"] or []), ",".join(os.path.basename(os.path.dirname(x)) + "/" + os.path.basename(x) for x in reads) or "—",
               "YES" if instr_read else "no", cost.get("in"), cost.get("out"), cost.get("usd"), wall(d)]
        rows.append(row)
    P.append(f"### {title}\n")
    P.append(table(["arm", "run", "답", *[f"{w} 포함" for w in words], "init tools", "Read 대상", "지시 파일 직접 읽음", "in", "out", "usd", "wall"], rows) + "\n")

# ---------------------------------------------------------------- structured output
P.append("## 구조화 출력 (X08–X09)\n")
rows = []
for arm, rep, d in units("X08"):
    c = codex(d)
    obj = parse_json_text(read(os.path.join(d, "last.txt")))
    rows.append(["X08 codex --output-schema", rep, "yes" if obj is not None and schema_ok(obj) else "no",
                 (obj or {}).get("verdict") if isinstance(obj, dict) else "—", len((obj or {}).get("findings", [])) if isinstance(obj, dict) else "—",
                 c["usage"].get("input_tokens"), c["usage"].get("output_tokens"), "—", "—", wall(d)])
for arm, rep, d in units("X09"):
    c = claude(d)
    res = c["result"] or {}
    so = res.get("structured_output")
    cost = claude_cost(res)
    rows.append(["X09 claude --json-schema", rep, "yes" if so is not None and schema_ok(so) else "no",
                 (so or {}).get("verdict") if isinstance(so, dict) else "—", len((so or {}).get("findings", [])) if isinstance(so, dict) else "—",
                 cost.get("in"), cost.get("out"), cost.get("usd"), cost.get("turns"), wall(d)])
P.append(table(["probe", "run", "스키마 적합", "verdict", "findings", "in", "out", "usd", "turns", "wall"], rows) + "\n")

# ---------------------------------------------------------------- read-only reviewers
P.append("## 리뷰어 read-only (X10–X11)\n")
rows = []
for arm, rep, d in units("X10"):
    c = claude(d)
    res = c["result"] or {}
    obs = read(os.path.join(d, "observe.txt"))
    denied = [x.get("tool_name") for x in res.get("permission_denials") or []]
    tried = [n for n, _ in c["tool_uses"] if n not in ("StructuredOutput",)]
    so = res.get("structured_output")
    cost = claude_cost(res)
    rows.append(["X10 claude", arm, rep, "YES" if "x_exists=yes" in obs else "no", ",".join(tried) or "—", ",".join(denied) or "—",
                 "yes" if so is not None and schema_ok(so) else "no", cost.get("usd"), wall(d)])
for arm, rep, d in units("X11"):
    c = codex(d)
    obs = read(os.path.join(d, "observe.txt"))
    obj = parse_json_text(read(os.path.join(d, "last.txt")))
    cmds = "; ".join(f"{one_line(cmd, 40)}→{ec}" for cmd, ec, st in c["cmds"]) or "—"
    rows.append(["X11 codex", arm, rep, "YES" if "x_exists=yes" in obs else "no", cmds, f"file_change={len(c['files'])}",
                 "yes" if obj is not None and schema_ok(obj) else "no", c["usage"].get("input_tokens"), wall(d)])
P.append(table(["probe", "arm", "run", "x.txt 생성", "시도한 도구/명령", "거부·변경", "리뷰 스키마 적합", "usd / in", "wall"], rows) + "\n")

# ---------------------------------------------------------------- transport smoke
P.append("## transport 스모크 (X12, n=1)\n")
for arm, rep, d in units("X12"):
    w = codex(d, "worker.events.jsonl")
    cr = codex(d, "codex-reviewer.events.jsonl")
    cres = parse_json_text(read(os.path.join(d, "claude-reviewer.result.json"))) or {}
    ccost = claude_cost(cres)
    rv_codex = parse_json_text(read(os.path.join(d, "state/reviews/p1-r1.json")))
    rv_claude = parse_json_text(read(os.path.join(d, "state/reviews/p1-r1-claude.json")))
    ret = read(os.path.join(d, "state/returns/T1.md"))
    diff = read(os.path.join(d, "phase.diff"))
    rows = [
        ["worker (codex-bulk)", read(os.path.join(d, "worker.exit")).strip(), read(os.path.join(d, "gate.txt")).strip(),
         f"return {len(ret)} chars", f"main tree status lines={len([l for l in read(os.path.join(d, 'main-tree-status.txt')).splitlines() if l.strip()])}",
         w["usage"].get("input_tokens"), w["usage"].get("output_tokens"), "—", wall(d, "worker.wall_ms")],
        ["phase diff", "—", f"+{sum(1 for l in diff.splitlines() if l.startswith('+') and not l.startswith('+++'))} lines", "—", "—", "—", "—", "—", "—"],
        ["codex reviewer (sol)", read(os.path.join(d, "codex-reviewer.exit")).strip(),
         "schema ok" if rv_codex is not None and schema_ok(rv_codex) else "schema FAIL", f"verdict={(rv_codex or {}).get('verdict')}",
         f"findings={len((rv_codex or {}).get('findings', []))}", cr["usage"].get("input_tokens"), cr["usage"].get("output_tokens"), "—", wall(d, "codex-reviewer.wall_ms")],
        ["claude reviewer (opus)", read(os.path.join(d, "claude-reviewer.exit")).strip(),
         "schema ok" if rv_claude is not None and schema_ok(rv_claude) else "schema FAIL", f"verdict={(rv_claude or {}).get('verdict')}",
         f"findings={len((rv_claude or {}).get('findings', []))}", ccost.get("in"), ccost.get("out"), ccost.get("usd"), wall(d, "claude-reviewer.wall_ms")],
    ]
    P.append(table(["단계", "exit", "결과", "비고1", "비고2", "in", "out", "usd", "wall"], rows) + "\n")

# ---------------------------------------------------------------- claude worker
P.append("## Claude worker 형태 (X13)\n")
rows = []
for arm, rep, d in units("X13"):
    c = claude(d)
    res = c["result"] or {}
    denied = [x.get("tool_name") for x in res.get("permission_denials") or []]
    cost = claude_cost(res)
    rows.append([rep, "yes" if "edited=yes" in read(os.path.join(d, "observe.txt")) else "no", ",".join(n for n, _ in c["tool_uses"]) or "—",
                 ",".join(denied) or "—", c["perm"], cost.get("usd"), wall(d)])
P.append(table(["run", "편집 반영", "시도한 도구", "거부된 도구", "permissionMode", "usd", "wall"], rows) + "\n")

# ---------------------------------------------------------------- small CLI facts
P.append("## CLI 세부 동작 (X14–X17, n=1)\n")
rows = []
for arm, rep, d in units("X14"):
    rows.append(["X14 `-o` + `-C`", arm, one_line(read(os.path.join(d, "observe.txt")) or "not found", 60), read(os.path.join(d, "exit")).strip(), "—"])
for arm, rep, d in units("X15"):
    rows.append(["X15 stdin", arm, one_line(read(os.path.join(d, "last.txt")), 40) or "—", "—", wall(d)])
for arm, rep, d in units("X16"):
    rows.append(["X16 `--allowedTools` 순서", arm, one_line(read(os.path.join(d, "stderr.txt")).splitlines()[0] if read(os.path.join(d, "stderr.txt")).strip() else "(no stderr)", 60),
                 read(os.path.join(d, "exit")).strip(), "—"])
for arm, rep, d in units("X17"):
    out = read(os.path.join(d, "out.txt"))
    key = next((l for l in out.splitlines() if l.startswith("Error loading") or l.startswith("model:")), "")
    rows.append(["X17 profile 형식", arm, one_line(key, 60), read(os.path.join(d, "exit")).strip(), "—"])
P.append(table(["probe", "arm", "관측", "exit", "wall"], rows) + "\n")

# ---------------------------------------------------------------- mode note
P.append("## mode 메모 비용 (X18)\n")
P.append("Claude Code 2.1.283의 stream-json은 UserPromptSubmit 훅 이벤트를 내보내지 않는다(이 실험의 모든 run에서 0). 그래서 훅이 넣은")
P.append("맥락은 **같은 프롬프트의 입력 토큰 차이**로 본다. 훅 출력 본문은 스트림에 없으므로 '메모 포함' 여부는 직접 관측할 수 없다.\n")
rows = []
ins = {"on": [], "off": []}
for arm, rep, d in units("X18"):
    c = claude(d)
    cost = claude_cost(c["result"])
    ins.setdefault(arm, []).append(cost.get("in") or 0)
    rows.append([arm, rep, c["hooks_ups"], cost.get("in"), cost.get("usd"), wall(d)])
P.append(table(["arm", "run", "UserPromptSubmit 훅 이벤트 수", "in", "usd", "wall"], rows) + "\n")
if ins["on"] and ins["off"]:
    P.append(f"입력 토큰: on {sorted(ins['on'])} · off {sorted(ins['off'])} · 중앙값 차 {statistics.median(ins['on']) - statistics.median(ins['off']):,.0f}"
             f" · 같은 arm 안 범위 on {max(ins['on']) - min(ins['on'])} / off {max(ins['off']) - min(ins['off'])}\n")

# ---------------------------------------------------------------- suite + static
P.append("## 결정적 스위트와 정적 확인 (S01, O01)\n")
for arm, rep, d in units("S01"):
    log = read(os.path.join(d, "suite.log"))
    fails = [l.strip() for l in log.splitlines() if l.strip().startswith("FAIL")]
    P.append(f"- S01: `{log.strip().splitlines()[-1] if log.strip() else '(empty)'}`, exit {read(os.path.join(d, 'exit')).strip()}" + (f", 실패: {fails}" if fails else ""))
for arm, rep, d in units("O01"):
    h = read(os.path.join(d, "worker-start-help.excerpt.txt"))
    P.append(f"- O01: Orca `{read(os.path.join(d, 'orca-version.txt')).strip()}` — help 발췌 {len(h.splitlines())}줄; "
             f"`--model` {'있음' if '--model <id>' in h else '없음'}, `--effort` {'있음' if '--effort <level>' in h else '없음'}, "
             f"권한 플래그 없음 문구 {'있음' if 'there is no flag for it' in h else '없음'}")
P.append("")

# ---------------------------------------------------------------- totals
tot_usd = 0.0
tot_codex_in = 0
n_claude = n_codex = 0
for probe in sorted(os.listdir(RUNS)) if os.path.isdir(RUNS) else []:
    for arm, rep, d in units(probe):
        for f in os.listdir(d):
            p = os.path.join(d, f)
            if f.endswith("stream.jsonl"):
                res = claude(d, f)["result"]
                if res and res.get("total_cost_usd") is not None:
                    tot_usd += res["total_cost_usd"]; n_claude += 1
            if f == "claude-reviewer.result.json":
                res = parse_json_text(read(p)) or {}
                if res.get("total_cost_usd") is not None:
                    tot_usd += res["total_cost_usd"]; n_claude += 1
            if f.endswith("events.jsonl"):
                u = codex(d, f)["usage"]
                if u:
                    tot_codex_in += u.get("input_tokens", 0) + u.get("output_tokens", 0); n_codex += 1
P.append("## 합계\n")
P.append(f"- Claude 호출 {n_claude}회, CLI 보고 비용 합계 ${tot_usd:.2f}")
P.append(f"- Codex 호출 {n_codex}회, CLI 보고 토큰 합계(in+out) {tot_codex_in:,}")
print("\n".join(P))
