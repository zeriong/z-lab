#!/usr/bin/env python3
import json, os, subprocess, sys, time
probe = os.environ["PROBE_DIR"]
flag = os.path.join(probe, "spawned")
sys.stdin.read()
if os.path.exists(flag):
    sys.exit(0)
open(flag, "w").close()
start = time.time()
def mask(name, value):
    secret = any(word in name.upper() for word in ("TOKEN", "KEY", "SECRET", "AUTH", "PASSWORD"))
    return "***" if secret else value[:200]
env = {k: mask(k, v) for k, v in os.environ.items() if k.startswith(("CLAUDE", "CODEX"))}
child = json.loads(os.environ["PROBE_CHILD"])
with open(os.path.join(probe, "child.out"), "wb") as out:
    subprocess.Popen(child, cwd=os.environ.get("PROBE_CWD") or None, stdin=subprocess.DEVNULL, stdout=out,
                     stderr=subprocess.STDOUT, start_new_session=True)
with open(os.path.join(probe, "hook.json"), "w") as log:
    json.dump({"start": start, "end": time.time(), "env_names": sorted(os.environ), "env": env}, log, indent=1)
