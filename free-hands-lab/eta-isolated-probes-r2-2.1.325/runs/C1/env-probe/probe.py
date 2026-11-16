#!/usr/bin/env python3
import json, os, shutil, subprocess, sys, time
sys.stdin.read()
out = os.environ.get("PROBE_LOG") or os.path.join(os.getcwd(), ".probe", "hook.json")
if os.path.exists(out):
    sys.exit(0)
def mask(name, value):
    return "***" if any(w in name.upper() for w in ("TOKEN", "KEY", "SECRET", "AUTH", "PASSWORD")) else value[:200]
def comm(pid):
    try:
        return subprocess.run(["ps", "-o", "comm=", "-p", str(pid)], capture_output=True, text=True).stdout.strip()
    except Exception as error:
        return f"error: {error}"
pid = os.environ.get("CLAUDE_PID")
row = {"at": time.time(), "env_names": sorted(os.environ),
       "env": {k: mask(k, v) for k, v in os.environ.items() if k.startswith(("CLAUDE", "CODEX"))},
       "which_claude": shutil.which("claude"), "ppid": os.getppid(), "ppid_comm": comm(os.getppid()),
       "claude_pid_comm": comm(pid) if pid else None, "cwd": os.getcwd()}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as log:
    json.dump(row, log, indent=1)
