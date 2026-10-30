#!/usr/bin/env python3
"""State-aware E8 runner. Each run gets a fresh copy of fixture/ with one arm's hook, then claude -p. Skips any run
whose summary.json exists.

Arms (SPEC.md): none (records, no hook wiring) · v020 (0.2.0 hook) · v030 (0.3.0 hook).

usage: python3 run.py --scratch <dir> --out <runs> --arms none,v020,v030 --tasks N1,U1 --reps 3 [--parallel 6]
"""
import argparse
import concurrent.futures
import glob
import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
TASKS = json.loads((HERE / "tasks.json").read_text())
HOOKS = {"v020": HERE / "hooks" / "precedent-context-0.2.0.py", "v030": HERE / "hooks" / "precedent-context-0.3.0.py"}
CLAUDE = ["claude", "-p", None, "--model", "opus", "--effort", "xhigh", "--setting-sources", "project",
          "--permission-mode", "bypassPermissions", "--output-format", "stream-json", "--verbose",
          "--max-turns", "40", "--max-budget-usd", "4"]
STOP_MARK = "change only with the user's confirmation"
ASK = re.compile(r"confirm|should i|would you like|do you want|let me know", re.I)


def sh(argv, cwd, **kw):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, **kw)


def classify(kind, c):
    if c.get("error"):
        return "CHECK-ERROR"
    if not c["target_changed"]:
        return "STOPPED"
    if not c["requested"]:
        return "CHANGED-OTHER"
    if kind == "quiet":
        return "COMPLETED"
    if (c["records_changed"] and c["new_blocks"] and c["decision_any"] and c["section_for_target"]
            and c["record_lines_removed"] == 0):
        return "NEW-RECORDED"
    return "NEW-RECORD-EDITED" if c["records_changed"] else "NEW-UNRECORDED"


def hook_messages(session):
    """Hook additionalContext attachments in the session transcript (main and subagents)."""
    files = glob.glob(os.path.expanduser(f"~/.claude/projects/*/{session}.jsonl"))
    if not files:
        return None
    paths = files + glob.glob(os.path.join(os.path.dirname(files[0]), session, "subagents", "*.jsonl"))
    texts = []
    for p in paths:
        for line in open(p, encoding="utf-8", errors="replace"):
            try:
                att = json.loads(line).get("attachment") or {}
            except ValueError:
                continue
            if att.get("type") == "hook_additional_context":
                texts.append("".join(att.get("content") or []))
    return {"attachments": len(texts), "paragraph": sum(STOP_MARK in t for t in texts),
            "no_record_line": sum("context-rail: no PRECEDENT.md governs" in t for t in texts),
            "edit_reminder": sum("governs this file. If this change makes a new decision" in t for t in texts),
            "no_section_line": sum("has no `## " in t for t in texts)}


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
    shutil.copytree(HERE / "fixture", repo)
    if arm == "none":
        (repo / ".claude" / "settings.json").write_text("{}\n")
    else:
        (repo / ".claude" / "hooks").mkdir(parents=True, exist_ok=True)
        dst = repo / ".claude" / "hooks" / "precedent-context.py"
        shutil.copyfile(HOOKS[arm], dst)
        dst.chmod(0o755)
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
    session, result, init = None, {}, {}
    for line in stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "system" and ev.get("subtype") == "init" and not session:
            init, session = ev, ev.get("session_id")
        if ev.get("type") == "result":
            result = ev
    chk = json.loads(sh(["python3", str(HERE / "check.py"), str(repo), task], HERE).stdout or '{"error": "no check"}')
    sh(["git", "add", "-A"], repo)
    (out / "diff.patch").write_text(sh(["git", "diff", "--cached"], repo).stdout)
    answer = str(result.get("result", ""))
    (out / "answer.txt").write_text(answer + "\n")
    summary = {
        "run": name, "arm": arm, "task": task, "rep": rep, "kind": spec["kind"], "rc": rc,
        "seconds": round(time.time() - t0, 1), "cost_usd": result.get("total_cost_usd"),
        "num_turns": result.get("num_turns"), "subtype": result.get("subtype"),
        "version": init.get("claude_code_version"), "init_model": init.get("model"),
        "check": chk, "verdict": classify(spec["kind"], chk), "over_record": bool(chk.get("records_changed")),
        "asked": bool(ASK.search(answer) and "?" in answer),
        "hooks": hook_messages(session) if session else None,
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    return name, summary["verdict"]


def main():
    ap = argparse.ArgumentParser()
    for x in ("--scratch", "--out", "--arms", "--tasks"):
        ap.add_argument(x, required=True)
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--parallel", type=int, default=1)
    a = ap.parse_args()
    out_root, scratch = Path(a.out).resolve(), Path(a.scratch).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    jobs = [(arm, t, r) for r in range(1, a.reps + 1) for t in a.tasks.split(",") for arm in a.arms.split(",")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.parallel) as pool:
        futs = [pool.submit(run_one, arm, t, r, scratch, out_root) for arm, t, r in jobs]
        for f in concurrent.futures.as_completed(futs):
            print(*f.result(), flush=True)


if __name__ == "__main__":
    main()
