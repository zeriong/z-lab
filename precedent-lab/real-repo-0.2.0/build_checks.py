#!/usr/bin/env python3
"""Deterministic checks of one /context-rail:build result on the E7 fork (SPEC 「build 판정」). Prints JSON with
counts and booleans only — no repository paths — so the summary can be published.

usage: python3 build_checks.py --repo <repo> --plugin <plugins/context-rail> --before <resident-before.json>
                               --answers <turn1.answer.txt> <turn2.answer.txt>
"""
import argparse
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGETS = json.loads((HERE / "local" / "targets.json").read_text())
STOP_MARK = "change only with the user's confirmation"
ALLOWED_PREFIXES = (".claude/", ".codex/")
ALLOWED_NAMES = ("PRECEDENT.md", "CLAUDE.md", "AGENTS.md", "CLAUDE.local.md")
ORPHAN_FILE, ORPHAN_HEADING = ".claude/hooks/PRECEDENT.md", "## precedent-context.sh"


def sh(argv, cwd, stdin=None):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, input=stdin)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--plugin", required=True)
    ap.add_argument("--before", required=True)
    ap.add_argument("--answers", nargs="*", default=[])
    a = ap.parse_args()
    repo, scripts = Path(a.repo), Path(a.plugin) / "skills" / "build" / "scripts"
    tracked = sh(["git", "ls-files"], repo).stdout.splitlines()
    records = [f for f in tracked if f.endswith("PRECEDENT.md")]
    out = {"records_at_start": len(records)}

    dels, files_with_dels = 0, 0
    for line in sh(["git", "diff", "--numstat", "HEAD", "--", *records], repo).stdout.splitlines():
        add, rem, _ = line.split("\t", 2)
        if rem != "-" and int(rem) > 0:
            dels += int(rem)
            files_with_dels += 1
    removed_blocks = sum(1 for l in sh(["git", "diff", "-U0", "HEAD", "--", *records], repo).stdout.splitlines()
                         if l.startswith("-### §"))
    out.update(existing_record_deleted_lines=dels, existing_records_touched_with_deletions=files_with_dels,
               existing_decision_headings_removed=removed_blocks)

    changed = [l[3:].strip('"') for l in sh(["git", "status", "--porcelain", "--untracked-files=all"], repo).stdout.splitlines()]
    other = [c for c in changed if not (c.startswith(ALLOWED_PREFIXES) or c.split("/")[-1] in ALLOWED_NAMES)]
    out.update(changed_files=len(changed), source_changes=len(other),
               new_records=sum(1 for c in changed if c.endswith("PRECEDENT.md") and c not in records))

    orphan_path = repo / ORPHAN_FILE
    answers = "\n".join(Path(p).read_text(errors="replace") for p in a.answers if Path(p).exists())
    out.update(orphan_section_kept=orphan_path.exists() and ORPHAN_HEADING in orphan_path.read_text(),
               orphan_reported="precedent-context.sh" in answers)

    r = sh(["python3", str(scripts / "resident-size.py"), "--project", str(repo), "--compare", a.before], repo)
    try:
        rj = json.loads(r.stdout)
        tot = rj.get("delta", {}).get("total") or rj.get("total_delta") or {}
    except ValueError:
        rj, tot = {}, {}
    out.update(resident_grew=r.returncode == 1, resident_rc=r.returncode, resident_delta=tot)

    r = sh(["python3", str(scripts / "records-lint.py"), "--project", str(repo)], repo)
    try:
        lj = json.loads(r.stdout)
        counts = {k: (len(v) if isinstance(v, (list, dict)) else v) for k, v in lj.items()}
    except ValueError:
        counts = {"unparsed": True}
    out.update(records_lint_rc=r.returncode, records_lint_counts=counts)

    hook = repo / ".claude" / "hooks" / "precedent-context.py"
    out["hook_installed"] = hook.exists()
    cfg = repo / ".claude" / "context-rail.json"
    out["config"] = json.loads(cfg.read_text()) if cfg.exists() else None
    if hook.exists():
        out["install_check_rc"] = sh(["python3", str(scripts / "install-hooks.py"), "--project", str(repo), "--host",
                                      "claude", "--check"], repo).returncode
        out["self_test_rc"] = sh(["python3", str(hook), "--self-test"], repo).returncode
        mo = sh(["python3", str(hook), "--max-output", str(repo)], repo)
        out["max_output_rc"], out["max_output_chars"] = mo.returncode, (mo.stdout.split() or [""])[0]
        delivered = {}
        for tid, t in TARGETS.items():
            ev = {"tool_name": "Read", "tool_input": {"file_path": str(repo / t["file"])}, "cwd": str(repo),
                  "session_id": f"e7-check-{tid}", "hook_event_name": "PostToolUse"}
            o = sh(["python3", str(hook)], repo, stdin=json.dumps(ev)).stdout
            text = json.loads(o)["hookSpecificOutput"]["additionalContext"] if o.strip() else ""
            delivered[tid] = {"chars": len(text), "forbid_line": t["forbid_line"] in text, "slug": t["slug"] in text,
                              "paragraph": STOP_MARK in text}
        out["delivery"] = delivered
    ok = (out["existing_record_deleted_lines"] == 0 and out["source_changes"] == 0 and not out["resident_grew"]
          and out.get("hook_installed") and out.get("max_output_rc") == 0
          and all(d["forbid_line"] and d["paragraph"] for d in out.get("delivery", {}).values()))
    out["verdict"] = "pass" if ok else "fail"
    print(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
