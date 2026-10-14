#!/usr/bin/env python3
"""Run SPEC.md's cases in tmux. Usage: python3 run.py [V00 S0 S1 S2]"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
TMP = Path(tempfile.gettempdir()).resolve() / "dashboard-codex-status-010"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
LATEST = Path("/Users/jeonjelyong/WorkSpace/Z-Work/because-i-needed/plugins/free-hands/scripts/latest-model.py")
TUI = {"S0": None, "S1": '["model-with-reasoning", "weekly-limit"]', "S2": '["weekly-limit", "no-such-item"]'}


def tmux(*args):
    return subprocess.run(["tmux", *args], capture_output=True, text=True)


def run_case(name, out):
    base = TMP / name
    repo, home = base / "repo", base / "codex-home"
    repo.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
    home.mkdir()
    notes = {"auth_sha256_before": hashlib.sha256(AUTH.read_bytes()).hexdigest()}
    session = f"cs-{name.lower()}"
    shots = 0

    def shot(label):
        nonlocal shots
        shots += 1
        screen = tmux("capture-pane", "-p", "-t", session).stdout
        (out / f"screen-{shots:02d}-{label}.txt").write_text(screen)
        return screen

    start = time.monotonic()
    try:
        shutil.copy2(AUTH, home / "auth.json")
        env = dict(os.environ, CODEX_HOME=str(home), CXC_MODE="off")
        model = subprocess.run([sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"], env=env,
                               capture_output=True, text=True).stdout.strip()
        config = [f'model = "{model}"', 'model_reasoning_effort = "medium"', "",
                  f'[projects."{repo}"]', 'trust_level = "trusted"', ""]
        if TUI[name]:
            config += ["[tui]", f"status_line = {TUI[name]}", ""]
        (home / "config.toml").write_text("\n".join(config))
        shutil.copy2(home / "config.toml", out / "config.toml")
        notes["model"] = model
        tmux("new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo),
             f"env CODEX_HOME='{home}' CXC_MODE=off codex")
        time.sleep(12)
        shot("start")
        tmux("send-keys", "-t", session, "-l", "Reply with the word ok.")
        time.sleep(0.5)
        tmux("send-keys", "-t", session, "Enter")
        end = time.monotonic() + 120
        while time.monotonic() < end:
            time.sleep(3)
            screen = tmux("capture-pane", "-p", "-t", session).stdout
            if "ok" in screen.split("Reply with the word ok.", 1)[-1].lower():
                break
        time.sleep(5)
        shot("after-reply")
    finally:
        notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("kill-session", "-t", session)
        shutil.rmtree(home, ignore_errors=True)
        notes["codex_home_removed"] = not home.exists()
        notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    return notes


def main():
    for name in sys.argv[1:] or ["V00", "S0", "S1", "S2"]:
        out = RUNS / name
        if (out / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if out.exists() or (TMP / name).exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        out.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            notes = {t[0]: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                     for t in (["codex", "--version"], ["tmux", "-V"])}
        else:
            notes = run_case(name, out)
        (out / "summary.json").write_text(json.dumps(notes, indent=1) + "\n")
        (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
