#!/usr/bin/env python3
import json, os, re, sys, time
from pathlib import Path

QUESTION = "지정한 {n}%에 도달했습니다, 작업을 이어서 진행하시겠어요?"
YES = {"예", "yes", "y", "계속"}


def newest_limits(path):
    found = None
    try:
        for line in Path(path).read_text().splitlines():
            if '"rate_limits"' not in line:
                continue
            try:
                stack = [json.loads(line)]
            except ValueError:
                continue
            while stack:
                node = stack.pop()
                if isinstance(node, dict):
                    if isinstance(node.get("rate_limits"), dict):
                        found = node["rate_limits"]
                    stack.extend(node.values())
                elif isinstance(node, list):
                    stack.extend(node)
    except OSError:
        return None
    return found


def window(limits):
    for key in ("primary", "secondary"):
        w = (limits or {}).get(key)
        if isinstance(w, dict) and w.get("window_minutes") == 10080:
            return w
    return None


def main():
    event = sys.argv[1]
    data = json.loads(sys.stdin.read() or "{}")
    repo = Path(data.get("cwd") or ".")
    state = Path(os.environ["XDG_CONFIG_HOME"]) / "because-i-needed"
    sid = data.get("session_id") or "none"
    pending, ack = state / "pending" / f"{sid}.json", state / "acks" / f"{sid}.json"
    row = {"event": event, "session_id": sid, "at": time.time()}
    out = None
    try:
        n = json.loads((state / "budget.json").read_text())["percent"]
    except (OSError, ValueError, KeyError):
        n = None
    row["threshold"] = n
    if event == "PreToolUse" and n is not None:
        w = window(newest_limits(data.get("transcript_path") or ""))
        row["window"] = w
        acked = json.loads(ack.read_text()).get("resets_at") if ack.exists() else None
        row["acked"] = acked
        if w and w.get("used_percent", 0) >= n and acked != w.get("resets_at"):
            pending.parent.mkdir(parents=True, exist_ok=True)
            pending.write_text(json.dumps({"resets_at": w.get("resets_at"), "used": w.get("used_percent")}))
            reason = (f"budget: the usage window is at {w.get('used_percent')}% (threshold {n}%). Do not run anything "
                      f"else. End your turn now and ask the user exactly: \"{QUESTION.format(n=n)}\" (예/아니오)")
            out = {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                          "permissionDecisionReason": reason}}
            row["decision"] = "deny"
        else:
            row["decision"] = "allow"
    elif event == "UserPromptSubmit" and pending.exists():
        answer = (data.get("prompt") or "").strip().lower()
        row["answer"] = answer
        if answer in YES:
            ack.parent.mkdir(parents=True, exist_ok=True)
            ack.write_text(json.dumps({"resets_at": json.loads(pending.read_text()).get("resets_at")}))
            pending.unlink()
            note, row["decision"] = "budget: the user chose to continue.", "ack"
        else:
            note, row["decision"] = "budget: the user did not confirm; do not run tools until they answer 예.", "hold"
        out = {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": note}}
    log = repo / ".probe" / "gate.jsonl"
    log.parent.mkdir(exist_ok=True)
    with open(log, "a") as handle:
        handle.write(json.dumps(row) + "\n")
    if out:
        print(json.dumps(out))


main()
