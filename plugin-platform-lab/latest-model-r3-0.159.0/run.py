#!/usr/bin/env python3
"""Run the SPEC.md cases. Usage: python3 run.py [L09 L08i L02i]

Reuses the first sibling's case machinery; DONE cases are skipped, incomplete ones refused.
"""
import datetime
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
sys.path.insert(0, str(LAB.parent / "latest-model-0.159.0"))
import run as base  # noqa: E402

base.SUBJECT = LAB / "subject" / "latest-model.py"
base.RUNS = LAB / "runs"
PROBE = ("import urllib.request\n"
         "try:\n    urllib.request.urlopen('https://chatgpt.com', timeout=5); print('reached')\n"
         "except Exception as exc:\n    print(type(exc).__name__, exc); raise SystemExit(1)\n")


def meta(home):
    m = base.cache_meta(home)
    return {"fetched_at": m.get("fetched_at"), "etag": m.get("etag")}


def ts(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() if value else None


def l09(case):
    out = {}
    for name, prefix in (("inside-sandbox", ["codex", "sandbox"]), ("outside", [])):
        proc, row = case.run(name, prefix + [sys.executable, "-c", PROBE])
        out[name] = {"exit": proc.returncode, "stdout": proc.stdout.strip(), "elapsed_ms": row["elapsed_ms"]}
    return out


def l08i(case):
    real = base.codex_home()
    auth_before = hashlib.sha256((real / "auth.json").read_bytes()).hexdigest()
    out = {}
    with tempfile.TemporaryDirectory(prefix="l08i-") as tmp:
        home = Path(tmp) / "home"
        home.mkdir()
        for f in ("auth.json", "config.toml", "models_cache.json"):
            shutil.copy2(real / f, home / f)
        cache = json.loads((home / "models_cache.json").read_text())
        moved = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=10)
        cache["fetched_at"] = moved.isoformat().replace("+00:00", "Z")
        (home / "models_cache.json").write_text(json.dumps(cache))
        env = base.env_with(CODEX_HOME=str(home))
        for name, prefix in (("1-inside-sandbox", ["codex", "sandbox"]), ("2-outside-same-home", [])):
            before = meta(home)
            proc, row = case.run(name, prefix + [sys.executable, str(base.SUBJECT), "codex", "sol"], env=env)
            out[name] = {"exit": proc.returncode, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip(),
                         "fetched_at_before": before["fetched_at"], "fetched_at_after": meta(home)["fetched_at"],
                         "elapsed_ms": row["elapsed_ms"]}
    out["real_auth_unchanged"] = hashlib.sha256((real / "auth.json").read_bytes()).hexdigest() == auth_before
    return out


def l02i(case):
    home = base.codex_home()
    calls = []
    t0 = time.monotonic()
    for i in range(48):
        time.sleep(max(0, t0 + 10 * i - time.monotonic()))
        before = meta(home)
        start = time.time()
        proc, row = case.run(f"call{i:02d}", ["codex", "debug", "models"])
        end = time.time()
        after = meta(home)
        b, a = ts(before["fetched_at"]), ts(after["fetched_at"])
        calls.append({"i": i, "start": start, "end": end, "exit": proc.returncode, "before": before, "after": after,
                      "start_age_s": round(start - b, 3) if b else None,
                      "refreshed": a is not None and start <= a <= end,
                      "served": before["fetched_at"] == after["fetched_at"]})
    external = [c["i"] for p, c in zip(calls, calls[1:]) if p["after"]["fetched_at"] != c["before"]["fetched_at"]]
    served = [c["start_age_s"] for c in calls if c["served"] and c["start_age_s"] is not None]
    refreshed = [c["start_age_s"] for c in calls if c["refreshed"] and c["start_age_s"] is not None]
    return {"calls": calls, "largest_age_served_s": max(served) if served else None,
            "smallest_age_refreshed_s": min(refreshed) if refreshed else None,
            "refreshes_by_our_calls": len(refreshed), "external_writes_before_call": external}


CASES = {"L09": l09, "L08i": l08i, "L02i": l02i}


def main():
    want = (LAB / "subject" / "SHA256").read_text().split()[0]
    if hashlib.sha256(base.SUBJECT.read_bytes()).hexdigest() != want:
        sys.exit("subject/latest-model.py does not match subject/SHA256")
    for name in sys.argv[1:] or list(CASES):
        case = base.Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        case.finish(CASES[name](case))
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
