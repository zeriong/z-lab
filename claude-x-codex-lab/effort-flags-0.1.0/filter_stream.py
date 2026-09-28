#!/usr/bin/env python3
"""Filter a `claude -p --output-format stream-json` stream before it is saved to this public repo.

Keeps everything the probes measure; drops what describes the host machine rather than the probe:
  - system/init   → model, permissionMode, built-in tool names, and only the plugins/skills/commands whose
                    name starts with a prefix in KEEP_PREFIXES; everything else becomes a count.
  - hook events   → metadata always; the output body only if it comes from a probed plugin (KEEP_MARKERS).
  - other system events that list the whole command catalog → count only.
All other events (assistant, user/tool results, result) pass through unchanged.

Usage: filter_stream.py <in.jsonl >out.jsonl
  KEEP_PREFIXES="claude-x-codex,probe"  KEEP_MARKERS="[claude-x-codex,HOOK-MARK"
"""
import json
import os
import sys

KEEP_PREFIXES = [p for p in os.environ.get("KEEP_PREFIXES", "claude-x-codex").split(",") if p]
KEEP_MARKERS = [m for m in os.environ.get("KEEP_MARKERS", "[claude-x-codex").split(",") if m]
BUILTIN_PLUGINS = {"agents-md", "telemetry"}


def keep_name(name):
    return any(str(name).startswith(p) for p in KEEP_PREFIXES)


def filter_init(d):
    tools = d.get("tools") or []
    plugins = d.get("plugins") or []
    out = {
        "type": d.get("type"),
        "subtype": d.get("subtype"),
        "model": d.get("model"),
        "permissionMode": d.get("permissionMode"),
        "per_turn_effort_active": d.get("per_turn_effort_active"),
        "tools": [t for t in tools if not str(t).startswith("mcp__")],
        "tools_mcp_count": sum(1 for t in tools if str(t).startswith("mcp__")),
        "plugins": [p.get("name") for p in plugins if keep_name(p.get("name")) or p.get("name") in BUILTIN_PLUGINS],
        "plugins_other_count": sum(1 for p in plugins if not (keep_name(p.get("name")) or p.get("name") in BUILTIN_PLUGINS)),
        "mcp_servers_count": len(d.get("mcp_servers") or []),
    }
    for key in ("skills", "slash_commands", "agents"):
        vals = d.get(key) or []
        names = [v if isinstance(v, str) else v.get("name", "") for v in vals]
        out[key] = [n for n in names if keep_name(n)]
        out[key + "_other_count"] = sum(1 for n in names if not keep_name(n))
    return out


def filter_hook(d):
    out = {k: d.get(k) for k in ("type", "subtype", "hook_id", "hook_name", "hook_event", "exit_code", "outcome") if k in d}
    body = (d.get("output") or "") + (d.get("stdout") or "")
    if any(m in body for m in KEEP_MARKERS):
        out["output"] = d.get("output")
    elif body:
        out["output_redacted_chars"] = len(body)
    return out


for line in sys.stdin:
    line = line.rstrip("\n")
    if not line:
        continue
    try:
        d = json.loads(line)
    except ValueError:
        print(json.dumps({"unparsed_line_chars": len(line)}))
        continue
    if d.get("type") == "system":
        sub = d.get("subtype")
        if sub == "init":
            d = filter_init(d)
        elif sub in ("hook_started", "hook_response"):
            d = filter_hook(d)
        elif "commands" in d:
            d = {"type": "system", "subtype": sub, "commands_count": len(d.get("commands") or [])}
    print(json.dumps(d, ensure_ascii=False))
