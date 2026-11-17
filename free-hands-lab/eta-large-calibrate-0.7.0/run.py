#!/usr/bin/env python3
"""Run SPEC.md's cells. Usage: python3 run.py [--parallel N] [V00 | <cell> ...]

Headless cells as ../eta-isolated-run-r2-0.6.0 (its runner, copied), on the goals of ../eta-corpus-large. State-aware:
a case directory holding DONE is skipped, an existing one without DONE is refused. subject/ is copied for every case and
never edited.
"""
import fcntl
import gzip
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
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-large"
GOALS = LAB.parent / "eta-corpus-large" / "goals"
CONFIG = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")
CEILING_USD = 60.0
KEEP = ("HOME", "PATH", "TERM", "LANG", "TMPDIR", "USER", "LOGNAME", "SHELL", "CLAUDE_CONFIG_DIR")
CELL_BUDGET_USD = {"opus": "20", "sonnet": "10"}  # 2 × 20 + 2 × 10: the four cells cannot pass 60 USD
CELL_TIMEOUT_S = 150 * 60
TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent", "ToolSearch", "TodoWrite", "Skill"]
TESTS = {"p1-tally": ["python3", "-m", "unittest", "-q"], "p2-shelf": ["node", "--test"],
         "p3-orders": ["python3", "-m", "unittest", "discover", "-s", "tests", "-q"]}
TMUX = shutil.which("tmux") or "/opt/homebrew/bin/tmux"
PROMPT = "Read .free-hands/goal.md and work through its checklist."
ENTRY = re.compile(r"🙌free-hands: (.*?)(?:   |$)", re.MULTILINE)
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
    text = (GOALS / f"{fixture}-{goal}.md").read_text()
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
            CELL_BUDGET_USD[family], "--output-format", "stream-json", "--verbose", "--include-hook-events",
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
    notes["estimator_lock_free"] = estimator_idle(repo / ".free-hands", 60)
    if (repo / ".free-hands").is_dir():
        shutil.copytree(repo / ".free-hands", out / f"free-hands-dir-after-{goal}", ignore=shutil.ignore_patterns("*.lock"))
    check = subprocess.run(TESTS[fixture], cwd=repo, capture_output=True, text=True, timeout=600,
                           stdin=subprocess.DEVNULL)
    notes["tests_after"] = {"exit": check.returncode, "tail": (check.stdout + check.stderr)[-1500:]}
    return notes



def estimator_idle(folder, seconds):
    """Wait until no estimator holds its lock (it may still run after the main session exits); True when free."""
    lock = folder / "estimator.lock"
    end = time.time() + seconds
    while time.time() < end:
        if not lock.exists():
            return True
        with open(lock, "a") as handle:
            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return True
            except BlockingIOError:
                time.sleep(1)
    return False


def transcripts():
    return sorted(str(p) for p in CONFIG.glob("projects/*/*.jsonl"))


def headless(name):
    fixture, family, goal = re.match(r"^(p\d-[a-z]+)-([a-z]+)-(L\d)$", name).groups()
    out, base = RUNS / name, TMP / name
    notes = {"cell": name, "fixture": fixture, "family": family, "goals": [goal]}
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
    # as from a user's terminal: nothing the lab's own Claude Code session or the Orca app set (probes r3 I06)
    env = {k: v for k, v in env.items() if k == "CLAUDE_CONFIG_DIR"
           or not k.startswith(("CLAUDE", "ORCA_", "CODEX_", "CXC_"))}
    env["CXC_MODE"] = "off"
    before = transcripts()
    notes["runs"] = [run_goal(name, goal, repo, base, out, env, plugin, witness, family)]
    notes["new_transcripts"] = sorted(set(transcripts()) - set(before))
    notes["cost"] = sum(r.get("cost") or 0.0 for r in notes["runs"])
    if (repo / ".lab").is_dir():
        shutil.copytree(repo / ".lab", out / "lab")
    notes["git_status"] = git("status", "--short", cwd=repo)
    (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
    shutil.rmtree(base)
    return name, notes.get("cost"), round(sum(r.get("elapsed_s") or 0 for r in notes["runs"]), 1)



CELLS = ["p3-orders-opus-L1", "p2-shelf-sonnet-L2", "p2-shelf-opus-L2", "p3-orders-sonnet-L1"]


def main():
    import argparse
    import concurrent.futures
    parser = argparse.ArgumentParser()
    parser.add_argument("--parallel", type=int, default=2)
    parser.add_argument("cells", nargs="*")
    args = parser.parse_args()
    todo = []
    for name in args.cells or ["V00"] + CELLS:
        out = RUNS / name
        if (out / "DONE").exists():
            print(f"{name}: DONE, skipped", flush=True)
            continue
        if out.exists() or (TMP / name).exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        todo.append(name)
    if "V00" in todo:
        (RUNS / "V00").mkdir(parents=True)
        notes = {Path(t[0]).name: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                 for t in (["claude", "--version"], ["python3", "--version"], ["node", "--version"])}
        (RUNS / "V00" / "summary.json").write_text(json.dumps(notes, indent=1) + "\n")
        (RUNS / "V00" / "DONE").write_text("\n")
        todo.remove("V00")
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.parallel) as pool:
        running = {}
        while todo or running:
            while todo and len(running) < args.parallel:
                spent = total_cost()
                if spent >= CEILING_USD:
                    print(f"ceiling reached ({spent:.2f} USD); not starting {', '.join(todo)}", flush=True)
                    todo.clear()
                    break
                name = todo.pop(0)
                (RUNS / name).mkdir(parents=True)
                print(f"{name}: running (spent so far {spent:.2f} USD)", flush=True)
                running[pool.submit(headless, name)] = name
            if not running:
                break
            done, _ = concurrent.futures.wait(running, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                name = running.pop(future)
                try:
                    _, cost, elapsed = future.result()
                    (RUNS / name / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
                    print(f"{name}: done ({cost} USD, {elapsed} s)", flush=True)
                except Exception as error:  # the cell directory stays without DONE: a deviation to record
                    print(f"{name}: FAILED {error!r}", flush=True)


if __name__ == "__main__":
    main()
