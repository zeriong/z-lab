#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 S1 S2 S3]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-isolated-probes"
FIXTURE = LAB.parent / "eta-corpus" / "fixtures" / "p1-tally"
CONFIG = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude")
ESTIMATE_PROMPT = """You estimate how long an autonomous coding agent (Claude, working alone in this repository with
shell, read and edit tools) will take for each checklist item below, in wall-clock minutes from starting the item to
finishing its check. Read the code you need first (Read, Glob, Grep only; change nothing). Then answer with exactly one
JSON object and nothing else: {"items": [{"n": <item number>, "minutes": <number>, "category": "<one of docs, fix,
feature, refactor, test, research, ops>"}]}

1. Fix: the mean of a column with blank cells is too low; blank cells must not count. Add a regression test.
2. Add a `--delimiter` option (default `,`, `tab` for a tab) with tests and a README update.
3. Write notes/missing-values.md describing every place tally.py handles missing values."""
ESTIMATOR = ["claude", "-p", ESTIMATE_PROMPT, "--safe-mode", "--no-session-persistence", "--model", "haiku", "--effort",
             "low", "--allowedTools", "Read", "Glob", "Grep", "--output-format", "stream-json", "--verbose",
             "--include-hook-events", "--max-budget-usd", "0.5"]
PARENT_PROMPT = "Run exactly this shell command with Bash, then reply done: `echo hi`"
SPAWN = r'''#!/usr/bin/env python3
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
'''
CHILD = r'''#!/usr/bin/env python3
import json, os, sys, time
start = time.time()
time.sleep(15)
with open(os.path.join(os.environ["PROBE_DIR"], "marker.json"), "w") as out:
    json.dump({"start": start, "end": time.time(), "ppid": os.getppid(), "pid": os.getpid()}, out)
'''


def git_repo(path, fixture=None):
    if fixture:
        shutil.copytree(fixture, path)
    else:
        path.mkdir(parents=True)
    for args in (["init", "-q", "-b", "main"], ["add", "-A"], ["commit", "-q", "--allow-empty", "-m", "init"]):
        subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=path,
                       check=True, capture_output=True)
    (path / ".git" / "info" / "exclude").write_text(".probe/\n")
    (path / ".probe").mkdir()


def transcripts():
    return {str(p) for p in CONFIG.glob("projects/*/*.jsonl")}


def parse(stdout):
    info = {"init": None, "hook_events": [], "tools": [], "results": [], "result": None}
    for line in stdout.splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        t, sub = e.get("type"), e.get("subtype")
        if t == "system" and sub == "init" and info["init"] is None:
            info["init"] = {k: e.get(k) for k in ("model", "tools", "plugins", "memory_paths", "session_id",
                                                   "permissionMode", "claude_code_version")}
        elif t == "system" and sub and sub.startswith("hook"):
            info["hook_events"].append({k: e.get(k) for k in ("subtype", "hook_event", "hook_name", "output")})
        elif t == "assistant":
            for b in (e.get("message") or {}).get("content") or []:
                if b.get("type") == "tool_use":
                    info["tools"].append({"name": b.get("name"), "input": b.get("input")})
        elif t == "user":
            for b in (e.get("message") or {}).get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_result":
                    info["results"].append({"error": b.get("is_error"), "content": str(b.get("content"))[:300]})
        elif t == "result":
            info["result"] = {k: e.get(k) for k in ("subtype", "result", "total_cost_usd", "duration_ms", "num_turns",
                                                     "usage", "modelUsage")}
    return info


def spawn_plugin(base):
    plugin = base / "spawn-probe"
    (plugin / ".claude-plugin").mkdir(parents=True)
    (plugin / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "spawn-probe", "version": "0.0.0", "description": "lab: detached child from a hook",
         "author": {"name": "lab"}, "hooks": "./hooks/hooks.json"}))
    (plugin / "spawn.py").write_text(SPAWN)
    (plugin / "child.py").write_text(CHILD)
    (plugin / "hooks").mkdir()
    (plugin / "hooks" / "hooks.json").write_text(json.dumps({"hooks": {"PostToolUse": [{"hooks": [
        {"type": "command", "command": 'python3 "${CLAUDE_PLUGIN_ROOT}/spawn.py"'}]}]}}))
    return plugin


def run_parent(name, out, base, child, cwd):
    repo = base / "repo"
    if not repo.exists():
        git_repo(repo)
    plugin = spawn_plugin(base)
    shutil.copytree(plugin, out / "spawn-probe")
    probe = repo / ".probe"
    env = dict(os.environ, CXC_MODE="off", PROBE_DIR=str(probe), PROBE_CHILD=json.dumps(child),
               PROBE_CWD=str(cwd))
    argv = ["claude", "-p", PARENT_PROMPT, "--setting-sources", "project,local", "--plugin-dir", str(plugin), "--model",
            "sonnet", "--output-format", "stream-json", "--verbose", "--include-hook-events", "--permission-mode",
            "acceptEdits", "--allowedTools", "Bash", "Read"]
    start = time.time()
    proc = subprocess.run(argv, cwd=repo, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    end = time.time()
    (out / "parent.stdout").write_text(proc.stdout)
    (out / "parent.stderr").write_text(proc.stderr)
    notes = {"argv": argv, "child": child, "parent_exit": proc.returncode, "parent_start": start, "parent_end": end,
             "parent_elapsed_ms": round((end - start) * 1000), "parent": parse(proc.stdout)}
    return notes, probe


def wait_for(path, seconds):
    end = time.time() + seconds
    while time.time() < end and not path.exists():
        time.sleep(0.5)
    return path.exists()


def case_s1(out, base):
    child = ["python3", str(base / "spawn-probe" / "child.py")]
    notes, probe = run_parent("S1", out, base, child, base)
    notes["child_done_after_parent"] = wait_for(probe / "marker.json", 30)
    for name in ("hook.json", "marker.json"):
        if (probe / name).exists():
            notes[name] = json.loads((probe / name).read_text())
    return notes


def case_s2(out, base):
    repo = base / "fixture"
    git_repo(repo, FIXTURE)
    before = transcripts()
    start = time.time()
    proc = subprocess.run(ESTIMATOR, cwd=repo, env=dict(os.environ, CXC_MODE="off", FREE_HANDS_ROLE="estimator"),
                          capture_output=True, text=True, stdin=subprocess.DEVNULL)
    elapsed = round((time.time() - start) * 1000)
    (out / "estimator.stdout").write_text(proc.stdout)
    (out / "estimator.stderr").write_text(proc.stderr)
    info = parse(proc.stdout)
    answer = None
    try:
        text = (info["result"] or {}).get("result") or ""
        answer = json.loads(text[text.index("{"):text.rindex("}") + 1])
    except ValueError:
        pass
    return {"argv": ["claude", "-p", "<ESTIMATE_PROMPT>", *ESTIMATOR[3:]], "exit": proc.returncode,
            "elapsed_ms": elapsed, "estimator": info, "answer": answer,
            "new_transcripts": sorted(transcripts() - before),
            "git_status_after": subprocess.run(["git", "status", "--short"], cwd=repo, capture_output=True,
                                               text=True).stdout}


def case_s3(out, base):
    repo = base / "fixture"
    git_repo(repo, FIXTURE)
    before = transcripts()
    child = ["sh", "-c", 'FREE_HANDS_ROLE=estimator CXC_MODE=off "$@" > .probe/estimate.jsonl 2>&1; '
             'date +%s > .probe/estimate.done', "sh", *ESTIMATOR]
    (base / "repo").symlink_to(repo)
    notes, probe = run_parent("S3", out, base, child, repo)
    notes["estimate_done_within_120s"] = wait_for(probe / "estimate.done", 120)
    notes["estimate_done_at"] = float(probe.joinpath("estimate.done").read_text()) if (probe / "estimate.done").exists() else None
    if (probe / "estimate.jsonl").exists():
        shutil.copy2(probe / "estimate.jsonl", out / "estimate.jsonl")
        notes["estimator"] = parse((probe / "estimate.jsonl").read_text())
    if (probe / "hook.json").exists():
        notes["hook.json"] = json.loads((probe / "hook.json").read_text())
    notes["new_transcripts"] = sorted(transcripts() - before)
    return notes


def main():
    for name in sys.argv[1:] or ["V00", "S1", "S2", "S3"]:
        out, base = RUNS / name, TMP / name
        if (out / "DONE").exists():
            print(f"{name}: DONE, skipped", flush=True)
            continue
        if out.exists() or base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        out.mkdir(parents=True)
        base.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            notes = {t[0]: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                     for t in (["claude", "--version"], ["python3", "--version"])}
        else:
            notes = {"S1": case_s1, "S2": case_s2, "S3": case_s3}[name](out, base)
        (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
        (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
