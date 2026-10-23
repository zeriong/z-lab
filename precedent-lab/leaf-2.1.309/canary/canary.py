#!/usr/bin/env python3
"""Canary for the leaf-agent experiment: four cells that answer setup questions before the SPEC is frozen.

K1  orchestrator (opus xhigh) + Agent subagent, model inherited, trap P1
K2  orchestrator + Agent subagent with model "sonnet", benign B1
K3  orchestrator with Read/Edit/Write/MultiEdit/Bash/Grep/Glob disallowed + Agent subagent, benign B1
K4  peer-coding claude-fast worker form (`claude -p`, sonnet, effort high, CXC_MODE=off), trap P1

usage: python3 canary.py --scratch <dir> --out <dir> [--cells K1,K2,K3,K4]
"""
import argparse
import concurrent.futures
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
LAB = HERE.parent
sys.path.insert(0, str(LAB))
import chain  # noqa: E402
import prompts  # noqa: E402

TASKS = json.loads((LAB / "tasks.json").read_text())
HOOK = (LAB / "hook" / "precedent-context.py").read_text(encoding="utf-8")
BASE = ["--setting-sources", "project", "--permission-mode", "bypassPermissions", "--output-format", "stream-json",
        "--verbose", "--max-turns", "40", "--max-budget-usd", "4"]
CELLS = {
    "K1": {"task": "P1", "kind": "e2e", "sub_model": None, "disallow": None},
    "K2": {"task": "B1", "kind": "e2e", "sub_model": "sonnet", "disallow": None},
    "K3": {"task": "B1", "kind": "e2e", "sub_model": None,
           "disallow": "Read,Edit,Write,MultiEdit,NotebookEdit,Bash,Grep,Glob"},
    "K4": {"task": "P1", "kind": "worker"},
}


def sh(argv, cwd, **kw):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, **kw)


def setup(repo):
    if repo.parent.exists():
        shutil.rmtree(repo.parent)
    shutil.copytree(LAB / "fixture", repo)
    (repo / ".claude" / "hooks").mkdir(parents=True, exist_ok=True)
    (repo / ".claude" / "hooks" / "precedent-context.py").write_text(HOOK, encoding="utf-8")
    sh(["git", "init", "-q"], repo)
    sh(["git", "add", "-A"], repo)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "workbench 0.4.0"], repo)


def argv_for(cell):
    spec = TASKS[cell["task"]]
    if cell["kind"] == "worker":
        return ["claude", "-p", prompts.worker(cell["task"], spec), "--model", "sonnet", "--effort", "high", *BASE], \
            {"CXC_MODE": "off"}
    argv = ["claude", "-p", prompts.orchestrator(spec["prompt"], cell["sub_model"]), "--model", "opus",
            "--effort", "xhigh", *BASE]
    if cell["disallow"]:
        argv += ["--disallowedTools", cell["disallow"]]
    return argv, {}


def run(name, scratch, out_root):
    cell = CELLS[name]
    out = out_root / name
    if (out / "summary.json").exists():
        return name, "skip"
    out.mkdir(parents=True, exist_ok=True)
    repo = scratch / name / "repo"
    setup(repo)
    argv, extra = argv_for(cell)
    (out / "argv.json").write_text(json.dumps(argv, indent=1, ensure_ascii=False) + "\n")
    env = dict(os.environ, CONTEXT_RAIL_LOG=str(out / "hook.jsonl"), **extra)
    t0 = time.time()
    p = subprocess.run(argv, cwd=repo, env=env, capture_output=True, text=True, timeout=1500)
    (out / "stream.jsonl").write_text(p.stdout)
    (out / "stderr.txt").write_text(p.stderr)
    session, result, init = None, {}, {}
    for line in p.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "system" and ev.get("subtype") == "init":
            init, session = ev, ev.get("session_id")
        if ev.get("type") == "result":
            result = ev
    target = TASKS[cell["task"]]["target"]
    c = chain.chain(session, target) if session else {"error": "no session"}
    (out / "chain.json").write_text(json.dumps(c, indent=1, ensure_ascii=False) + "\n")
    chk = json.loads(sh(["node", str(LAB / "check.mjs"), str(repo), cell["task"]], LAB).stdout or "{}")
    changed = [l[3:] for l in sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()]
    sh(["git", "add", "-A"], repo)
    (out / "diff.patch").write_text(sh(["git", "diff", "--cached"], repo).stdout)
    summary = {"cell": name, **cell, "rc": p.returncode, "seconds": round(time.time() - t0, 1),
               "cost_usd": result.get("total_cost_usd"), "num_turns": result.get("num_turns"),
               "init_model": init.get("model"), "init_tools": init.get("tools"), "version": init.get("claude_code_version"),
               "check": chk, "changed": changed, "answer": result.get("result", "")}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    return name, p.returncode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--cells", default=",".join(CELLS))
    a = ap.parse_args()
    scratch, out_root = Path(a.scratch).resolve(), Path(a.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for f in concurrent.futures.as_completed([pool.submit(run, n, scratch, out_root) for n in a.cells.split(",")]):
            print(*f.result(), flush=True)


if __name__ == "__main__":
    main()
