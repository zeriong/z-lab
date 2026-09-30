#!/usr/bin/env bash
# Generated for compat-fixture; one user-requested rule: no-literal-todo.
# Scan all src JavaScript files, including files absent from Git diffs.
# Exit 0: pass; 1: violation/check failure; 2: invalid input/environment.
set -euo pipefail
command -v python3 >/dev/null 2>&1 || { echo 'ERROR: python3 required' >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)" || exit 2
exec python3 - "$ROOT" "$@" <<'PYTHON'
import os
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(sys.argv[1])
mode = "full"
for arg in sys.argv[2:]:
    if arg in ("--mode=full", "--mode=refs-only"):
        mode = arg.split("=", 1)[1]
    elif arg == "--rule=no-literal-todo":
        pass
    elif arg in ("-h", "--help"):
        print("review-gate.sh [--mode=full|refs-only] [--rule=no-literal-todo]")
        sys.exit(0)
    else:
        print(f"ERROR: invalid argument: {arg}", file=sys.stderr)
        sys.exit(2)

def walk_error(error):
    raise error

failed = False
try:
    source = root / "src"
    if not source.is_dir():
        raise OSError(f"missing source directory: {source}")
    print("=== Rule: no-literal-todo (all src JavaScript) ===", flush=True)
    visited = set()
    count = 0
    for directory, dirs, files in os.walk(source, followlinks=True, onerror=walk_error):
        stat = os.stat(directory)
        identity = (stat.st_dev, stat.st_ino)
        if identity in visited:
            dirs[:] = []
            continue
        visited.add(identity)
        dirs.sort()
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix not in {".js", ".mjs", ".cjs", ".jsx"}:
                continue
            content = path.read_bytes()
            count += 1
            if b"TODO" in content:
                failed = True
                for number, line in enumerate(content.split(b"\n"), 1):
                    if b"TODO" in line:
                        print(f"FAIL P2 no-literal-todo: {path.relative_to(root)}:{number}")
    print(f"Scanned {count} JavaScript file(s)", flush=True)
    if mode == "full":
        if not (root / "package.json").is_file() or shutil.which("npm") is None:
            raise OSError("full mode requires package.json and npm")
        for check in ("lint", "typecheck"):
            print(f"=== npm run {check} ===", flush=True)
            result = subprocess.run(["npm", "run", check], cwd=root, check=False)
            print(f"{check}: {'PASS' if result.returncode == 0 else 'FAIL'} (exit {result.returncode})", flush=True)
            failed = failed or result.returncode != 0
except OSError as error:
    print(f"ERROR: {error}", file=sys.stderr)
    sys.exit(2)
print("Result: FAIL" if failed else "Result: OK")
sys.exit(1 if failed else 0)
PYTHON
