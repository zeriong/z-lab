#!/usr/bin/env python3
"""Score one context-rail:build run against ground_truth.json.

usage: score.py --repo <run repo> --plugin <plugin dir> [--turn1-answer <file>] [--turn1-changes <n>]
Prints JSON: per-item verdicts, the table check for proposal-only items, and the Phase 5 checks.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TRUTH = json.loads((HERE / "ground_truth.json").read_text())
STAY = {"resident", "automation", "personal", "drop"}


def text(p):
    return p.read_text(errors="replace") if p.is_file() else ""


def rule_files(repo):
    out = []
    for f in sorted((repo / ".claude" / "rules").glob("*.md")):
        t = text(f)
        m = re.match(r"\A---\n(.*?)\n---", t, re.S)
        out.append((t, m.group(1) if m else ""))
    return out


def hook_output(repo, target, n):
    hook = repo / ".claude" / "hooks" / "precedent-context.py"
    if not hook.is_file():
        return ""
    ev = {"hook_event_name": "PostToolUse", "tool_name": "Read", "session_id": f"score-{n}",
          "tool_input": {"file_path": str(repo / target)}, "cwd": str(repo)}
    r = subprocess.run([sys.executable, str(hook)], input=json.dumps(ev), capture_output=True, text=True)
    try:
        return json.loads(r.stdout)["hookSpecificOutput"]["additionalContext"]
    except (ValueError, KeyError):
        return ""


def check(argv):
    r = subprocess.run(argv, capture_output=True, text=True)
    return {"rc": r.returncode, "out": (r.stdout + r.stderr)[-400:]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", type=Path, required=True)
    ap.add_argument("--plugin", type=Path, required=True)
    ap.add_argument("--turn1-answer", type=Path)
    ap.add_argument("--turn1-changes", type=int)
    a = ap.parse_args()
    repo, scripts = a.repo.resolve(), a.plugin.resolve() / "skills" / "build" / "scripts"
    resident = text(repo / "CLAUDE.md").lower() + text(repo / ".claude" / "CLAUDE.md").lower()
    records = "\n".join(text(p) for p in repo.rglob("PRECEDENT.md") if ".git" not in p.parts).lower()
    rules = rule_files(repo)
    rules_text = "\n".join(t for t, _ in rules).lower()
    answer = text(a.turn1_answer).lower() if a.turn1_answer else ""
    items = {}
    for n, (iid, t) in enumerate(TRUTH.items()):
        frag = t["fragment"].lower()
        stays = frag in resident
        if t["kind"] in STAY:
            elsewhere = frag in records or frag in rules_text
            v = ("correct" if stays and not elsewhere else "duplicated" if stays else "moved" if elsewhere else "lost")
            row = next((l for l in answer.splitlines() if frag in l), None)
            table = None if row is None or "word" not in t else (t["word"] in row)
            items[iid] = {"kind": t["kind"], "verdict": v, "table_ok": table}
            continue
        kws = [k.lower() for k in t["keywords"]]
        if t["kind"] == "path":
            arrived = any(any(k in body.lower() for k in kws) and t["paths"] in front for body, front in rules)
        else:
            out = hook_output(repo, t["target"], n).lower()
            arrived = any(k in out for k in kws)
        v = ("correct" if arrived and not stays else "duplicated" if arrived else "not-moved" if stays else "lost")
        items[iid] = {"kind": t["kind"], "verdict": v}
    hook = repo / ".claude" / "hooks" / "precedent-context.py"
    checks = {
        "self_test": check([sys.executable, str(hook), "--self-test"]) if hook.is_file() else None,
        "max_output": check([sys.executable, str(hook), "--max-output", str(repo)]) if hook.is_file() else None,
        "records_lint": check([sys.executable, str(scripts / "records-lint.py"), "--project", str(repo)]),
        "install_check": check([sys.executable, str(scripts / "install-hooks.py"), "--project", str(repo), "--host",
                                "claude", "--check"]),
    }
    fixture_md = (HERE / "fixture" / "CLAUDE.md").read_bytes()
    now = (repo / "CLAUDE.md").read_bytes() if (repo / "CLAUDE.md").is_file() else b""
    size = {"chars_before": len(fixture_md.decode()), "chars_after": len(now.decode(errors="replace")),
            "bytes_before": len(fixture_md), "bytes_after": len(now)}
    size["shrank"] = size["chars_after"] < size["chars_before"] and size["bytes_after"] < size["bytes_before"]
    counts = {}
    for it in items.values():
        counts[it["verdict"]] = counts.get(it["verdict"], 0) + 1
    print(json.dumps({"items": items, "counts": counts, "checks": checks, "resident": size,
                      "turn1_changes": a.turn1_changes}, indent=1))


if __name__ == "__main__":
    main()
