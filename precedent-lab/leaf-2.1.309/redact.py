#!/usr/bin/env python3
"""Publish runs/ as runs-public/ (host paths replaced) and hash every original into specimens.sha256.

stream.jsonl, stderr.txt and codex-sessions/ stay local: the stream's init record lists the account's MCP
connectors and the Codex rollouts carry the account's session metadata.
usage: REDACT_FORBIDDEN=<regex> python3 redact.py <scratch-dir>
"""
import hashlib
import os
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PUBLISH = ("summary.json", "answer.txt", "diff.patch", "hook.jsonl", "chain.json", "gate-denies.jsonl",
           "hooks.sha256")
FORBIDDEN = re.compile(os.environ["REDACT_FORBIDDEN"], re.I)


def encoded(path):
    return re.sub(r"[^A-Za-z0-9]", "-", path)


def main():
    scratch = str(Path(sys.argv[1]).resolve())
    config = str(Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")))
    subs = [(scratch, "<scratch>"), (scratch.replace("/private/tmp/", "/tmp/", 1), "<scratch>"),
            (encoded(scratch), "<scratch-encoded>"), (encoded(scratch.replace("/private/tmp/", "/tmp/", 1)),
                                                      "<scratch-encoded>"),
            (config, "<claude-config>"), (str(Path.home()), "<home>")]
    runs, public = HERE / "runs", HERE / "runs-public"
    if public.exists():
        shutil.rmtree(public)
    hashes = []
    for f in sorted(runs.rglob("*")):
        if not f.is_file():
            continue
        hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
        if f.name not in PUBLISH or "codex-sessions" in f.parts:
            continue
        text = f.read_text(errors="replace")
        text = re.sub(r"/projects/[^/\"]+/", "/projects/<project-dir>/", text)
        text = re.sub(r"[A-Za-z0-9._%+-]+@(?!example\.invalid)[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<email>", text)
        for old, new in subs:
            text = text.replace(old, new)
        if FORBIDDEN.search(text):
            sys.exit(f"identifier left in {f}")
        dest = public / f.relative_to(runs)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    (HERE / "specimens.sha256").write_text("\n".join(hashes) + "\n")
    print(f"published {sum(1 for _ in public.rglob('*') if _.is_file())} files, hashed {len(hashes)}")


if __name__ == "__main__":
    main()
