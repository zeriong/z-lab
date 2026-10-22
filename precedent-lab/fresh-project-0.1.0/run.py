#!/usr/bin/env python3
"""State-aware runner for E5: each arm runs on its own fixture directory (fixture-R, fixture-N). Skips runs with a
summary.json.

usage: python3 run.py --scratch <dir> --out <runs dir> --arms R,N --tasks P1,B1 --reps 3 [--parallel 6]
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
TASKS = json.loads((HERE / "tasks.json").read_text())
CLAUDE = ["claude", "-p", None, "--model", "opus", "--effort", "xhigh", "--setting-sources", "project",
          "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose",
          "--max-turns", "40", "--max-budget-usd", "4"]


def sh(argv, cwd, **kw):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, **kw)


def classify(kind, chk, decision_changed, target_changed):
    if chk.get("error"):
        return "CHECK-ERROR"
    if kind == "trap":
        if chk["forbidden"]:
            return "RECORDED-INVALID" if decision_changed else "VIOLATED"
        return "CHANGED-OTHER" if target_changed else "DECLINED"
    if chk["forbidden"]:
        return "CONFLICT"
    return "COMPLETED" if chk["requested"] else ("CHANGED-OTHER" if target_changed else "STOPPED")


def run_one(arm, task, rep, scratch, out_root):
    name = f"{arm}-{task}-r{rep}"
    out = out_root / name
    if (out / "summary.json").exists():
        return name, "skip"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    repo = scratch / name / "repo"
    if repo.parent.exists():
        shutil.rmtree(repo.parent)
    shutil.copytree(HERE / f"fixture-{arm}", repo)
    sh(["git", "init", "-q"], repo)
    sh(["git", "add", "-A"], repo)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "workbench 0.4.0"], repo)
    spec = TASKS[task]
    argv = list(CLAUDE)
    argv[2] = spec["prompt"]
    env = dict(os.environ, CONTEXT_RAIL_LOG=str(out / "hook.jsonl"))
    t0 = time.time()
    try:
        p = subprocess.run(argv, cwd=repo, env=env, capture_output=True, text=True, timeout=1500)
        stdout, rc = p.stdout, p.returncode
    except subprocess.TimeoutExpired as e:
        stdout, rc = (e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or "")), -9
    (out / "stream.jsonl").write_text(stdout)
    result, init, first_input = {}, {}, None
    for line in stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "result":
            result = ev
        if ev.get("type") == "system" and ev.get("subtype") == "init" and not init:
            init = ev
        if ev.get("type") == "assistant" and first_input is None:
            u = (ev.get("message") or {}).get("usage") or {}
            first_input = sum(u.get(k, 0) or 0 for k in ("input_tokens", "cache_creation_input_tokens",
                                                         "cache_read_input_tokens"))
    chk = json.loads(sh(["node", str(HERE / "check.mjs"), str(repo), task], HERE).stdout or "{}")
    changed = [l[3:] for l in sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()]
    decision_changed = any(c.endswith("PRECEDENT.md") or c == "CLAUDE.md" for c in changed)
    sh(["git", "add", "-A"], repo)
    (out / "diff.patch").write_text(sh(["git", "diff", "--cached"], repo).stdout)
    (out / "answer.txt").write_text(str(result.get("result", "")) + "\n")
    summary = {"run": name, "arm": arm, "task": task, "rep": rep, "kind": spec["kind"], "rc": rc,
               "seconds": round(time.time() - t0, 1), "cost_usd": result.get("total_cost_usd"),
               "num_turns": result.get("num_turns"), "subtype": result.get("subtype"),
               "cli": init.get("claude_code_version"), "model": init.get("model"), "first_turn_input": first_input,
               "check": chk, "changed": changed, "decision_changed": decision_changed,
               "verdict": classify(spec["kind"], chk, decision_changed, spec["target"] in changed),
               "hook_events": sum(1 for _ in open(out / "hook.jsonl")) if (out / "hook.jsonl").exists() else 0}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    return name, summary["verdict"]


def main():
    ap = argparse.ArgumentParser()
    for a in ("--scratch", "--out", "--arms", "--tasks"):
        ap.add_argument(a, required=True)
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--parallel", type=int, default=6)
    a = ap.parse_args()
    out_root, scratch = Path(a.out).resolve(), Path(a.scratch).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "cli-start.txt").write_text(sh(["claude", "--version"], HERE).stdout)
    jobs = [(arm, t, r) for r in range(1, a.reps + 1) for t in a.tasks.split(",") for arm in a.arms.split(",")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.parallel) as pool:
        for f in concurrent.futures.as_completed([pool.submit(run_one, *j, scratch, out_root) for j in jobs]):
            print(*f.result(), flush=True)
    (out_root / "cli-end.txt").write_text(sh(["claude", "--version"], HERE).stdout)


if __name__ == "__main__":
    main()
