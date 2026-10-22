#!/usr/bin/env python3
"""Two-turn headless run of /context-rail:build on the fixture, then score.py. Skips runs with a summary.json.

usage: python3 run.py --scratch <dir> --out <runs dir> --reps <n> [--parallel <n>]
"""
import argparse
import concurrent.futures
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE / "plugin" / "context-rail"
TURN1 = "/context-rail:build"
TURN2 = ("Apply as shown. Do not apply the automation, personal or drop proposals; leave those items where they "
         "are.")
FLAGS = ["--plugin-dir", str(PLUGIN), "--model", "opus", "--effort", "xhigh", "--setting-sources", "project",
         "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose",
         "--max-turns", "150", "--max-budget-usd", "10"]


def sh(argv, cwd, **kw):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, **kw)


def turn(argv, repo, out, name, env):
    t0 = time.time()
    try:
        p = subprocess.run(argv, cwd=repo, env=env, capture_output=True, text=True, timeout=3600)
        stdout, rc = p.stdout, p.returncode
    except subprocess.TimeoutExpired as e:
        stdout, rc = e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or ""), -9
    (out / f"{name}.stream.jsonl").write_text(stdout)
    res, init = {}, {}
    for line in stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "result":
            res = ev
        if ev.get("type") == "system" and ev.get("subtype") == "init" and not init:
            init = ev
    (out / f"{name}.answer.txt").write_text(str(res.get("result", "")) + "\n")
    return {"rc": rc, "seconds": round(time.time() - t0, 1), "cost_usd": res.get("total_cost_usd"),
            "num_turns": res.get("num_turns"), "subtype": res.get("subtype"), "session_id": res.get("session_id"),
            "cli": init.get("claude_code_version"), "model": init.get("model"),
            "skill_listed": any("context-rail:build" in str(x) for x in (init.get("slash_commands") or []) +
                                (init.get("skills") or []))}


def run_one(rep, scratch, out_root):
    name = f"run-r{rep}"
    out = out_root / name
    if (out / "summary.json").exists():
        return name, "skip"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    repo = scratch / name / "repo"
    if repo.parent.exists():
        shutil.rmtree(repo.parent)
    shutil.copytree(HERE / "fixture", repo)
    sh(["git", "init", "-q"], repo)
    sh(["git", "add", "-A"], repo)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "workbench 0.4.0"], repo)
    env = dict(os.environ, CONTEXT_RAIL_LOG=str(out / "hook.jsonl"))
    t1 = turn(["claude", "-p", TURN1, *FLAGS], repo, out, "turn1", env)
    changes1 = sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()
    (out / "turn1.changes.txt").write_text("\n".join(changes1) + "\n")
    t2 = turn(["claude", "-p", TURN2, "--resume", t1["session_id"] or "", *FLAGS], repo, out, "turn2", env) \
        if t1["session_id"] else None
    sh(["git", "add", "-A"], repo)
    (out / "diff.patch").write_text(sh(["git", "diff", "--cached"], repo).stdout)
    score = json.loads(sh(["python3", str(HERE / "score.py"), "--repo", str(repo), "--plugin", str(PLUGIN),
                           "--turn1-answer", str(out / "turn1.answer.txt"), "--turn1-changes", str(len(changes1))],
                          HERE).stdout or "{}")
    summary = {"run": name, "turn1": t1, "turn2": t2, "turn1_changes": len(changes1), "score": score}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    return name, score.get("counts")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--parallel", type=int, default=1)
    a = ap.parse_args()
    out_root, scratch = Path(a.out).resolve(), Path(a.scratch).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "cli-start.txt").write_text(sh(["claude", "--version"], HERE).stdout)
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.parallel) as pool:
        for f in concurrent.futures.as_completed([pool.submit(run_one, r, scratch, out_root) for r in range(1, a.reps + 1)]):
            print(*f.result(), flush=True)
    (out_root / "cli-end.txt").write_text(sh(["claude", "--version"], HERE).stdout)


if __name__ == "__main__":
    main()
