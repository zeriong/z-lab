#!/usr/bin/env python3
"""Probe hook — logs every hook input and emits an exact-length additionalContext for the case's target.

usage: probe_hook.py <case.json> <EventName>   (hook input JSON on stdin)
"""
import json
import sys
from pathlib import Path

FILLER = "precedent platform probe filler sentence. "  # default; case.json "filler" overrides


def context(start, end, size, filler=FILLER):
    body = size - len(start) - len(end) - 2
    return f"{start} {(filler * (body // len(filler) + 1))[:body]} {end}"


def main():
    case_path, event_arg = Path(sys.argv[1]), sys.argv[2]
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw)
    except ValueError:
        payload = {"_unparsed": raw[:2000]}
    case = json.loads(case_path.read_text(encoding="utf-8"))
    event = payload.get("hook_event_name") or event_arg
    tool = payload.get("tool_name")
    rec = {k: v for k, v in payload.items() if k not in ("tool_response", "prompt")}
    rec["event_arg"] = event_arg
    rec["tool_response_head"] = json.dumps(payload.get("tool_response"), ensure_ascii=False)[:600]
    rec["prompt_head"] = str(payload.get("prompt", ""))[:200]
    emitted_path = case_path.parent / "emitted.json"
    emitted = json.loads(emitted_path.read_text()) if emitted_path.exists() else []
    out = None
    haystack = json.dumps(payload.get("tool_input"), ensure_ascii=False)
    for i, e in enumerate(case["emit"]):
        if e["event"] != event or i in emitted:
            continue
        if e.get("tools") and tool not in e["tools"]:
            continue
        if event != "UserPromptSubmit" and "alpha.ts" not in haystack:
            continue
        text = context(e["start"], e["end"], e["size"], case.get("filler", FILLER))
        out = {"hookSpecificOutput": {"hookEventName": event, "additionalContext": text}}
        emitted.append(i)
        emitted_path.write_text(json.dumps(emitted))
        rec["emitted"] = {"index": i, "chars": len(text), "bytes": len(text.encode())}
        break
    with open(case["log"], "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    if out:
        print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # fail open, but leave a trace
        try:
            with open(Path(sys.argv[1]).parent / "probe-error.txt", "a") as f:
                f.write(repr(exc) + "\n")
        except Exception:
            pass
    sys.exit(0)
