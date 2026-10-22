#!/usr/bin/env python3
"""Publish runs/ as runs-public/ with host paths replaced; hash every original into specimens.sha256.

runs/ stays local (git-ignored): the session scratch path embeds a private repository name, and the
Claude stream's init record lists the account's MCP connectors. See REDACTION.md.
usage: python3 redact.py <scratch-dir>
"""
import hashlib
import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PUBLISH = ("summary.json", "probe.jsonl", "answer.txt", "prompt.txt", "case.json", "emitted.json")
# the identifiers to refuse are passed in, so this file does not carry them
FORBIDDEN = re.compile(os.environ["REDACT_FORBIDDEN"], re.I)


def main():
    scratch = Path(sys.argv[1]).resolve()
    config = Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude"))
    subs = [(str(scratch), "<scratch>"), (str(scratch).replace("/private/tmp/", "/tmp/", 1), "<scratch>"),
            (re.sub(r"[^A-Za-z0-9]", "-", str(scratch)), "<scratch-key>"), (str(config), "<claude-config>"),
            (str(Path.home()), "<home>")]
    runs, public = HERE / "runs", HERE / "runs-public"
    if public.exists():
        shutil.rmtree(public)
    hashes = []
    for f in sorted(runs.rglob("*")):
        if not f.is_file():
            continue
        hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
        if f.name not in PUBLISH:
            continue
        text = f.read_text(errors="replace")
        for old, new in subs:
            text = text.replace(old, new)
        if FORBIDDEN.search(text):
            sys.exit(f"identifier left in {f}")
        dest = public / f.relative_to(runs)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    (HERE / "specimens.sha256").write_text("\n".join(hashes) + "\n")
    print(f"hashed {len(hashes)} · published {sum(1 for _ in public.rglob('*') if _.is_file())}")


if __name__ == "__main__":
    main()
