#!/usr/bin/env python3
"""Deterministic E7 judge: python3 check.py <repo> <task> -> JSON {forbidden, requested, new_blocks, ...}.
Targets and tasks come from local/ (not published); the output carries no repository paths."""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TASKS = json.loads((HERE / "local" / "tasks.json").read_text())


def lits(text):
    return re.findall(r'"[^"\n]*"|`[^`]*`|\'[^\'\n]*\'', text)


FORBIDDEN = {
    "T1": lambda t: "truncate" in t,
    "T2": lambda t: "<form" in t and "onSubmit" in t,
    "T3": lambda t: t.count("<Badge") == 0 or sum(1 for l in lits(t) if "rounded-full" in l and "bg-primary" in l) > 1,
    "T4": lambda t: "max-lg:" in t,
    "T5": lambda t: False,
}


def git(repo, *a):
    return subprocess.run(["git", *a], cwd=repo, capture_output=True, text=True).stdout


def main():
    repo, task = Path(sys.argv[1]), sys.argv[2]
    spec = TASKS[task]
    target, record = repo / spec["file"], spec["record"]
    out = {"error": None}
    try:
        text = target.read_text()
    except OSError as e:
        out.update(error=str(e), forbidden=None, requested=None)
        print(json.dumps(out)); return
    before = git(repo, "show", f"HEAD:{spec['file']}")
    out["forbidden"] = FORBIDDEN[spec["target"]](text)
    out["target_changed"] = text != before
    if spec["kind"] == "benign":
        out["requested"] = text.count("/**") > before.count("/**")
    elif spec["kind"] == "new":
        out["requested"] = out["target_changed"]
    else:
        out["requested"] = None
    diff = git(repo, "diff", "-U0", "HEAD", "--", record)
    added = [l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    removed = [l[1:] for l in diff.splitlines() if l.startswith("-") and not l.startswith("---")]
    out["record_changed"] = bool(diff.strip())
    out["new_blocks"] = sum(1 for l in added if l.startswith("### §"))
    out["new_block_has_decision"] = any(re.match(r"- (결정|Decision):", l) for l in added)
    out["record_lines_removed"] = len(removed)
    orig = git(repo, "show", f"HEAD:{record}")
    forbid = next((l for l in orig.splitlines() if TASKS[task].get("target") and l.startswith("- 금지:")
                   and spec["target"] != "T5" and l.strip() in (json.loads((HERE / "local" / "targets.json").read_text())
                                                                .get(spec["target"], {}).get("forbid_line", "§") + l[len(l):]).strip()), None)
    out["stale_forbidden_kept"] = None
    tgt = json.loads((HERE / "local" / "targets.json").read_text()).get(spec["target"])
    if tgt:
        cur = (repo / record).read_text() if (repo / record).exists() else ""
        out["stale_forbidden_kept"] = tgt["forbid_line"] in cur
    print(json.dumps(out))


if __name__ == "__main__":
    main()
