#!/usr/bin/env python3
import hashlib, json, os, sys, time
event = sys.argv[1]
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    data = {"unparsed": raw[:300]}
def cut(value):
    if isinstance(value, str):
        return value[:300]
    if isinstance(value, dict):
        return {k: cut(v) for k, v in value.items()}
    if isinstance(value, list):
        return [cut(v) for v in value[:20]]
    return value
watch = None
path = os.environ.get("PROBE_WATCH")
if path and os.path.exists(path):
    body = open(path, "rb").read()
    watch = [os.stat(path).st_mtime_ns, hashlib.sha256(body).hexdigest()[:12], body.decode("utf-8", "replace")]
row = {"at": time.time(), "event": event, "keys": sorted(data) if isinstance(data, dict) else None, "input": cut(data),
       "watch": watch}
with open(os.environ["PROBE_LOG"], "a") as log:
    log.write(json.dumps(row) + "\n")
