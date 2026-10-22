#!/usr/bin/env python3
"""POST-HOC (not pre-registered) counts added after analyze.py's D came out as 1 commit against 26 source commits.

1. D by *record* time: commit commands issued inside the window, grouped by session group
   (in-population / started-before-merge / excluded-analysis).
2. The same commit count over Codex rollouts whose session cwd is the repository (Codex `exec` input is JS text,
   so the raw input is matched without stripping quotes).
3. B and C per transcript, split top-level / subagent.
usage: python3 supplement.py --projects P --key K --exclude-session S --since T --until T --codex-sessions DIR
                             --cwd-match SUBSTRING
"""
import argparse
import collections
import json
import re
from pathlib import Path

COMMIT_RE = re.compile(r"(^|[\s;&|(])git(\s+-[Cc]\s+\S+)*\s+commit(\s|$)")
RAW_COMMIT_RE = re.compile(r"git(\s+-[Cc]\s+\S+)*\s+commit(\s|\\n|$)")
TOKEN_RE = re.compile(r"(^|\s)PRECEDENT_OK=1(\s|$)")
STOP_MARK = "⚠ 이 절의 결정·금지는"
EDIT_TOOLS = {"Edit", "Write", "MultiEdit"}


def unquote(cmd):
    return re.sub(r"'[^']*'", " ", re.sub(r'"(?:\\.|[^"\\])*"', " ", cmd))


def rows_of(f):
    out = []
    for line in f.read_text(errors="replace").splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def main():
    p = argparse.ArgumentParser()
    for a in ("--projects", "--key", "--exclude-session", "--since", "--until", "--codex-sessions", "--cwd-match"):
        p.add_argument(a, required=True)
    a = p.parse_args()
    D = collections.Counter()
    per = collections.Counter()
    for d in sorted(Path(a.projects).iterdir()):
        if not (d.name == a.key or d.name.startswith(a.key + "--claude-worktrees-")):
            continue
        for f in sorted(d.rglob("*.jsonl")):
            rows = rows_of(f)
            first = next((r["timestamp"] for r in rows if r.get("timestamp")), "")
            group = ("excluded-analysis" if a.exclude_session in f.parts or f.stem == a.exclude_session
                     else "started-before-merge" if first < a.since else "in-population")
            in_pop = group == "in-population" and first <= a.until
            role = "subagent" if "subagents" in f.parts else "top-level"
            stops, edit_after_stop, prec_after_stop, ask_after_stop, seen_stop = 0, False, False, False, False
            for r in rows:
                ts = r.get("timestamp") or ""
                att = r.get("attachment") or {}
                if in_pop and att.get("type") == "hook_additional_context" and STOP_MARK in "".join(
                        att.get("content") or []):
                    stops += 1
                    seen_stop = True
                if r.get("type") != "assistant":
                    continue
                for c in (r.get("message") or {}).get("content") or []:
                    if c.get("type") == "tool_use":
                        name, inp = c.get("name"), c.get("input") or {}
                        if name == "Bash" and a.since <= ts <= a.until:
                            cmd = unquote(str(inp.get("command", "")))
                            if COMMIT_RE.search(cmd) and "--help" not in cmd:
                                D[f"{group}:commits"] += 1
                                D[f"{group}:with-token"] += bool(TOKEN_RE.search(cmd))
                        if in_pop and seen_stop and name in EDIT_TOOLS:
                            edit_after_stop = True
                            prec_after_stop |= str(inp.get("file_path", "")).endswith("PRECEDENT.md")
                        if in_pop and seen_stop and name == "AskUserQuestion":
                            ask_after_stop = True
                    elif in_pop and seen_stop and c.get("type") == "text" and "무효화 사유" in c.get("text", ""):
                        ask_after_stop = True
            if in_pop:
                per[f"{role}:transcripts"] += 1
                per[f"{role}:with-stop"] += stops > 0
                per[f"{role}:stop-events"] += stops
                per[f"{role}:any-edit-after-stop"] += edit_after_stop
                per[f"{role}:precedent-edit-after-stop"] += prec_after_stop
                per[f"{role}:ask-candidate-after-stop"] += ask_after_stop
    X = collections.Counter()
    for f in sorted(Path(a.codex_sessions).rglob("*.jsonl")):
        rows = rows_of(f)
        meta = next((r.get("payload", {}) for r in rows if r.get("type") == "session_meta"), {})
        if a.cwd_match.lower() not in str(meta.get("cwd", "")).lower():
            continue
        if not (a.since <= str(meta.get("timestamp", "")) <= a.until):
            continue
        X["rollouts"] += 1
        for r in rows:
            pl = r.get("payload") or {}
            if r.get("type") == "response_item" and pl.get("type") in ("function_call", "custom_tool_call"):
                raw = str(pl.get("input") or pl.get("arguments") or "")
                if RAW_COMMIT_RE.search(raw) and "--help" not in raw:
                    X["commit-calls"] += 1
                    X["with-token"] += bool(re.search(r"PRECEDENT_OK=1\s", raw))
    out = ["# SUPPLEMENT — 사후 보조 집계 (사전 등록 아님, 생성: supplement.py)", "",
           "## D′. 창 안의 커밋 명령 — 레코드 시각 기준, 세션 묶음별 (Claude)", "",
           "| 묶음 | 커밋 명령 | `PRECEDENT_OK=1` |", "|---|---:|---:|",
           *[f"| {g} | {D[g + ':commits']} | {D[g + ':with-token']} |"
             for g in ("in-population", "started-before-merge", "excluded-analysis")], "",
           "## D″. Codex rollout (세션 cwd 가 레포, 세션 시작이 창 안)", "",
           f"- rollout {X['rollouts']} · 커밋 호출 {X['commit-calls']} · `PRECEDENT_OK=1` {X['with-token']}", "",
           "## C′. transcript 단위 (모집단만)", "",
           "| 항목 | 최상위 | 서브에이전트 |", "|---|---:|---:|",
           *[f"| {k} | {per['top-level:' + k]} | {per['subagent:' + k]} |"
             for k in ("transcripts", "with-stop", "stop-events", "any-edit-after-stop", "precedent-edit-after-stop",
                       "ask-candidate-after-stop")]]
    print("\n".join(out))


if __name__ == "__main__":
    main()
