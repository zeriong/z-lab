#!/usr/bin/env python3
"""Deterministic check of one E8 run (SPEC 「판정」): did the task land, and was a decision recorded beside the code.

usage: python3 check.py <run repo> <task id>   -> JSON on stdout
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TASKS = json.loads((HERE / "tasks.json").read_text())
RECORD = "PRECEDENT.md"


def git(repo, *a):
    return subprocess.run(["git", "-C", str(repo), *a], capture_output=True, text=True).stdout


def nearest(repo, rel):
    d = Path(rel).parent
    while True:
        p = d / RECORD
        if (repo / p).is_file():
            return str(p)
        if str(d) in ("", "."):
            return None
        d = d.parent


def names(heading):
    body = heading[3:].split(" — ", 1)[0]
    return [os.path.basename(p.strip().split()[0].strip("`")) for p in body.split(" · ") if p.strip()]


def main():
    repo, task = Path(sys.argv[1]), sys.argv[2]
    spec = TASKS[task]
    rel = spec["file"]
    tracked = set(git(repo, "ls-files").split("\n"))
    status = [l[3:].strip('"') for l in git(repo, "status", "--porcelain", "--untracked-files=all").splitlines()]
    target = (repo / rel).read_text() if (repo / rel).exists() else ""
    out = {"target_changed": rel in status, "requested": rel in status and spec["symbol"] in target}
    changed_records = sorted(s for s in status if s.endswith(RECORD))
    out.update(records_changed=len(changed_records),
               records_created=sum(1 for s in changed_records if s not in tracked))
    gov = nearest(repo, rel)
    out["governing_record_dir"] = None if gov is None else (os.path.dirname(gov) or ".")
    out["record_at_target_dir"] = gov is not None and os.path.dirname(gov) == os.path.dirname(rel)
    added, removed = [], 0
    if gov and gov in changed_records:
        if gov in tracked:
            for l in git(repo, "diff", "HEAD", "--", gov).splitlines():
                if l.startswith("+") and not l.startswith("+++"):
                    added.append(l[1:])
                elif l.startswith("-") and not l.startswith("---"):
                    removed += 1
        else:
            added = (repo / gov).read_text().split("\n")
    text = (repo / gov).read_text() if gov else ""
    out.update(
        new_blocks=sum(1 for l in added if l.startswith("### §")),
        decision_exact=any(re.match(r"- Decision:", l) for l in added),
        decision_any=any(re.match(r"- Decision\b[^:\n]*:", l) for l in added),
        section_for_target=any(os.path.basename(rel) in names(l) for l in text.split("\n") if l.startswith("## ")),
        record_lines_removed=removed,
        other_records_changed=sum(1 for s in changed_records if s != gov),
    )
    print(json.dumps(out))


if __name__ == "__main__":
    main()
