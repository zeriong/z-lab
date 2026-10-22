#!/usr/bin/env python3
"""State-aware runner for the audit canary. usage: python3 run.py --scratch <dir> --out runs --reps 2"""
import argparse
import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parent / "build-canary-0.1.0" / "plugin" / "context-rail"
FLAGS = ["--plugin-dir", str(PLUGIN), "--model", "opus", "--effort", "xhigh", "--setting-sources", "project",
         "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose",
         "--max-turns", "60", "--max-budget-usd", "5"]
CHECKS = {"resident_size": r"resident-size\.py", "install_check": r"install-hooks\.py[^\n]*--check",
          "self_test": r"--self-test", "max_output": r"--max-output", "records_lint": r"records-lint\.py",
          "asset_compare": r"\b(cmp|diff|shasum|sha256sum|md5)\b"}


def sh(argv, cwd):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True)


def run_one(fx, rep, scratch, out_root):
    name = f"{fx}-r{rep}"
    out = out_root / name
    if (out / "summary.json").exists():
        return
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    repo = scratch / name / "repo"
    if repo.parent.exists():
        shutil.rmtree(repo.parent)
    shutil.copytree(HERE / f"fixture-{fx}", repo)
    sh(["git", "init", "-q"], repo)
    sh(["git", "add", "-A"], repo)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "workbench"], repo)
    t0 = time.time()
    p = subprocess.run(["claude", "-p", "/context-rail:audit", *FLAGS], cwd=repo, capture_output=True, text=True,
                       timeout=1800, env=dict(os.environ))
    (out / "stream.jsonl").write_text(p.stdout)
    res, init, cmds = {}, {}, []
    for line in p.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "result":
            res = ev
        if ev.get("type") == "system" and ev.get("subtype") == "init" and not init:
            init = ev
        if ev.get("type") == "assistant":
            for c in ev["message"].get("content", []):
                if c.get("type") == "tool_use" and c.get("name") == "Bash":
                    cmds.append(str((c.get("input") or {}).get("command", "")))
    answer = str(res.get("result", ""))
    (out / "answer.txt").write_text(answer + "\n")
    (out / "commands.txt").write_text("\n---\n".join(cmds) + "\n")
    changed = sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()
    blob = "\n".join(cmds)
    low = answer.lower()
    summary = {"run": name, "fixture": fx, "rc": p.returncode, "seconds": round(time.time() - t0, 1),
               "cost_usd": res.get("total_cost_usd"), "num_turns": res.get("num_turns"), "subtype": res.get("subtype"),
               "cli": init.get("claude_code_version"), "model": init.get("model"), "changed": changed,
               "checks_run": {k: bool(re.search(v, blob)) for k, v in CHECKS.items()},
               "named": {"orphan_heading": "gone.mjs" in low,
                         "block_without_decision": "orphan-note" in low or bool(re.search(r"(no|without|missing)[^.\n]{0,40}decision", low)),
                         "hook_differs": bool(re.search(r"differ|modified|not (the )?same|mismatch|doesn.t match|does not match", low))}}
    (out / "summary.json").write_text(json.dumps(summary, indent=1) + "\n")
    print(name, summary["changed"], summary["checks_run"], summary["named"], summary["cost_usd"], flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--reps", type=int, default=2)
    a = ap.parse_args()
    out_root, scratch = Path(a.out).resolve(), Path(a.scratch).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda j: run_one(*j, scratch, out_root),
                      [(fx, r) for fx in ("ok", "broken") for r in range(1, a.reps + 1)]))


if __name__ == "__main__":
    main()
