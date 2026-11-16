#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 C1 C2]  (state-aware: DONE skips, an incomplete dir refuses)"""
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
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-isolated-probes-r3"
TMUX = shutil.which("tmux") or "/opt/homebrew/bin/tmux"
PROMPT = "Run exactly this shell command with Bash, then reply done: echo hi"
KEEP = ("HOME", "PATH", "TERM", "LANG", "TMPDIR", "USER", "LOGNAME", "SHELL", "CLAUDE_CONFIG_DIR")
PROBE = r'''#!/usr/bin/env python3
import json, os, shutil, subprocess, sys, time
sys.stdin.read()
out = os.environ.get("PROBE_LOG") or os.path.join(os.getcwd(), ".probe", "hook.json")
if os.path.exists(out):
    sys.exit(0)
def mask(name, value):
    return "***" if any(w in name.upper() for w in ("TOKEN", "KEY", "SECRET", "AUTH", "PASSWORD")) else value[:200]
def comm(pid):
    try:
        return subprocess.run(["ps", "-o", "comm=", "-p", str(pid)], capture_output=True, text=True).stdout.strip()
    except Exception as error:
        return f"error: {error}"
pid = os.environ.get("CLAUDE_PID")
row = {"at": time.time(), "env_names": sorted(os.environ),
       "env": {k: mask(k, v) for k, v in os.environ.items() if k.startswith(("CLAUDE", "CODEX"))},
       "which_claude": shutil.which("claude"), "ppid": os.getppid(), "ppid_comm": comm(os.getppid()),
       "claude_pid_comm": comm(pid) if pid else None, "cwd": os.getcwd()}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w") as log:
    json.dump(row, log, indent=1)
'''


def clean_env(extra=None):
    env = {k: os.environ[k] for k in KEEP if k in os.environ}
    env.update(extra or {})
    return env


def setup(name):
    base = TMP / name
    repo = base / "repo"
    repo.mkdir(parents=True)
    for args in (["init", "-q", "-b", "main"], ["commit", "-q", "--allow-empty", "-m", "init"]):
        subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=repo,
                       check=True, capture_output=True)
    (repo / ".git" / "info" / "exclude").write_text(".probe/\n")
    plugin = base / "env-probe"
    (plugin / ".claude-plugin").mkdir(parents=True)
    (plugin / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "env-probe", "version": "0.0.0", "description": "lab: hook environment", "author": {"name": "lab"},
         "hooks": "./hooks/hooks.json"}))
    (plugin / "probe.py").write_text(PROBE)
    (plugin / "hooks").mkdir()
    (plugin / "hooks" / "hooks.json").write_text(json.dumps({"hooks": {"PostToolUse": [{"hooks": [
        {"type": "command", "command": 'python3 "${CLAUDE_PLUGIN_ROOT}/probe.py"'}]}]}}))
    return repo, plugin


def c1(out):
    repo, plugin = setup("C1")
    shutil.copytree(plugin, out / "env-probe")
    argv = ["claude", "-p", PROMPT, "--setting-sources", "project,local", "--plugin-dir", str(plugin), "--model",
            "sonnet", "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "--output-format", "json"]
    start = time.time()
    proc = subprocess.run(argv, cwd=repo, env=clean_env(), capture_output=True, text=True, stdin=subprocess.DEVNULL)
    notes = {"argv": argv, "env_passed": sorted(clean_env()), "exit": proc.returncode,
             "elapsed_ms": round((time.time() - start) * 1000), "stderr": proc.stderr[-1000:]}
    try:
        result = json.loads(proc.stdout)
        notes.update(cost=result.get("total_cost_usd"), result=(result.get("result") or "")[:200])
    except ValueError:
        notes["stdout"] = proc.stdout[-1000:]
    log = repo / ".probe" / "hook.json"
    notes["hook"] = json.loads(log.read_text()) if log.exists() else None
    return notes


def c2(out):
    repo, plugin = setup("C2")
    shutil.copytree(plugin, out / "env-probe")
    session = "fh-env-r3-c2"
    env = clean_env()
    prefix = "env -i " + " ".join(f"{k}={subprocess.list2cmdline([v])}" for k, v in env.items())
    command = (f"{prefix} claude --setting-sources project,local --plugin-dir {plugin} --model sonnet "
               "--permission-mode acceptEdits --allowedTools Bash")
    notes = {"command_env": sorted(env)}
    subprocess.run([TMUX, "new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo), command])

    def screen():
        return subprocess.run([TMUX, "capture-pane", "-p", "-t", session], capture_output=True, text=True).stdout

    def wait(test, seconds, step=0.5):
        end = time.time() + seconds
        while time.time() < end:
            if test(screen()):
                return True
            time.sleep(step)
        return False
    log = repo / ".probe" / "hook.json"
    try:
        wait(lambda s: "trust" in s.lower(), 60)
        if "trust" in screen().lower():
            for _ in range(3):
                time.sleep(2)
                subprocess.run([TMUX, "send-keys", "-t", session, "Down"])
                if wait(lambda s: "❯ Yes, I trust this folder" in s, 5):
                    subprocess.run([TMUX, "send-keys", "-t", session, "Enter"])
                    notes["trusted"] = True
                    break
        time.sleep(8)
        subprocess.run([TMUX, "send-keys", "-t", session, "-l", PROMPT])
        time.sleep(0.5)
        subprocess.run([TMUX, "send-keys", "-t", session, "Enter"])
        end = time.time() + 120
        while time.time() < end and not log.exists():
            time.sleep(1)
        time.sleep(3)
        notes["screen"] = screen()
    finally:
        subprocess.run([TMUX, "send-keys", "-t", session, "-l", "/exit"])
        subprocess.run([TMUX, "send-keys", "-t", session, "Enter"])
        time.sleep(3)
        subprocess.run([TMUX, "kill-session", "-t", session])
    notes["hook"] = json.loads(log.read_text()) if log.exists() else None
    return notes


def main():
    for name in sys.argv[1:] or ["V00", "C1", "C2"]:
        out = RUNS / name
        if (out / "DONE").exists():
            continue
        if out.exists() or (TMP / name).exists():
            sys.exit(f"{name}: incomplete directory exists")
        out.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            notes = {Path(t[0]).name: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                     for t in (["claude", "--version"], [TMUX, "-V"], ["python3", "--version"])}
        else:
            notes = {"C1": c1, "C2": c2}[name](out)
        (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
        (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
