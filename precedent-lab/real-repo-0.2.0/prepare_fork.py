#!/usr/bin/env python3
"""Make the E7 fork: a local clone of the private repo at a fixed commit, with only the arrival hook removed.

Removed (the part of the repo's own rail that injects records on arrival):
  1. .claude/hooks/precedent-context.sh
  2. its PostToolUse / PostToolUseFailure entries in .claude/settings.json
  3. the clause of .claude/CLAUDE.md and the sentence of AGENTS.md that describe that hook
Kept: every PRECEDENT.md, the commit gate, inject-context.sh, the resident rule to record decisions beside the code.

usage: python3 prepare_fork.py --source <repo> --commit <sha> --dest <dir>   (dest must not exist)
"""
import argparse
import json
import subprocess
from pathlib import Path

HOOK = ".claude/hooks/precedent-context.sh"
STRIP = json.loads((Path(__file__).resolve().parent / "local" / "strip.json").read_text())  # quoted resident text stays local
CLAUDE_CLAUSE = tuple(STRIP["claude_clause"])
AGENTS_SENTENCE = tuple(STRIP["agents_sentence"])


def sh(argv, cwd):
    r = subprocess.run(argv, cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"{argv}: {r.stderr}")
    return r.stdout


def replace_once(path, old, new):
    t = path.read_text()
    if t.count(old) != 1:
        raise SystemExit(f"{path}: expected the text once, found {t.count(old)}")
    path.write_text(t.replace(old, new))


def main():
    ap = argparse.ArgumentParser()
    for a in ("--source", "--commit", "--dest"):
        ap.add_argument(a, required=True)
    a = ap.parse_args()
    dest = Path(a.dest)
    sh(["git", "clone", "-q", "--local", "--no-hardlinks", a.source, str(dest)], ".")
    sh(["git", "checkout", "-q", a.commit], dest)
    sh(["git", "switch", "-q", "-c", "e7-fork"], dest)
    (dest / HOOK).unlink()
    st = dest / ".claude" / "settings.json"
    s = json.loads(st.read_text())
    for ev in ("PostToolUse", "PostToolUseFailure"):
        kept = [e for e in s["hooks"].get(ev, []) if not any("precedent-context" in h.get("command", "")
                                                             for h in e.get("hooks", []))]
        if kept:
            s["hooks"][ev] = kept
        else:
            s["hooks"].pop(ev, None)
    st.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n")
    replace_once(dest / ".claude" / "CLAUDE.md", *CLAUDE_CLAUSE)
    replace_once(dest / "AGENTS.md", *AGENTS_SENTENCE)
    sh(["git", "add", "-A"], dest)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "e7: remove the arrival hook"], dest)
    left = sh(["git", "grep", "-l", "precedent-context"], dest) if subprocess.run(
        ["git", "grep", "-q", "precedent-context"], cwd=dest).returncode == 0 else ""
    info = {"source_commit": a.commit, "fork_commit": sh(["git", "rev-parse", "HEAD"], dest).strip(),
            "records": len([l for l in sh(["git", "ls-files"], dest).splitlines() if l.endswith("PRECEDENT.md")]),
            "files_still_naming_the_hook": left.split()}
    print(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()
