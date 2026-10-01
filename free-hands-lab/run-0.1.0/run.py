#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 C01 C02 C03 C04 X01 X02 X03 X04 X05 X06 X07]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. The subject is
subject/free-hands/ and is never edited; every case works in its own temporary git repository.
"""
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
SUBJECT = LAB / "subject" / "free-hands"
TMP = Path(tempfile.gettempdir()).resolve()
AUTH = Path.home() / ".codex" / "auth.json"
CLAUDE_TOOLS = ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Task", "Agent", "Skill", "WebSearch", "WebFetch"]


def goal(max_iterations, *items):
    return "\n".join([f"status: active", f"max_iterations: {max_iterations}", "iterations: 0", "## Goal",
                      "lab goal", "## Checklist", *items, "## Decisions", "## Resume", ""])


BRIEF = {
    "question": "Which library should a new small Python command-line tool, tools/report.py, use to parse its arguments?",
    "options": [{"id": "A", "text": "argparse (standard library)"}, {"id": "B", "text": "click"},
                {"id": "C", "text": "typer"}],
    "goal": "Add tools/report.py, a small CLI with three subcommands, maintained by one person for years.",
    "constraints": ["Python 3.11", "No hard limit applies to this choice (no merge, deletion, deploy or send)."],
    "files": [],
}


class Case:
    def __init__(self, name):
        self.name, self.dir, self.n, self.rows, self.notes = name, RUNS / name, 0, [], {}
        self.base = TMP / f"free-hands-lab-{name.lower()}"

    def repo(self, label="repo"):
        path = self.base / label
        path.mkdir(parents=True)
        subprocess.run(["git", "init", "-q", str(path)], check=True)
        subprocess.run(["git", "-C", str(path), "-c", "user.name=lab", "-c", "user.email=lab@example.invalid",
                        "commit", "-q", "--allow-empty", "-m", "init"], check=True)
        return path

    def run(self, label, argv, cwd, env=None, stdin=None):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, input=stdin, capture_output=True, text=True,
                              stdin=None if stdin is not None else subprocess.DEVNULL)
        elapsed = round((time.monotonic() - start) * 1000)
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        row = {"step": stem, "argv": argv[:6] + (["…"] if len(argv) > 6 else []), "cwd": str(cwd),
               "exit": proc.returncode, "elapsed_ms": elapsed}
        self.rows.append(row)
        return proc, row

    def snapshot(self, label, repo, names=()):
        goal_file = repo / ".free-hands" / "goal.md"
        status = subprocess.run(["git", "-C", str(repo), "status", "--short", "--untracked-files=all"],
                                capture_output=True, text=True).stdout
        files = {name: (repo / name).read_text() if (repo / name).is_file() else None for name in names}
        self.notes[label] = {"goal": goal_file.read_text() if goal_file.is_file() else None, "git_status": status,
                             "files": files}

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def claude_env():
    return dict(os.environ, CXC_MODE="off")


def claude(case, label, prompt, cwd, resume=None):
    argv = ["claude", "-p", prompt, "--plugin-dir", str(SUBJECT), "--model", "sonnet", "--output-format",
            "stream-json", "--verbose", "--include-hook-events", "--permission-mode", "acceptEdits",
            "--allowedTools", *CLAUDE_TOOLS]
    if resume:
        argv += ["--resume", resume]
    proc, row = case.run(label, argv, cwd, env=claude_env())
    info = {"session_id": None, "hooks": [], "tool_uses": [], "result": None, "usage": None, "model_usage": None,
            "texts": []}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        info["session_id"] = info["session_id"] or event.get("session_id")
        if event.get("type") == "system" and event.get("subtype") == "hook_response":
            info["hooks"].append({k: event.get(k) for k in ("hook_event", "hook_name", "output", "exit_code",
                                                            "outcome")})
        elif event.get("type") == "assistant":
            for block in (event.get("message") or {}).get("content") or []:
                if block.get("type") == "tool_use":
                    info["tool_uses"].append({"name": block.get("name"), "input": block.get("input"),
                                              "parent": event.get("parent_tool_use_id")})
                elif block.get("type") == "text" and not event.get("parent_tool_use_id"):
                    info["texts"].append(block.get("text"))
        elif event.get("type") == "result":
            info.update(result=event.get("result"), usage=event.get("usage"), model_usage=event.get("modelUsage"),
                        cost=event.get("total_cost_usd"), is_error=event.get("is_error"))
    row["tokens"] = info["usage"] and {"input": info["usage"].get("input_tokens"),
                                       "output": info["usage"].get("output_tokens")}
    case.notes[f"{row['step']}"] = info
    return info


def codex_home(case):
    home = case.base / "codex-home"
    home.mkdir(parents=True)
    shutil.copy2(AUTH, home / "auth.json")
    market = case.base / "market"
    shutil.copytree(SUBJECT, market / "plugins" / "free-hands")
    (market / ".claude-plugin").mkdir(parents=True)
    (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
        "name": "fh-lab", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0.0.0"},
        "plugins": [{"name": "free-hands", "source": "./plugins/free-hands", "version": "0.1.0",
                     "description": "lab copy"}]}, indent=1))
    env = dict(os.environ, CODEX_HOME=str(home), CXC_MODE="off")
    case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], case.base, env=env)
    case.run("plugin-add", ["codex", "plugin", "add", "free-hands@fh-lab"], case.base, env=env)
    proc, _ = case.run("resolve-luna", [sys.executable, str(SUBJECT / "scripts" / "latest-model.py"), "codex", "luna",
                                        "--effort", "medium"], case.base, env=env)
    case.notes["codex_model"] = proc.stdout.strip()
    case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    return env, proc.stdout.strip()


def codex(case, label, prompt, cwd, env, model, resume=None, extra=()):
    argv = ["codex", "exec"]
    if resume:
        argv += ["resume", resume]
    argv += ["--json", "--dangerously-bypass-hook-trust", "-m", model, "-c", 'model_reasoning_effort="medium"',
             *extra]
    if not resume:
        argv += ["-s", "workspace-write", "-C", str(cwd)]
    argv.append(prompt)
    proc, row = case.run(label, argv, cwd, env=env)
    info = {"thread_id": None, "turns": 0, "messages": [], "commands": [], "usage": [], "errors": []}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        kind = event.get("type")
        if kind == "thread.started":
            info["thread_id"] = event.get("thread_id")
        elif kind == "turn.started":
            info["turns"] += 1
        elif kind == "turn.completed":
            info["usage"].append(event.get("usage"))
        elif kind == "item.completed":
            item = event.get("item") or {}
            if item.get("type") == "agent_message":
                info["messages"].append(item.get("text"))
            elif item.get("type") == "command_execution":
                info["commands"].append(item.get("command"))
            elif item.get("type") == "error":
                info["errors"].append(item.get("message"))
            elif item.get("type") not in ("reasoning",):
                info["commands"].append(f"[{item.get('type')}] " + json.dumps(item)[:300])
    row["tokens"] = info["usage"]
    case.notes[row["step"]] = info
    return info


def v00(case):
    case.run("claude-version", ["claude", "--version"], LAB)
    case.run("codex-version", ["codex", "--version"], LAB)


def stop_items():
    return ("- [ ] write a.txt containing 1", "- [ ] write b.txt containing 2",
            "- [ ] write c.txt with the content the user gives you")


STOP_PROMPT = "Read .free-hands/goal.md. Do only the first item, then stop and wait for my approval."
ENTRY = "free-hands로 hello.txt 파일에 hi 라고 써줘"
EXPLAIN = "free-hands 플러그인이 무엇을 하는지 설명만 해줘"


def write_goal(repo, text):
    (repo / ".free-hands").mkdir(exist_ok=True)
    (repo / ".free-hands" / "goal.md").write_text(text)


def c01(case):
    repo = case.repo()
    write_goal(repo, goal(2, *stop_items()))
    claude(case, "stop", STOP_PROMPT, repo)
    case.snapshot("after", repo, ("a.txt", "b.txt", "c.txt"))


def c02(case):
    repo = case.repo()
    write_goal(repo, goal(5, "- [ ] write a.txt containing 1"))
    first = claude(case, "turn1", "Reply with the word ok only.", repo)
    claude(case, "compact", "/compact", repo, resume=first["session_id"])
    case.snapshot("after", repo, ("a.txt",))


def c03(case):
    for label, follow in (("yes", "응"), ("no", "아니")):
        repo = case.repo(label)
        first = claude(case, f"{label}-entry", ENTRY, repo)
        claude(case, f"{label}-answer", follow, repo, resume=first["session_id"])
        case.snapshot(label, repo, ("hello.txt",))
    repo = case.repo("explain")
    claude(case, "explain", EXPLAIN, repo)
    case.snapshot("explain", repo, ())


def panel_repo(case):
    repo = case.repo()
    write_goal(repo, goal(5, "- [ ] decide the CLI library for tools/report.py and write the decision under ## Decisions"))
    brief_dir = repo / ".free-hands" / "panel" / "01-cli"
    brief_dir.mkdir(parents=True)
    (brief_dir / "brief.json").write_text(json.dumps(BRIEF, indent=1))
    return repo, brief_dir


def panel_files(case, label, brief_dir):
    case.notes[label] = {str(p.relative_to(brief_dir)): p.read_text()[:4000] for p in sorted(brief_dir.rglob("*"))
                         if p.is_file()}


def c04(case):
    repo, brief_dir = panel_repo(case)
    claude(case, "panel", "Follow step 4 of the free-hands skill for .free-hands/panel/01-cli/brief.json, record the "
                          "decision, mark the item done, then stop.", repo)
    case.snapshot("after", repo, ())
    panel_files(case, "panel_files", brief_dir)


def x01(case):
    env, model = codex_home(case)
    repo = case.repo()
    write_goal(repo, goal(2, *stop_items()))
    codex(case, "stop", STOP_PROMPT, repo, env, model)
    case.snapshot("after", repo, ("a.txt", "b.txt", "c.txt"))
    case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()


def x02(case):
    env, model = codex_home(case)
    repo = case.repo()
    write_goal(repo, goal(5, "- [ ] write a.txt containing 1"))
    ask = ("Reply with ok, then, on a new line, the first word of any context note that starts with [free-hands "
           "(or none).")
    first = codex(case, "turn1", ask, repo, env, model)
    codex(case, "resume", ask, repo, env, model, resume=first["thread_id"])
    case.snapshot("after", repo, ("a.txt",))


def x03(case):
    env, model = codex_home(case)
    for label, follow in (("yes", "응"), ("no", "아니")):
        repo = case.repo(label)
        first = codex(case, f"{label}-entry", ENTRY, repo, env, model)
        codex(case, f"{label}-answer", follow, repo, env, model, resume=first["thread_id"])
        case.snapshot(label, repo, ("hello.txt",))
    repo = case.repo("explain")
    codex(case, "explain", EXPLAIN, repo, env, model)
    case.snapshot("explain", repo, ())


def x04(case):
    env, model = codex_home(case)
    repo = case.repo()
    write_goal(repo, goal(5, "- [ ] write a.txt containing 1"))
    codex(case, "ask-tool", "Use the request_user_input tool to ask me which number to write, then do the item.", repo,
          env, model, extra=("-c", "features.default_mode_request_user_input=true"))
    case.snapshot("after", repo, ("a.txt",))


def x05(case):
    env, model = codex_home(case)
    for label, role in (("with-role", "deep-thinker"), ("without-role", None)):
        repo = case.repo(label)
        write_goal(repo, goal(5, "- [ ] never mind"))
        child_env = dict(env, FREE_HANDS_ROLE=role) if role else env
        codex(case, label, "Reply with ok only.", repo, child_env, model)
        case.snapshot(label, repo, ())


def x06(case):
    env, _ = codex_home(case)
    repo, brief_dir = panel_repo(case)
    round_dir = brief_dir / "round1"
    case.run("panel-run", [sys.executable, str(SUBJECT / "scripts" / "panel.py"), "run", str(round_dir), "--brief",
                           str(brief_dir / "brief.json")], repo, env=env)
    case.run("panel-tally", [sys.executable, str(SUBJECT / "scripts" / "panel.py"), "tally", str(round_dir), "--brief",
                             str(brief_dir / "brief.json"), "--attempt", "1"], repo, env=env)
    panel_files(case, "panel_files", brief_dir)
    case.snapshot("after", repo, ())


def x07(case):
    env, model = codex_home(case)
    repo = case.repo()
    codex(case, "native", "Use your subagent tool, if you have one, to start one read-only subagent on the smallest "
                          "model you can choose and have it reply 'pong'. Report the tool name and every parameter you "
                          "passed.", repo, env, model)
    case.snapshot("after", repo, ())


CASES = {"V00": v00, "C01": c01, "C02": c02, "C03": c03, "C04": c04, "X01": x01, "X02": x02, "X03": x03, "X04": x04,
         "X05": x05, "X06": x06, "X07": x07}


def main():
    names = sys.argv[1:] or list(CASES)
    for name in names:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists ({case.dir} or {case.base}); use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        CASES[name](case)
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
