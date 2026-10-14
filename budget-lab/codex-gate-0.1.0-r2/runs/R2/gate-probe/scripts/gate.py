#!/usr/bin/env python3
import json, os, re, sys, time
from pathlib import Path

QUESTION = "지정한 {n}%에 도달했습니다, 작업을 이어서 진행하시겠어요?"
YES = {"예", "yes", "y", "계속"}


def last_limits(path):
    """(timestamp, rate_limits, path) of the file's newest rate-limit record, or None."""
    found = None
    try:
        for line in Path(path).read_text().splitlines():
            if '"rate_limits"' not in line:
                continue
            try:
                event = json.loads(line)
            except ValueError:
                continue
            stack = [event]
            while stack:
                node = stack.pop()
                if isinstance(node, dict):
                    if isinstance(node.get("rate_limits"), dict):
                        found = (str(event.get("timestamp") or ""), node["rate_limits"], str(path))
                    stack.extend(node.values())
                elif isinstance(node, list):
                    stack.extend(node)
    except OSError:
        return None
    return found


def newest_limits(path):
    """The newest record among this session's rollout and the 20 most recently written rollouts beside it."""
    files = [Path(path)] if path else []
    sessions = Path(path).parents[3] if path else None
    if sessions is not None and sessions.is_dir():
        files += sorted(sessions.rglob("rollout-*.jsonl"), key=lambda f: f.stat().st_mtime, reverse=True)[:20]
    records = [r for r in (last_limits(f) for f in dict.fromkeys(files)) if r]
    if not records:
        return None
    newest = max(records, key=lambda r: r[0])
    return dict(newest[1], _source=newest[2], _timestamp=newest[0])


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
        limits = newest_limits(data.get("transcript_path") or "")
        w = window(limits)
        row["window"], row["source"] = w, limits and limits.get("_source")
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
