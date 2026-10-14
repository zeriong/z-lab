#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 CB1 CB2 CB3 CB4 CB5 XB1 XB2 XB3]

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
import uuid

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
SUBJECT = LAB / "subject"
TMP = Path(tempfile.gettempdir()).resolve() / "budget-run-010"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
LATEST = SUBJECT / "free-hands" / "scripts" / "latest-model.py"
MARK = "작업을 이어서 진행하시겠어요?"
CMD = "Run exactly this shell command once and report its output: `{}`"
SUBAGENTS = ("In one message, start two general-purpose subagents with the Agent tool. The first runs exactly "
             "`echo sub-a` with Bash, the second exactly `echo sub-b`. Report both outputs.")
CASES = {
    "CB1": (1, CMD.format("echo one"), ["yes"], False),
    "CB2": (1, CMD.format("echo two"), ["no"], False),
    "CB3": (100, CMD.format("echo three"), [], False),
    "CB4": (1, CMD.format("echo four"), ["yes"], True),
    "CB5": (1, SUBAGENTS, ["yes", "yes"], False),
    "XB1": (1, CMD.format("echo x-one"), ["예"], False),
    "XB2": (1, CMD.format("echo x-two"), ["예"], True),
    "XB3": (100, CMD.format("echo x-three"), [], False),
}


def tmux(*args):
    return subprocess.run(["tmux", *args], capture_output=True, text=True)


def goal_text(owner):
    return "\n".join(["status: active", "max_iterations: 3", "iterations: 0", f"owner: {owner}", "default_branch: main",
                      "## Goal", "lab goal", "## Checklist", "- [ ] run the command the user gives", "## Decisions",
                      "## Resume", ""])


class Case:
    def __init__(self, name):
        self.name, self.dir, self.notes, self.rows, self.n = name, RUNS / name, {}, [], 0
        self.base = TMP / name
        self.threshold, self.prompt, self.answers, self.with_free_hands = CASES.get(name, (None, None, [], False))

    def setup(self):
        self.base.mkdir(parents=True)
        repo = self.base / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
        xdg = self.base / "xdg"
        (xdg / "because-i-needed").mkdir(parents=True)
        (xdg / "because-i-needed" / "budget.json").write_text(json.dumps({"percent": self.threshold}))
        plugins = self.base / "plugins"
        for name in ("budget", "free-hands"):
            shutil.copytree(SUBJECT / name, plugins / name)
        return repo, xdg, plugins

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

    def state(self, repo, xdg):
        runtime = xdg / "because-i-needed" / "budget"
        self.notes["budget_files"] = {str(p.relative_to(runtime)): p.read_text() for p in sorted(runtime.rglob("*"))
                                      if p.is_file()} if runtime.exists() else {}
        goal = repo / ".free-hands" / "goal.md"
        if goal.exists():
            self.notes["goal_after"] = goal.read_text()

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def claude_case(case):
    repo, xdg, plugins = case.setup()
    session, shots = f"bud-{case.name.lower()}", [0]

    def shot(label):
        shots[0] += 1
        screen = tmux("capture-pane", "-p", "-t", session).stdout
        (case.dir / f"screen-{shots[0]:02d}-{label}.txt").write_text(screen)
        return screen

    sid = str(uuid.uuid4())
    argv = ["claude", "--plugin-dir", str(plugins / "budget")]
    if case.with_free_hands:
        argv += ["--plugin-dir", str(plugins / "free-hands")]
        (repo / ".free-hands").mkdir()
        (repo / ".free-hands" / ".gitignore").write_text("*\n")
        (repo / ".free-hands" / "goal.md").write_text(goal_text(sid))
        case.notes["goal_before"] = goal_text(sid)
    argv += ["--session-id", sid, "--model", "sonnet", "--permission-mode", "acceptEdits", "--allowedTools", "Bash",
             "Agent"]
    case.notes.update(session_id=sid, argv=argv)
    start = time.monotonic()
    tmux("new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo),
         f"env XDG_CONFIG_HOME='{xdg}' CXC_MODE=off " + " ".join(argv))
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
        tmux("send-keys", "-t", session, "-l", case.prompt)
        time.sleep(0.5)
        tmux("send-keys", "-t", session, "Enter")
        answered = []
        end = time.monotonic() + 240
        while time.monotonic() < end:
            time.sleep(2)
            screen = tmux("capture-pane", "-p", "-t", session).stdout
            if MARK in screen and len(answered) < max(len(case.answers), 1):
                shot(f"dialog-{len(answered) + 1}")
                answer = case.answers[len(answered)] if len(answered) < len(case.answers) else "yes"
                if answer == "no":
                    tmux("send-keys", "-t", session, "Down")
                    time.sleep(0.5)
                tmux("send-keys", "-t", session, "Enter")
                answered.append(answer)
                time.sleep(3)
                continue
            tail = screen.split(case.prompt[:40], 1)[-1]
            if re.search(r"for \d+s · done|Interrupted", tail):
                break
        case.notes["dialogs_answered"] = answered
        time.sleep(4)
        shot("end")
    finally:
        case.notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("send-keys", "-t", session, "-l", "/exit")
        tmux("send-keys", "-t", session, "Enter")
        time.sleep(3)
        tmux("kill-session", "-t", session)
        slug = re.sub(r"[^A-Za-z0-9]", "-", str(repo))
        transcript = Path.home() / ".claude" / "projects" / slug / f"{sid}.jsonl"
        if transcript.exists():
            shutil.copy2(transcript, case.dir / "transcript.jsonl")
            asks = []
            for line in transcript.read_text().splitlines():
                event = json.loads(line)
                content = (event.get("message") or {}).get("content")
                for block in content if isinstance(content, list) else []:
                    if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "AskUserQuestion":
                        asks.append({"input": block.get("input")})
                    if isinstance(block, dict) and block.get("type") == "tool_result" and "지정한" in str(block.get("content")):
                        asks.append({"result": str(block.get("content"))[:300]})
                    if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == "Bash":
                        asks.append({"bash": (block.get("input") or {}).get("command")})
            case.notes["transcript_rows"] = asks
        case.state(repo, xdg)


def parse(proc):
    info = {"thread_id": None, "commands": [], "messages": [], "usage": []}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get("item") or {}
        if event.get("type") == "thread.started":
            info["thread_id"] = event.get("thread_id")
        elif event.get("type") == "turn.completed":
            info["usage"].append(event.get("usage"))
        elif event.get("type") == "item.completed" and item.get("type") == "command_execution":
            info["commands"].append({"command": item.get("command"), "exit_code": item.get("exit_code"),
                                     "output": (item.get("aggregated_output") or "")[:300]})
        elif event.get("type") == "item.completed" and item.get("type") in ("agent_message", "error"):
            info["messages"].append(f"{item.get('type')}: {item.get('text') or item.get('message')}")
    return info


def codex_case(case):
    repo, xdg, plugins = case.setup()
    home = case.base / "codex-home"
    home.mkdir()
    case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    try:
        shutil.copy2(AUTH, home / "auth.json")
        env = dict(os.environ, CODEX_HOME=str(home), XDG_CONFIG_HOME=str(xdg), CXC_MODE="off")
        market = case.base / "market"
        (market / ".claude-plugin").mkdir(parents=True)
        names = ["budget"] + (["free-hands"] if case.with_free_hands else [])
        for name in names:
            shutil.copytree(plugins / name, market / "plugins" / name)
        (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
            "name": "because-i-needed", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0"},
            "plugins": [{"name": n, "source": f"./plugins/{n}", "version": "0", "description": "lab"} for n in names]}))
        case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], case.base, env)
        for name in names:
            case.run(f"plugin-add-{name}", ["codex", "plugin", "add", f"{name}@because-i-needed"], case.base, env)
        model = case.run("resolve-luna", [sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"],
                         case.base, env).stdout.strip()
        common = ["--json", "--dangerously-bypass-hook-trust", "-m", model, "-c", 'model_reasoning_effort="medium"']
        boot = parse(case.run("bootstrap", ["codex", "exec", *common, "-s", "workspace-write", "-C", str(repo),
                                            "Reply with the word ok."], repo, env))
        case.notes["bootstrap"] = boot
        if case.with_free_hands:
            (repo / ".free-hands").mkdir()
            (repo / ".free-hands" / ".gitignore").write_text("*\n")
            (repo / ".free-hands" / "goal.md").write_text(goal_text(boot["thread_id"]))
            case.notes["goal_before"] = goal_text(boot["thread_id"])
            first = parse(case.run("work", ["codex", "exec", "resume", boot["thread_id"], case.prompt, *common, "-c",
                                            'sandbox_mode="workspace-write"'], repo, env))
            thread = boot["thread_id"]
        else:
            first = parse(case.run("fresh", ["codex", "exec", *common, "-s", "workspace-write", "-C", str(repo),
                                             case.prompt], repo, env))
            thread = first["thread_id"]
        case.notes["first"] = first
        case.state(repo, xdg)
        case.notes["after_first"] = case.notes.pop("budget_files")
        case.notes["goal_after_first"] = case.notes.pop("goal_after", None)
        for answer in case.answers:
            case.notes["answer"] = parse(case.run("answer", ["codex", "exec", "resume", thread, answer, *common, "-c",
                                                             'sandbox_mode="workspace-write"'], repo, env))
        case.state(repo, xdg)
    finally:
        shutil.rmtree(home, ignore_errors=True)
        case.notes["codex_home_removed"] = not home.exists()
        case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()


def main():
    for name in sys.argv[1:] or ["V00", *CASES]:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            for label, argv in (("claude-version", ["claude", "--version"]), ("codex-version", ["codex", "--version"]),
                                ("tmux-version", ["tmux", "-V"])):
                case.run(label, argv, LAB, dict(os.environ))
        elif name.startswith("C"):
            claude_case(case)
        else:
            codex_case(case)
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
