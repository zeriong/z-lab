#!/usr/bin/env python3
import json, os, sys, time
start = time.time()
time.sleep(15)
with open(os.path.join(os.environ["PROBE_DIR"], "marker.json"), "w") as out:
    json.dump({"start": start, "end": time.time(), "ppid": os.getppid(), "pid": os.getpid()}, out)
