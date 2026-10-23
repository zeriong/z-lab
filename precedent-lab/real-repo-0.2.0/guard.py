"""PreToolUse guard written outside every E7 repo and passed with --settings: no dependency installs, no package
downloads, no pushes (z-lab Article 2). With E7_GATE_MAIN=1 it also denies the orchestrator's file tools, as in E6."""
import json
import os
import re
import sys

DENY_BASH = re.compile(r"\b(pnpm|npm|yarn|bun)\s+(install|i|add|ci|dlx)\b|\bnpx\b|\bgit\s+push\b|\bcorepack\b")
FILE_TOOLS = {"Read", "Edit", "Write", "MultiEdit", "NotebookEdit", "Bash", "Grep", "Glob"}
e = json.load(sys.stdin)
tool, cmd = e.get("tool_name"), str((e.get("tool_input") or {}).get("command", ""))
reason = None
if tool == "Bash" and DENY_BASH.search(cmd):
    reason = "This checkout has no network installs and no remote: dependency installs, package downloads and pushes are disabled."
elif os.environ.get("E7_GATE_MAIN") == "1" and not e.get("agent_id") and tool in FILE_TOOLS:
    reason = "In this setup the orchestrator does not open or change repository files. Delegate that to the subagent."
if reason:
    with open(sys.argv[1], "a") as f:
        f.write(json.dumps({"tool": tool, "agent": e.get("agent_id"), "cmd": cmd[:200]}) + "\n")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                             "permissionDecisionReason": reason}}))
