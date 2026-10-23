#!/usr/bin/env python3
"""Two-turn headless /context-rail:build on a fresh clone of the E7 fork, then build_checks.py. Skips a run with a
summary.json. Copied from ../build-canary-0.1.0/run.py; adds the guard settings, larger limits and the E7 checks.

usage: python3 build_run.py --fork <fork repo> --plugin <plugins/context-rail> --scratch <dir> --out <dir> --reps 1
"""
import argparse
import json
import os
import shutil
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
TURN1 = "/context-rail:build"
TURN2 = ("Apply as shown. Do not apply the automation, personal or drop proposals; leave those items where they "
         "are.")


def sh(argv, cwd, **kw):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, **kw)


def flags(plugin, settings):
    return ["--plugin-dir", str(plugin), "--model", "opus", "--effort", "xhigh", "--setting-sources", "project",
            "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose",
            "--max-turns", "300", "--max-budget-usd", "25", "--settings", str(settings)]


def turn(argv, repo, out, name, env):
    t0 = time.time()
    try:
        p = subprocess.run(argv, cwd=repo, env=env, capture_output=True, text=True, timeout=5400)
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


def clone(fork, repo):
    if repo.parent.exists():
        shutil.rmtree(repo.parent)
    repo.parent.mkdir(parents=True)
    sh(["git", "clone", "-q", "--local", str(fork), str(repo)], ".")
    sh(["git", "remote", "remove", "origin"], repo)


def run_one(rep, a, out_root):
    name = f"build-r{rep}"
    out = out_root / name
    if (out / "summary.json").exists():
        return name, "skip"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    repo = Path(a.scratch) / name / "repo"
    clone(Path(a.fork), repo)
    settings = repo.parent / "guard-settings.json"
    settings.write_text(json.dumps({"hooks": {"PreToolUse": [{"matcher": "*", "hooks": [
        {"type": "command", "command": f'python3 "{HERE / "guard.py"}" "{out / "guard-denies.jsonl"}"'}]}]}}))
    scripts = Path(a.plugin) / "skills" / "build" / "scripts"
    before = sh(["python3", str(scripts / "resident-size.py"), "--project", str(repo)], repo).stdout
    (out / "resident-before.json").write_text(before)
    env = dict(os.environ, CONTEXT_RAIL_LOG=str(out / "hook.jsonl"))
    t1 = turn(["claude", "-p", TURN1, *flags(a.plugin, settings)], repo, out, "turn1", env)
    changes1 = sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()
    (out / "turn1.changes.txt").write_text("\n".join(changes1) + "\n")
    t2 = turn(["claude", "-p", TURN2, "--resume", t1["session_id"] or "", *flags(a.plugin, settings)], repo, out,
              "turn2", env) if t1["session_id"] else None
    checks = json.loads(sh(["python3", str(HERE / "build_checks.py"), "--repo", str(repo), "--plugin", str(a.plugin),
                            "--before", str(out / "resident-before.json"),
                            "--answers", str(out / "turn1.answer.txt"), str(out / "turn2.answer.txt")],
                           HERE).stdout or "{}")
    sh(["git", "add", "-A"], repo)
    (out / "diff.patch").write_text(sh(["git", "diff", "--cached"], repo).stdout)
    summary = {"run": name, "turn1": t1, "turn2": t2, "turn1_changes": len(changes1), "checks": checks,
               "guard_denies": sum(1 for _ in open(out / "guard-denies.jsonl")) if (out / "guard-denies.jsonl").exists() else 0}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    return name, checks.get("verdict")


def main():
    ap = argparse.ArgumentParser()
    for x in ("--fork", "--plugin", "--scratch", "--out"):
        ap.add_argument(x, required=True)
    ap.add_argument("--reps", type=int, default=1)
    a = ap.parse_args()
    out_root = Path(a.out).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    for rep in range(1, a.reps + 1):
        print(*run_one(rep, a, out_root), flush=True)


if __name__ == "__main__":
    main()
