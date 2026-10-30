#!/usr/bin/env python3
"""Run SPEC.md's case. Usage: python3 run.py — state-aware: runs/R01/DONE is skipped."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUN = LAB / "runs" / "R01"
FIX = LAB / "fixtures" / "bang.exp"
BANG = r"""set stty_init "rows 50 cols 160"
log_file -noappend [lindex $argv 0]
proc wait_for {n} { expect -timeout $n "@@never@@" {} timeout {} eof {} }
spawn -noecho claude
expect -timeout 40 "/effort"
wait_for 2
send "!"; wait_for 1
send "env | grep -c '^CLAUDE_CONFIG_DIR='\r"; wait_for 4
send_log "\n@@MARK count@@\n"
send "!"; wait_for 1
send "echo \"DIR=\$CLAUDE_CONFIG_DIR\"\r"; wait_for 4
send_log "\n@@MARK dir@@\n"
send "/exit\r"; wait_for 3
exit
"""


def main():
    if (RUN / "DONE").exists():
        print("R01: done, skipped")
        return
    if RUN.exists():
        sys.exit("R01: incomplete run directory exists")
    if not FIX.exists():
        FIX.parent.mkdir(parents=True)
        FIX.write_text(BANG)
    RUN.mkdir(parents=True)
    project = Path(tempfile.mkdtemp(prefix="r01-project-")).resolve()
    home = Path(tempfile.mkdtemp(prefix="r01-home-")).resolve()
    (home / ".claude.json").write_text(json.dumps({
        "hasCompletedOnboarding": True, "theme": "dark", "numStartups": 5,
        "projects": {str(project): {"hasTrustDialogAccepted": True, "hasCompletedProjectOnboarding": True}}}))
    env = dict(os.environ, CLAUDE_CONFIG_DIR=str(home), CXC_MODE="off")
    log = RUN / "pty.log"
    start = time.monotonic()
    proc = subprocess.run(["expect", str(FIX), str(log)], cwd=project, env=env, capture_output=True, text=True, timeout=300)
    elapsed = round((time.monotonic() - start) * 1000)
    raw = log.read_text(errors="replace")
    flat = " ".join(re.sub(r"\x1b\[[0-9;?<>=]*[ -/]*[@-~]", " ", raw).split())
    count = flat[flat.find("@@MARK count@@") - 400:flat.find("@@MARK count@@")]
    shown = re.findall(r"DIR=\S*", flat)
    summary = {"home": str(home), "project": str(project), "expect_exit": proc.returncode, "elapsed_ms": elapsed,
               "screen_before_count_mark": count, "dir_lines": sorted(set(shown)),
               "claude_version": subprocess.run(["claude", "--version"], capture_output=True, text=True).stdout.strip()}
    (RUN / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
    (RUN / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
    print("R01: done")


if __name__ == "__main__":
    main()
