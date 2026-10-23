#!/usr/bin/env python3
"""Publish only the numeric summaries of runs/ (and the build canary) as runs-public/, hash every original into
specimens.sha256, and stop if any company path, view, decision slug, component name or identifier is left."""
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TARGETS = json.loads((HERE / "local" / "targets.json").read_text())
SOURCES = [("runs", "runs-public"), ("canary/runs", "canary/runs-public")]


def forbidden():
    words = list(json.loads((HERE / "local" / "mask.json").read_text())["forbidden_words"])
    extra = HERE / "local" / "mask-extra.json"  # identifiers the runs wrote or cited (slugs, headings, SHAs)
    words += json.loads(extra.read_text()) if extra.exists() else []
    for t in TARGETS.values():
        words += [t["slug"], t["slug"].lstrip("§"), Path(t["file"]).name, t["forbid_line"]]
    return re.compile("|".join(re.escape(w) for w in words), re.I)


def main():
    bad = forbidden()
    hashes = []
    for src, dst in SOURCES:
        s, d = HERE / src, HERE / dst
        if d.exists():
            shutil.rmtree(d)
        if not s.exists():
            continue
        for f in sorted(s.rglob("*")):
            if not f.is_file():
                continue
            hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
            if f.name != "summary.json":
                continue
            text = f.read_text()
            if bad.search(text):
                sys.exit(f"identifier left in {f}: {bad.search(text).group(0)!r}")
            out = d / f.relative_to(s)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(text)
    for extra in ("canary/runs-interrupted", "runs-interrupted"):
        for f in sorted((HERE / extra).rglob("*")) if (HERE / extra).exists() else []:
            if f.is_file():
                hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
    for f in sorted((HERE / "local").glob("*")):
        hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
    for name in ("SPEC.md", "tasks.public.json", "METRICS.md", "FINDINGS.md", "RUNLOG.md", "run.log", "accounts.json", "canary/CANARY.md",
                 "canary/build.log", "canary/work.log"):
        p = HERE / name
        if p.exists() and bad.search(p.read_text()):
            sys.exit(f"identifier left in {name}: {bad.search(p.read_text()).group(0)!r}")
    (HERE / "specimens.sha256").write_text("\n".join(hashes) + "\n")
    print(f"published summaries, hashed {len(hashes)}")


if __name__ == "__main__":
    main()
