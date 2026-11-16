#!/usr/bin/env python3
"""Run SPEC.md's estimator runs. Usage: python3 run.py [--parallel N] [V00 | inputs | <unit>-r<k> ...]

`inputs` writes inputs.json (the 26 goal runs, read-only from the earlier experiments). A run unit `<goal run>-r<k>`
estimates one goal run once on a fresh fixture copy with the subject's estimator. State-aware: a unit directory holding
DONE is skipped, an existing one without DONE is refused. Stops starting units at the SPEC's cost ceiling.
"""
import argparse
import concurrent.futures
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
SERIES = LAB.parent
CORPUS = SERIES / "eta-corpus" / "fixtures"
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-haiku-calibrate"
CEILING_USD = 3.0
REPS = 3
sys.path.insert(0, str(LAB / "subject" / "free-hands" / "scripts"))
import estimator  # noqa: E402  (the subject's: exact command and prompt)
import eta  # noqa: E402

SOURCES = [("e1", SERIES / "eta-calibrate-0.5.0" / "runs"), ("e2", SERIES / "eta-validate-0.5.0" / "runs"),
           ("r2", SERIES / "eta-validate-r2-0.5.0" / "runs")]


def read(path):
    return json.loads(Path(path).read_text())


def goal_run(tag, cell, notes, folder, letter):
    state = read(folder / "eta.json")
    text = (folder / "goal.md").read_text()
    rows = [json.loads(l) for l in (folder / "timings.jsonl").read_text().splitlines()] \
        if (folder / "timings.jsonl").exists() else []
    measured = {r["item"]: r["actual_min"] for r in rows if r.get("goal") == state.get("goal")
                and r.get("outcome") == "done"}
    # the recorder stores at most 200 characters of an item (eta.py), eta.json the whole key
    items = [{"key": key, "self_est": entry.get("est"), "self_cat": entry.get("cat"), "actual": measured.get(key[:200])}
             for key, entry in state["items"].items()]
    return {"id": f"{tag}-{cell}-{letter}", "source": tag, "cell": cell, "fixture": notes["fixture"],
            "family": notes["family"], "goal": letter, "sentence": estimator.goal_sentence(text), "items": items}


def inputs():
    found = []
    for tag, runs in SOURCES:
        for cell in sorted(p for p in runs.iterdir() if p.is_dir() and p.name != "V00" and (p / "DONE").exists()):
            notes = read(cell / "summary.json")
            if tag == "e1":
                found.append(goal_run(tag, cell.name, notes, cell / "free-hands-dir", "A"))
            else:
                for letter in notes["goals"]:
                    found.append(goal_run(tag, cell.name, notes, cell / f"free-hands-dir-after-{letter}", letter))
    (LAB / "inputs.json").write_text(json.dumps(found, indent=1) + "\n")
    return found


def run_unit(unit, goal):
    out, base = RUNS / unit, TMP / unit
    repo = base / "repo"
    shutil.copytree(CORPUS / goal["fixture"], repo)
    for args in (["init", "-q", "-b", "main"], ["add", "-A"], ["commit", "-q", "-m", "fixture"]):
        subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=repo,
                       check=True, capture_output=True)
    keys = [item["key"] for item in goal["items"]]
    notes = {"unit": unit, "goal_run": goal["id"], "keys": keys}
    start = time.time()
    try:
        rows, model, cost = estimator.ask(shutil.which("claude"), repo, goal["sentence"], keys)
        notes.update(rows=[{"key": k, "minutes": m, "category": c} for k, m, c in rows], model=model, cost=cost)
    except Exception as error:
        notes.update(rows=[], error=str(error)[:500], cost=0.0)
    notes["elapsed_s"] = round(time.time() - start, 1)
    notes["git_status_after"] = subprocess.run(["git", "status", "--short"], cwd=repo, capture_output=True,
                                               text=True).stdout
    (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
    shutil.rmtree(base)
    (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
    return unit, notes.get("cost"), notes["elapsed_s"], notes.get("error")


def spent():
    return sum(read(p).get("cost") or 0.0 for p in RUNS.glob("*/summary.json") if p.parent.name != "V00")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parallel", type=int, default=4)
    parser.add_argument("units", nargs="*")
    args = parser.parse_args()
    RUNS.mkdir(exist_ok=True)
    if not (RUNS / "V00" / "DONE").exists():
        (RUNS / "V00").mkdir(exist_ok=True)
        notes = {t[0]: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                 for t in (["claude", "--version"], ["python3", "--version"])}
        (RUNS / "V00" / "summary.json").write_text(json.dumps(notes, indent=1) + "\n")
        (RUNS / "V00" / "DONE").write_text("\n")
    goals = {g["id"]: g for g in (read(LAB / "inputs.json") if (LAB / "inputs.json").exists() else inputs())}
    units = args.units or [f"{gid}-r{k}" for k in range(1, REPS + 1) for gid in goals]
    todo = []
    for unit in units:
        if unit in ("V00", "inputs"):
            continue
        if (RUNS / unit / "DONE").exists():
            continue
        if (RUNS / unit).exists() or (TMP / unit).exists():
            sys.exit(f"{unit}: incomplete directory exists; record it and use a new sibling")
        todo.append(unit)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as pool:
        running = {}
        while todo or running:
            while todo and len(running) < args.parallel:
                if spent() >= CEILING_USD:
                    print(f"ceiling reached; not starting {len(todo)} units", flush=True)
                    todo.clear()
                    break
                unit = todo.pop(0)
                (RUNS / unit).mkdir(parents=True)
                (TMP / unit).mkdir(parents=True)
                running[pool.submit(run_unit, unit, goals[unit.rsplit("-r", 1)[0]])] = unit
            if not running:
                break
            done, _ = concurrent.futures.wait(running, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                unit = running.pop(future)
                try:
                    _, cost, elapsed, error = future.result()
                    print(f"{unit}: done ({cost} USD, {elapsed} s){' ERROR ' + error if error else ''}", flush=True)
                except Exception as error:
                    print(f"{unit}: FAILED {error!r}", flush=True)


if __name__ == "__main__":
    main()
