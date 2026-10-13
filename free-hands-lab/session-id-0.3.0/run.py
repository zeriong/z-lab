#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 cA1 … xA6]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Later cases read the
first case's id from runs/<host>A1/summary.json. CLEANUP deletes the temporary Codex home (it holds a copy of
auth.json); run it even after a failure.
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
LATEST = LAB.parent / "run-0.2.0" / "subject" / "free-hands" / "scripts" / "latest-model.py"
TMP = Path(tempfile.gettempdir()).resolve() / "free-hands-lab-sid-030"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
ENV_PROMPT = ("Run exactly this shell command once and report its output: `env | grep -E '(SESSION|THREAD|AGENT)[A-Z_]*=' "
              "| grep -vE '(TOKEN|KEY|SECRET|AUTH|PASSWORD)'; echo end`")
OK = "Reply with the word ok."
SUB_CLAUDE = ("Use the Agent tool with subagent_type general-purpose. Tell the subagent to run exactly the shell command "
              "`echo from-subagent` with Bash and return its output. Then report that output.")
SUB_CODEX = ("Use your subagent tool to start one subagent. Tell it to run exactly the shell command `echo from-subagent` "
             "and return its output. Then report that output.")
FIXED_UUID = "5e55104e-0000-4000-8000-000000000a07"
PROBE = r'''#!/usr/bin/env python3
import json, os, re, sys
from pathlib import Path
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    data = {"unparsed": raw[:2000]}
env = {k: v for k, v in os.environ.items()
       if re.search("SESSION|THREAD|AGENT", k) and not re.search("TOKEN|KEY|SECRET|AUTH|PASSWORD", k)}
log = Path(__REPO__) / ".probe" / "log.jsonl"
log.parent.mkdir(exist_ok=True)
with open(log, "a") as out:
    out.write(json.dumps({"probe_event": sys.argv[1], "input": data, "env": env}) + "\n")
'''
CLAUDE_EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStart",
                 "SubagentStop", "PreCompact"]
CODEX_EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"]


def git(*args, cwd):
    subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=cwd, check=True,
                   capture_output=True, text=True)


def build_plugin(dest, repo, events):
    (dest / "scripts").mkdir(parents=True)
    (dest / "scripts" / "probe.py").write_text(PROBE.replace("__REPO__", json.dumps(str(repo))))
    (dest / "hooks").mkdir()
    hooks = {e: [{"hooks": [{"type": "command", "command": f'python3 "${{CLAUDE_PLUGIN_ROOT}}/scripts/probe.py" {e}'}]}]
             for e in events}
    (dest / "hooks" / "hooks.json").write_text(json.dumps({"hooks": hooks}, indent=1))
    (dest / "skills" / "noop").mkdir(parents=True)
    (dest / "skills" / "noop" / "SKILL.md").write_text(
        '---\nname: noop\ndescription: "lab placeholder skill"\n---\n\nReply with the word noop and the arguments: '
        '$ARGUMENTS\n')
    manifest = {"name": "fh-probe", "version": "0.0.0", "description": "lab: session id probe",
                "author": {"name": "lab"}}
    (dest / ".claude-plugin").mkdir()
    (dest / ".claude-plugin" / "plugin.json").write_text(json.dumps(dict(manifest, hooks="./hooks/hooks.json")))
    (dest / ".codex-plugin").mkdir()
    (dest / ".codex-plugin" / "plugin.json").write_text(json.dumps(dict(manifest, skills="./skills/")))


def host_setup(host):
    """The host's repository and probe plugin, created once and reused by every case of that host."""
    base = TMP / host
    repo, plugin = base / "repo", base / "fh-probe"
    if not repo.exists():
        repo.mkdir(parents=True)
        git("init", "-q", "-b", "main", str(repo), cwd=base)
        (repo / ".gitignore").write_text(".probe/\n")
        git("add", ".gitignore", cwd=repo)
        git("commit", "-q", "-m", "init", cwd=repo)
        build_plugin(plugin, repo, CLAUDE_EVENTS if host == "claude" else CODEX_EVENTS)
    return base, repo, plugin


class Case:
    def __init__(self, name):
        self.name, self.dir, self.n, self.rows, self.notes = name, RUNS / name, 0, [], {}

    def run(self, label, argv, cwd, env):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        elapsed = round((time.monotonic() - start) * 1000)
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        row = {"step": stem, "argv": argv[:8] + (["…"] if len(argv) > 8 else []), "exit": proc.returncode,
               "elapsed_ms": elapsed}
        self.rows.append(row)
        return proc, row

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def take_log(case, repo):
    """Move the probe lines this case produced into the case directory."""
    log = repo / ".probe" / "log.jsonl"
    lines = log.read_text().splitlines() if log.exists() else []
    (case.dir / "probe.jsonl").write_text("".join(line + "\n" for line in lines))
    if log.exists():
        log.unlink()
    case.notes["probe"] = [json.loads(line) for line in lines]


def first_id(host):
    return json.loads((RUNS / f"{host}A1" / "summary.json").read_text())["host_id"]


def claude_case(case, kind):
    base, repo, plugin = host_setup("claude")
    env = dict(os.environ, CXC_MODE="off")
    tools = ["Bash", "Agent"] if kind == "A5" else ["Bash"]
    prompt, extra = {"A1": (ENV_PROMPT, []), "A2": (OK, ["--resume", "@first"]), "A3": (OK, ["--continue"]),
                     "A4": ("/compact", ["--resume", "@first"]), "A5": (SUB_CLAUDE, []),
                     "A6": ("/fh-probe:noop hello", []), "A7": (OK, ["--session-id", FIXED_UUID])}[kind]
    extra = [first_id("c") if arg == "@first" else arg for arg in extra]
    argv = ["claude", "-p", prompt, *extra, "--plugin-dir", str(plugin), "--model", "sonnet", "--output-format",
            "stream-json", "--verbose", "--include-hook-events", "--permission-mode", "acceptEdits", "--allowedTools",
            *tools]
    proc, row = case.run(kind, argv, repo, env)
    info = {"host_id": None, "texts": [], "bash": [], "result": None, "cost": None, "usage": None, "model_usage": None}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "system" and event.get("subtype") == "init" and info["host_id"] is None:
            info["host_id"] = event.get("session_id")
        elif event.get("type") == "assistant":
            for block in (event.get("message") or {}).get("content") or []:
                if block.get("type") == "tool_use":
                    info["bash"].append({"tool": block.get("name"), "input": block.get("input")})
                elif block.get("type") == "text":
                    info["texts"].append(block.get("text"))
        elif event.get("type") == "result":
            info.update(result=event.get("result"), cost=event.get("total_cost_usd"), usage=event.get("usage"),
                        model_usage=list((event.get("modelUsage") or {}).keys()), result_session=event.get("session_id"))
    row["tokens"] = info["usage"] and {"input": info["usage"].get("input_tokens"),
                                       "output": info["usage"].get("output_tokens")}
    row["cost"] = info["cost"]
    case.notes.update(info)
    take_log(case, repo)


def codex_home(case, base):
    """One temporary CODEX_HOME shared by the Codex cases (resume needs the first case's session files); the CLEANUP
    step deletes it."""
    home = base / "codex-home"
    env = dict(os.environ, CODEX_HOME=str(home), CXC_MODE="off")
    if not home.exists():
        home.mkdir()
        shutil.copy2(AUTH, home / "auth.json")
        market = base / "market"
        (market / ".claude-plugin").mkdir(parents=True)
        shutil.copytree(base / "fh-probe", market / "plugins" / "fh-probe")
        (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
            "name": "fh-sid-lab", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0.0.0"},
            "plugins": [{"name": "fh-probe", "source": "./plugins/fh-probe", "version": "0.0.0", "description": "lab"}]}))
        case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], base, env)
        case.run("plugin-add", ["codex", "plugin", "add", "fh-probe@fh-sid-lab"], base, env)
    return env


def codex_case(case, kind):
    base, repo, plugin = host_setup("codex")
    case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    env = codex_home(case, base)
    proc, _ = case.run("resolve-luna", [sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"], base, env)
    model = proc.stdout.strip()
    common = ["--json", "--dangerously-bypass-hook-trust", "-m", model, "-c", 'model_reasoning_effort="medium"']
    if kind in ("A2", "A3"):
        target = [first_id("x")] if kind == "A2" else ["--last"]
        argv = ["codex", "exec", "resume", *target, OK, *common, "-c", 'sandbox_mode="workspace-write"']
    else:
        prompt = {"A1": ENV_PROMPT, "A5": SUB_CODEX, "A6": "$fh-probe:noop hello"}[kind]
        argv = ["codex", "exec", *common, "-s", "workspace-write", "-C", str(repo), prompt]
    proc, row = case.run(kind, argv, repo, env)
    info = {"host_id": None, "model": model, "commands": [], "messages": [], "items": [], "usage": []}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get("item") or {}
        if event.get("type") == "thread.started":
            info["host_id"] = event.get("thread_id")
        elif event.get("type") == "turn.completed":
            info["usage"].append(event.get("usage"))
        elif item.get("type") == "command_execution" and event.get("type") == "item.completed":
            info["commands"].append({"command": item.get("command"), "exit_code": item.get("exit_code"),
                                     "output": (item.get("aggregated_output") or "")[:1500]})
        elif item.get("type") == "agent_message":
            info["messages"].append(item.get("text"))
        if item.get("type") and event.get("type") == "item.completed":
            info["items"].append(item.get("type"))
    row["tokens"] = info["usage"]
    case.notes.update(info)
    take_log(case, repo)
    case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()


def cleanup(case):
    home = TMP / "codex" / "codex-home"
    shutil.rmtree(home, ignore_errors=True)
    case.notes["codex_home_removed"] = not home.exists()


def v00(case):
    for label, argv in (("claude-version", ["claude", "--version"]), ("codex-version", ["codex", "--version"])):
        case.run(label, argv, LAB, dict(os.environ))


NAMES = ["V00", "cA1", "cA2", "cA3", "cA4", "cA5", "cA6", "cA7", "xA1", "xA2", "xA3", "xA5", "xA6", "CLEANUP"]


def main():
    for name in sys.argv[1:] or NAMES:
        case = Case(name)
        if name == "CLEANUP":  # always runs, records nothing in runs/
            cleanup(case)
            print(f"CLEANUP: codex home removed = {case.notes['codex_home_removed']}", flush=True)
            continue
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists():
            sys.exit(f"{name}: incomplete directory exists ({case.dir}); use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            v00(case)
        elif name[0] == "c":
            claude_case(case, name[1:])
        else:
            codex_case(case, name[1:])
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
