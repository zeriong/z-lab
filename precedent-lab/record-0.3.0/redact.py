#!/usr/bin/env python3
"""Publish summary.json of runs/ and canary/runs/ as *-public/, and hash every original into specimens.sha256.
W runs on a synthetic fixture; only local paths and e-mail addresses are masked."""
import hashlib
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCES = [("runs", "runs-public"), ("canary/runs", "canary/runs-public")]
EXTRA = ["runs-interrupted", "canary/runs-interrupted"]
PRIVATE = re.compile(r"synolink|cloudhospital|jeonjelyong|heezi|zeriong@", re.I)


def main():
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
            text = re.sub(r"/projects/[^/\"]+/", "/projects/<project-dir>/", f.read_text())
            text = re.sub(r"[A-Za-z0-9._%+-]+@(?!example\.invalid)[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "<email>", text)
            if PRIVATE.search(text):
                sys.exit(f"identifier left in {f}: {PRIVATE.search(text).group(0)!r}")
            out = d / f.relative_to(s)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(text)
    for extra in EXTRA:
        for f in sorted((HERE / extra).rglob("*")) if (HERE / extra).exists() else []:
            if f.is_file():
                hashes.append(f"{hashlib.sha256(f.read_bytes()).hexdigest()}  {f.relative_to(HERE)}")
    for name in ("SPEC.md", "METRICS.md", "FINDINGS.md", "RUNLOG.md", "deterministic.json", "canary/CANARY.md"):
        p = HERE / name
        if p.exists() and PRIVATE.search(p.read_text()):
            sys.exit(f"identifier left in {name}: {PRIVATE.search(p.read_text()).group(0)!r}")
    (HERE / "specimens.sha256").write_text("\n".join(hashes) + "\n")
    print(f"published summaries, hashed {len(hashes)}")


if __name__ == "__main__":
    main()
