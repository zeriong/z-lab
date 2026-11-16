#!/usr/bin/env python3
"""Run SPEC.md's cells. Usage: python3 run.py [--parallel N] [V00 | <fixture>-<family> ...]

A cell = corpus goals B then C of a fixture, one `claude -p` session each, on one fresh copy of the fixture (so C runs
with B's `.free-hands/timings.jsonl`), with the subject plugin and the witness plugin. State-aware: a cell directory holding DONE is skipped, an existing one without
DONE is refused. subject/ and the corpus are never edited. The runner stops starting cells once the recorded cost
reaches the SPEC's ceiling.
"""
import argparse
import concurrent.futures
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
SUBJECT = LAB / "subject" / "free-hands"
CORPUS = LAB.parent / "eta-corpus"
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-validate"
CEILING_USD = 50.0
CELL_BUDGET_USD = "15"
CELL_TIMEOUT_S = 75 * 60
TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent", "ToolSearch", "TodoWrite", "Skill"]
TESTS = {"p1-tally": ["python3", "-m", "unittest", "-q"], "p2-shelf": ["node", "--test"],
         "p3-orders": ["python3", "-m", "unittest", "discover", "-s", "tests", "-q"]}
CELLS = [f"{f}-{m}" for f in ("p1-tally", "p2-shelf", "p3-orders") for m in ("sonnet", "opus")] + ["p1-tally-fable"]
GOALS = {name: ["B", "C"] for name in CELLS}
GOALS.update({"p1-tally-fable": ["B"]})
WITNESS = r'''#!/usr/bin/env python3
import hashlib, json, os, re, sys, time
event = sys.argv[1]
try:
    data = json.loads(sys.stdin.read())
except ValueError:
    data = {}
goal = os.path.join(os.environ.get("WITNESS_REPO", "."), ".free-hands", "goal.md")
marks = None
if os.path.exists(goal):
    text = open(goal, encoding="utf-8", errors="replace").read()
    marks = re.findall(r"^\s*- \[([ xX-])\]", text, re.MULTILINE)
row = {"at": time.time(), "event": event, "tool": data.get("tool_name"), "agent": data.get("agent_id"),
       "duration_ms": data.get("duration_ms"), "source": data.get("source"), "marks": "".join(marks or [])}
previous = None
try:
    with open(os.environ["WITNESS_LOG"]) as log:
        previous = json.loads(log.read().splitlines()[-1]).get("marks")
except (OSError, ValueError, IndexError):
    pass
if row["marks"] and row["marks"] != previous:  # what the dashboard would show at this moment
    import subprocess
    shown = subprocess.run(["python3", os.environ["WITNESS_STATUS"], "status"], cwd=os.environ["WITNESS_REPO"],
                           capture_output=True, text=True, timeout=10).stdout
    try:
        row["status"] = json.loads(shown)
    except ValueError:
        row["status"] = {"unparsed": shown[:300]}
with open(os.environ["WITNESS_LOG"], "a") as log:
    log.write(json.dumps(row) + "\n")
'''
FAKE = """#!/usr/bin/env python3
import json, os, sys
with open(os.environ["FAKE_LOG"], "a") as log:
    log.write(json.dumps({"tool": os.path.basename(sys.argv[0]), "argv": sys.argv[1:], "cwd": os.getcwd()}) + "\\n")
print("fake " + os.path.basename(sys.argv[0]) + ": recorded (no network in this lab)")
sys.exit(1)
"""


def git(*args, cwd):
    return subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=cwd,
                          check=True, capture_output=True, text=True).stdout


def prompt_of(fixture, goal):
    text = (CORPUS / "goals" / f"{fixture}-{goal}.md").read_text()
    match = re.search(r"^## Prompt\s*\n(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
    return " ".join(match.group(1).split())


def witness_plugin(base):
    plugin = base / "witness"
    (plugin / ".claude-plugin").mkdir(parents=True)
    (plugin / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "eta-witness", "version": "0.0.0", "description": "lab: log hook events and checklist marks",
         "author": {"name": "lab"}, "hooks": "./hooks/hooks.json"}, indent=1))
    (plugin / "witness.py").write_text(WITNESS)
    command = 'python3 "${CLAUDE_PLUGIN_ROOT}/witness.py" '
    hooks = {event: [{"hooks": [{"type": "command", "command": command + event}]}]
             for event in ("SessionStart", "UserPromptSubmit", "PostToolUse", "PostToolUseFailure", "Stop",
                           "SubagentStop")}
    (plugin / "hooks").mkdir()
    (plugin / "hooks" / "hooks.json").write_text(json.dumps({"hooks": hooks}, indent=1))
    return plugin


def total_cost():
    cost = 0.0
    for summary in RUNS.glob("*/summary.json"):
        cost += json.loads(summary.read_text()).get("cost") or 0.0
    return cost


def gz(source, target):
    with open(source, "rb") as raw, gzip.open(target, "wb") as packed:
        shutil.copyfileobj(raw, packed)


def run_goal(name, goal, repo, base, out, env, plugin, witness, family):
    """One `claude -p` session for one corpus goal; returns its notes."""
    fixture = re.match(r"^(p\d-[a-z]+)-", name).group(1)
    sid = str(uuid.uuid4())
    prompt = "/free-hands:run " + prompt_of(fixture, goal)
    argv = ["claude", "-p", prompt, "--session-id", sid, "--plugin-dir", str(plugin), "--plugin-dir", str(witness),
            "--setting-sources", "project,local", "--model", family, "--effort", "xhigh", "--max-budget-usd",
            CELL_BUDGET_USD, "--output-format", "stream-json", "--verbose", "--include-hook-events",
            "--permission-mode", "acceptEdits", "--allowedTools", *TOOLS]
    notes = {"goal": goal, "argv": argv[:3] + ["…"] + argv[3:], "session_id": sid, "prompt": prompt,
             "started": time.time(), "records_before": len((repo / ".free-hands" / "timings.jsonl").read_text()
                                                           .splitlines()) if (repo / ".free-hands" / "timings.jsonl")
             .exists() else 0}
    stream = base / f"stream-{goal}.jsonl"
    with open(stream, "w") as handle:
        try:
            proc = subprocess.run(argv, cwd=repo, env=env, stdout=handle, stderr=subprocess.PIPE, text=True,
                                  stdin=subprocess.DEVNULL, timeout=CELL_TIMEOUT_S)
            notes["exit"], notes["stderr"] = proc.returncode, proc.stderr[-4000:]
        except subprocess.TimeoutExpired as expired:
            notes["exit"], notes["timeout"] = None, True
            notes["stderr"] = str(expired.stderr or "")[-4000:]
    notes["ended"] = time.time()
    notes["elapsed_s"] = round(notes["ended"] - notes["started"], 1)
    init = result = None
    advisor = tools = 0
    for line in stream.read_text().splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "system" and event.get("subtype") == "init" and init is None:
            init = event
        elif event.get("type") == "result":
            result = event
        elif event.get("type") == "assistant":
            for block in (event.get("message") or {}).get("content") or []:
                if block.get("type") == "tool_use":
                    tools += 1
                    advisor += block.get("name") == "advisor"
    notes.update(model=(init or {}).get("model"), init_plugins=[p.get("name") for p in (init or {}).get("plugins") or []],
                 tool_uses=tools, advisor_calls=advisor)
    if result:
        notes.update(cost=result.get("total_cost_usd"), usage=result.get("usage"), num_turns=result.get("num_turns"),
                     duration_ms=result.get("duration_ms"), result_subtype=result.get("subtype"),
                     model_usage=result.get("modelUsage"), result_text=(result.get("result") or "")[-3000:])
    gz(stream, out / f"stream-{goal}.jsonl.gz")
    found = list(Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude").glob(f"projects/*/{sid}.jsonl"))
    if found:
        gz(found[0], out / f"transcript-{goal}.jsonl.gz")
    notes["transcript"] = str(found[0]) if found else None
    if (repo / ".free-hands").is_dir():
        shutil.copytree(repo / ".free-hands", out / f"free-hands-dir-after-{goal}", ignore=shutil.ignore_patterns("*.lock"))
    check = subprocess.run(TESTS[fixture], cwd=repo, capture_output=True, text=True, timeout=600,
                           stdin=subprocess.DEVNULL)
    notes["tests_after"] = {"exit": check.returncode, "tail": (check.stdout + check.stderr)[-1500:]}
    return notes


def run_cell(name):
    fixture, family = re.match(r"^(p\d-[a-z]+)-([a-z]+)$", name).groups()
    out, base = RUNS / name, TMP / name
    notes = {"cell": name, "fixture": fixture, "family": family, "goals": GOALS[name]}
    base.mkdir(parents=True)
    repo = base / "repo"
    shutil.copytree(CORPUS / "fixtures" / fixture, repo)
    git("init", "-q", "-b", "main", cwd=repo)
    git("add", "-A", cwd=repo)
    git("commit", "-q", "-m", "fixture", cwd=repo)
    notes["fixture_commit"] = git("rev-parse", "HEAD", cwd=repo).strip()
    with open(repo / ".git" / "info" / "exclude", "a") as exclude:
        exclude.write(".lab/\n")
    (repo / ".lab").mkdir()
    fake = base / "fakebin"
    fake.mkdir()
    for tool in ("gh", "npm", "vercel", "docker"):
        (fake / tool).write_text(FAKE)
        (fake / tool).chmod(0o755)
    (base / "gh-config").mkdir()
    witness = witness_plugin(base)
    plugin = base / "free-hands"
    shutil.copytree(SUBJECT, plugin)
    env = dict(os.environ, PATH=f"{fake}{os.pathsep}{os.environ['PATH']}", FAKE_LOG=str(repo / ".lab" / "fake.log"),
               GH_CONFIG_DIR=str(base / "gh-config"), GH_TOKEN="", GITHUB_TOKEN="", CXC_MODE="off",
               WITNESS_LOG=str(repo / ".lab" / "witness.jsonl"), WITNESS_REPO=str(repo),
               WITNESS_STATUS=str(plugin / "scripts" / "guard.py"))
    notes["runs"] = []
    for goal in GOALS[name]:
        notes["runs"].append(run_goal(name, goal, repo, base, out, env, plugin, witness, family))
    notes["cost"] = sum(r.get("cost") or 0.0 for r in notes["runs"])
    notes["elapsed_s"] = round(sum(r["elapsed_s"] for r in notes["runs"]), 1)
    if (repo / ".lab").is_dir():
        shutil.copytree(repo / ".lab", out / "lab")
    notes["git_status"] = git("status", "--short", cwd=repo)
    notes["diff_stat"] = git("diff", "--stat", notes["fixture_commit"], cwd=repo)
    (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
    shutil.rmtree(base)
    (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
    return name, notes.get("cost"), notes["elapsed_s"]


def version_case():
    out = RUNS / "V00"
    notes = {}
    for tool in (["claude", "--version"], ["python3", "--version"], ["node", "--version"], ["git", "--version"]):
        notes[tool[0]] = subprocess.run(tool, capture_output=True, text=True).stdout.strip()
    (out / "summary.json").write_text(json.dumps(notes, indent=1) + "\n")
    (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--parallel", type=int, default=3)
    parser.add_argument("cells", nargs="*")
    args = parser.parse_args()
    names = args.cells or ["V00"] + CELLS
    todo = []
    for name in names:
        if name != "V00" and name not in CELLS:
            sys.exit(f"{name}: not a cell of this SPEC")
        out = RUNS / name
        if (out / "DONE").exists():
            print(f"{name}: DONE, skipped", flush=True)
            continue
        if out.exists() or (TMP / name).exists():
            sys.exit(f"{name}: incomplete directory exists; record it as a deviation and use a new sibling")
        todo.append(name)
    if "V00" in todo:
        (RUNS / "V00").mkdir(parents=True)
        version_case()
        todo.remove("V00")
        print("V00: done", flush=True)
    pending = list(todo)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as pool:
        running = {}
        while pending or running:
            while pending and len(running) < args.parallel:
                spent = total_cost()
                if spent >= CEILING_USD:
                    print(f"ceiling reached ({spent:.2f} USD); not starting {', '.join(pending)}", flush=True)
                    pending.clear()
                    break
                name = pending.pop(0)
                (RUNS / name).mkdir(parents=True)
                print(f"{name}: running (spent so far {spent:.2f} USD)", flush=True)
                running[pool.submit(run_cell, name)] = name
            if not running:
                break
            done, _ = concurrent.futures.wait(running, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                name = running.pop(future)
                try:
                    _, cost, elapsed = future.result()
                    print(f"{name}: done ({cost} USD, {elapsed} s)", flush=True)
                except Exception as error:  # the cell directory stays without DONE: a deviation to record
                    print(f"{name}: FAILED {error!r}", flush=True)


if __name__ == "__main__":
    main()
