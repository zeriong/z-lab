#!/usr/bin/env python3
import json, sys
from pathlib import Path
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    data = {"unparsed": raw[:500]}
repo = Path(data.get("cwd") or ".")
log = repo / ".probe" / "command.jsonl"
log.parent.mkdir(exist_ok=True)
with open(log, "a") as out:
    out.write(json.dumps({"event": sys.argv[1], "input": {k: data.get(k) for k in
        ("hook_event_name", "session_id", "tool_name", "source")}}) + "\n")
