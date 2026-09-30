#!/usr/bin/env python3
"""Run SPEC.md's L02x. Usage: python3 run.py"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
import importlib.util  # noqa: E402

# Load r3's runner under its own name: both files are called run.py, and r3 imports the first
# sibling's runner as `run`.
_spec = importlib.util.spec_from_file_location("r3run", LAB.parent / "latest-model-r3-0.159.0" / "run.py")
r3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(r3)  # gives meta, ts, and r3.base: the first sibling's Case, env_with, codex_home

base = r3.base
base.RUNS = LAB / "runs"


def l02x(case):
    real = base.codex_home()
    auth_before = hashlib.sha256((real / "auth.json").read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix="l02x-") as tmp:
        home = Path(tmp) / "home"
        home.mkdir()
        for f in ("auth.json", "config.toml", "models_cache.json"):
            shutil.copy2(real / f, home / f)
        env = base.env_with(CODEX_HOME=str(home))
        warm, _ = case.run("warm", ["codex", "debug", "models"], env=env)
        calls = []
        t0 = time.monotonic()
        for i in range(42):
            time.sleep(max(0, t0 + 10 * i - time.monotonic()))
            before = r3.meta(home)
            start = time.time()
            proc, _ = case.run(f"call{i:02d}", ["codex", "debug", "models"], env=env)
            end = time.time()
            after = r3.meta(home)
            b, a = r3.ts(before["fetched_at"]), r3.ts(after["fetched_at"])
            calls.append({"i": i, "start": start, "end": end, "exit": proc.returncode, "before": before, "after": after,
                          "start_age_s": round(start - b, 3) if b else None,
                          "refreshed": a is not None and start <= a <= end,
                          "served": before["fetched_at"] == after["fetched_at"]})
    external = [c["i"] for p, c in zip(calls, calls[1:]) if p["after"]["fetched_at"] != c["before"]["fetched_at"]]
    served = [c["start_age_s"] for c in calls if c["served"] and c["start_age_s"] is not None]
    refreshed = [c["start_age_s"] for c in calls if c["refreshed"] and c["start_age_s"] is not None]
    return {"warm_exit": warm.returncode, "calls": calls,
            "largest_age_served_s": max(served) if served else None,
            "smallest_age_refreshed_s": min(refreshed) if refreshed else None,
            "refreshes_by_our_calls": len(refreshed), "external_writes_before_call": external,
            "real_auth_unchanged": hashlib.sha256((real / "auth.json").read_bytes()).hexdigest() == auth_before}


def main():
    case = base.Case("L02x")
    if (case.dir / "DONE").exists():
        return print("L02x: DONE, skipped")
    if case.dir.exists():
        sys.exit("L02x: incomplete directory exists; use a new sibling experiment")
    case.dir.mkdir(parents=True)
    case.finish(l02x(case))
    print("L02x: done")


if __name__ == "__main__":
    main()
