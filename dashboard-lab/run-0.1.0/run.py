#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 CD1 CD2 XD1 XD2]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. subject/ is copied for
every case and never edited. Each Codex case deletes its temporary CODEX_HOME in a finally block.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
SUBJECT = LAB / "subject"
TMP = Path(tempfile.gettempdir()).resolve() / "dashboard-run-010"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
LATEST = SUBJECT / "free-hands" / "scripts" / "latest-model.py"
ALL = ["dashboard", "budget", "free-hands", "peer-coding"]


def tmux(*args):
    return subprocess.run(["tmux", *args], capture_output=True, text=True)


class Case:
    def __init__(self, name):
        self.name, self.dir, self.notes, self.rows, self.n = name, RUNS / name, {}, [], 0
        self.base = TMP / name
        self.plugins = ALL if name.endswith("1") else ["dashboard"]

    def setup(self):
        self.base.mkdir(parents=True)
        repo = self.base / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
        (repo / ".git" / "info" / "exclude").write_text(".claude-x-codex/\n")
        (repo / ".claude-x-codex").mkdir()
        (repo / ".claude-x-codex" / "mode").write_text("mode=on\n")
        (repo / ".free-hands").mkdir()
        (repo / ".free-hands" / ".gitignore").write_text("*\n")
        (repo / ".free-hands" / "goal.md").write_text("\n".join([
            "status: active", "max_iterations: 40", "iterations: 0", "owner: lab-session-a", "default_branch: main",
            "## Goal", "lab goal", "## Checklist", "- [ ] an item", "## Decisions", "## Resume", ""]))
        xdg = self.base / "xdg"
        (xdg / "because-i-needed").mkdir(parents=True)
        (xdg / "because-i-needed" / "budget.json").write_text('{"percent": 80}')
        copies = self.base / "plugins"
        for name in self.plugins:
            shutil.copytree(SUBJECT / name, copies / name)
        return repo, xdg, copies

    def run(self, label, argv, cwd, env):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        self.rows.append({"step": stem, "argv": argv[:8] + (["…"] if len(argv) > 8 else []), "exit": proc.returncode,
                          "elapsed_ms": round((time.monotonic() - start) * 1000)})
        return proc

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def wait_done(session, marker, timeout=180):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        time.sleep(2)
        tail = tmux("capture-pane", "-p", "-t", session).stdout.split(marker, 1)[-1]
        if re.search(r"for \d+s · done", tail):
            return True
    return False


def claude_case(case):
    repo, xdg, copies = case.setup()
    session, shots = f"dash-{case.name.lower()}", [0]

    def shot(label):
        shots[0] += 1
        screen = tmux("capture-pane", "-p", "-t", session).stdout
        (case.dir / f"screen-{shots[0]:02d}-{label}.txt").write_text(screen)
        return screen

    argv = ["claude"]
    for name in case.plugins:
        argv += ["--plugin-dir", str(copies / name)]
    argv += ["--model", "sonnet", "--permission-mode", "acceptEdits", "--allowedTools", "Bash"]
    extra = os.pathsep.join(str(copies / n) for n in case.plugins if n != "dashboard")
    case.notes.update(argv=argv, plugin_dirs=extra)
    start = time.monotonic()
    tmux("new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo),
         f"env -u CXC_MODE XDG_CONFIG_HOME='{xdg}' BECAUSE_I_NEEDED_PLUGIN_DIRS='{extra}' " + " ".join(argv))
    try:
        end = time.monotonic() + 60
        while time.monotonic() < end and "trust" not in tmux("capture-pane", "-p", "-t", session).stdout.lower():
            time.sleep(1)
        if "trust" in shot("start").lower():
            tmux("send-keys", "-t", session, "Down")
            time.sleep(0.5)
            tmux("send-keys", "-t", session, "Enter")
        time.sleep(8)
        shot("ready")
        for label, text in (("reply", "Reply with the word ok."),) + ((("audit", "/dashboard:audit"),)
                                                                         if case.name == "CD1" else ()):
            tmux("send-keys", "-t", session, "-l", text)
            time.sleep(0.5)
            tmux("send-keys", "-t", session, "Enter")
            case.notes[f"{label}_done"] = wait_done(session, text)
            time.sleep(4)
            shot(label)
    finally:
        case.notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("send-keys", "-t", session, "-l", "/exit")
        tmux("send-keys", "-t", session, "Enter")
        time.sleep(3)
        tmux("kill-session", "-t", session)


def codex_case(case):
    repo, xdg, copies = case.setup()
    home = case.base / "codex-home"
    home.mkdir()
    case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    try:
        shutil.copy2(AUTH, home / "auth.json")
        env = {k: v for k, v in os.environ.items() if k not in ("CXC_MODE", "BECAUSE_I_NEEDED_PLUGIN_DIRS")}
        env.update(CODEX_HOME=str(home), XDG_CONFIG_HOME=str(xdg))
        market = case.base / "market"
        (market / ".claude-plugin").mkdir(parents=True)
        for name in case.plugins:
            shutil.copytree(copies / name, market / "plugins" / name)
        (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
            "name": "because-i-needed", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0"},
            "plugins": [{"name": n, "source": f"./plugins/{n}", "version": "0", "description": "lab"}
                        for n in case.plugins]}))
        case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], case.base, env)
        for name in case.plugins:
            case.run(f"plugin-add-{name}", ["codex", "plugin", "add", f"{name}@because-i-needed"], case.base, env)
        model = case.run("resolve-luna", [sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"],
                         case.base, env).stdout.strip()
        proc = case.run("audit", ["codex", "exec", "--json", "--dangerously-bypass-hook-trust", "-m", model, "-c",
                                  'model_reasoning_effort="medium"', "-s", "workspace-write", "-C", str(repo),
                                  "$dashboard:audit"], repo, env)
        info = {"commands": [], "messages": [], "errors": [], "usage": []}
        for line in proc.stdout.splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            item = event.get("item") or {}
            if event.get("type") == "turn.completed":
                info["usage"].append(event.get("usage"))
            elif event.get("type") == "item.completed" and item.get("type") == "command_execution":
                info["commands"].append({"command": item.get("command"), "exit_code": item.get("exit_code"),
                                         "output": item.get("aggregated_output")})
            elif event.get("type") == "item.completed" and item.get("type") == "agent_message":
                info["messages"].append(item.get("text"))
            elif event.get("type") == "item.completed" and item.get("type") == "error":
                info["errors"].append(item.get("message"))
        case.notes.update(info)
    finally:
        shutil.rmtree(home, ignore_errors=True)
        case.notes["codex_home_removed"] = not home.exists()
        case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()


def main():
    for name in sys.argv[1:] or ["V00", "CD1", "CD2", "XD1", "XD2"]:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            for label, argv in (("claude-version", ["claude", "--version"]), ("codex-version", ["codex", "--version"])):
                case.run(label, argv, LAB, dict(os.environ))
        elif name.startswith("C"):
            claude_case(case)
        else:
            codex_case(case)
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
