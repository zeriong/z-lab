#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 R1 R2 R3]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Each case runs a
bootstrap exec, a fresh exec and a resume in one temporary home, deleted in a finally block.
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
TMP = Path(tempfile.gettempdir()).resolve() / "budget-codex-gate-010-r2"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
FREE_HANDS = Path("/Users/jeonjelyong/WorkSpace/Z-Work/because-i-needed/plugins/free-hands")
LATEST = FREE_HANDS / "scripts" / "latest-model.py"
PROMPT = "Run exactly this shell command once and report its output: `{}`"
GATE = r'''#!/usr/bin/env python3
import json, os, re, sys, time
from pathlib import Path

QUESTION = "지정한 {n}%에 도달했습니다, 작업을 이어서 진행하시겠어요?"
YES = {"예", "yes", "y", "계속"}


def last_limits(path):
    """(timestamp, rate_limits, path) of the file's newest rate-limit record, or None."""
    found = None
    try:
        for line in Path(path).read_text().splitlines():
            if '"rate_limits"' not in line:
                continue
            try:
                event = json.loads(line)
            except ValueError:
                continue
            stack = [event]
            while stack:
                node = stack.pop()
                if isinstance(node, dict):
                    if isinstance(node.get("rate_limits"), dict):
                        found = (str(event.get("timestamp") or ""), node["rate_limits"], str(path))
                    stack.extend(node.values())
                elif isinstance(node, list):
                    stack.extend(node)
    except OSError:
        return None
    return found


def newest_limits(path):
    """The newest record among this session's rollout and the 20 most recently written rollouts beside it."""
    files = [Path(path)] if path else []
    sessions = Path(path).parents[3] if path else None
    if sessions is not None and sessions.is_dir():
        files += sorted(sessions.rglob("rollout-*.jsonl"), key=lambda f: f.stat().st_mtime, reverse=True)[:20]
    records = [r for r in (last_limits(f) for f in dict.fromkeys(files)) if r]
    if not records:
        return None
    newest = max(records, key=lambda r: r[0])
    return dict(newest[1], _source=newest[2], _timestamp=newest[0])


def window(limits):
    for key in ("primary", "secondary"):
        w = (limits or {}).get(key)
        if isinstance(w, dict) and w.get("window_minutes") == 10080:
            return w
    return None


def main():
    event = sys.argv[1]
    data = json.loads(sys.stdin.read() or "{}")
    repo = Path(data.get("cwd") or ".")
    state = Path(os.environ["XDG_CONFIG_HOME"]) / "because-i-needed"
    sid = data.get("session_id") or "none"
    pending, ack = state / "pending" / f"{sid}.json", state / "acks" / f"{sid}.json"
    row = {"event": event, "session_id": sid, "at": time.time()}
    out = None
    try:
        n = json.loads((state / "budget.json").read_text())["percent"]
    except (OSError, ValueError, KeyError):
        n = None
    row["threshold"] = n
    if event == "PreToolUse" and n is not None:
        limits = newest_limits(data.get("transcript_path") or "")
        w = window(limits)
        row["window"], row["source"] = w, limits and limits.get("_source")
        acked = json.loads(ack.read_text()).get("resets_at") if ack.exists() else None
        row["acked"] = acked
        if w and w.get("used_percent", 0) >= n and acked != w.get("resets_at"):
            pending.parent.mkdir(parents=True, exist_ok=True)
            pending.write_text(json.dumps({"resets_at": w.get("resets_at"), "used": w.get("used_percent")}))
            reason = (f"budget: the usage window is at {w.get('used_percent')}% (threshold {n}%). Do not run anything "
                      f"else. End your turn now and ask the user exactly: \"{QUESTION.format(n=n)}\" (예/아니오)")
            out = {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                          "permissionDecisionReason": reason}}
            row["decision"] = "deny"
        else:
            row["decision"] = "allow"
    elif event == "UserPromptSubmit" and pending.exists():
        answer = (data.get("prompt") or "").strip().lower()
        row["answer"] = answer
        if answer in YES:
            ack.parent.mkdir(parents=True, exist_ok=True)
            ack.write_text(json.dumps({"resets_at": json.loads(pending.read_text()).get("resets_at")}))
            pending.unlink()
            note, row["decision"] = "budget: the user chose to continue.", "ack"
        else:
            note, row["decision"] = "budget: the user did not confirm; do not run tools until they answer 예.", "hold"
        out = {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": note}}
    log = repo / ".probe" / "gate.jsonl"
    log.parent.mkdir(exist_ok=True)
    with open(log, "a") as handle:
        handle.write(json.dumps(row) + "\n")
    if out:
        print(json.dumps(out))


main()
'''


def plugin(base):
    dest = base / "gate-probe"
    (dest / "scripts").mkdir(parents=True)
    (dest / "scripts" / "gate.py").write_text(GATE)
    (dest / "hooks").mkdir()
    hooks = {e: [{"hooks": [{"type": "command", "command": f'python3 "${{CLAUDE_PLUGIN_ROOT}}/scripts/gate.py" {e}'}]}]
             for e in ("PreToolUse", "UserPromptSubmit", "Stop")}
    (dest / "hooks" / "hooks.json").write_text(json.dumps({"hooks": hooks}, indent=1))
    (dest / "skills" / "noop").mkdir(parents=True)
    (dest / "skills" / "noop" / "SKILL.md").write_text('---\nname: noop\ndescription: "lab placeholder"\n---\nok\n')
    manifest = {"name": "gate-probe", "version": "0.0.0", "description": "lab: budget gate on Codex",
                "author": {"name": "lab"}}
    (dest / ".claude-plugin").mkdir()
    (dest / ".claude-plugin" / "plugin.json").write_text(json.dumps(manifest))
    (dest / ".codex-plugin").mkdir()
    (dest / ".codex-plugin" / "plugin.json").write_text(json.dumps(dict(manifest, skills="./skills/")))
    return dest


class Case:
    def __init__(self, name):
        self.name, self.dir, self.n, self.rows, self.notes = name, RUNS / name, 0, [], {}
        self.base = TMP / name

    def run(self, label, argv, cwd, env):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL)
        elapsed = round((time.monotonic() - start) * 1000)
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        self.rows.append({"step": stem, "argv": argv[:8] + (["…"] if len(argv) > 8 else []), "exit": proc.returncode,
                          "elapsed_ms": elapsed})
        return proc

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


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
                                     "output": (item.get("aggregated_output") or "")[:400]})
        elif event.get("type") == "item.completed" and item.get("type") == "agent_message":
            info["messages"].append(item.get("text"))
    return info


def setup(case, plugins, threshold):
    case.base.mkdir(parents=True)
    repo = case.base / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
    (repo / ".git" / "info" / "exclude").write_text(".probe/\n")
    xdg = case.base / "xdg"
    (xdg / "because-i-needed").mkdir(parents=True)
    (xdg / "because-i-needed" / "budget.json").write_text(json.dumps({"percent": threshold}))
    home = case.base / "codex-home"
    home.mkdir()
    shutil.copy2(AUTH, home / "auth.json")
    env = dict(os.environ, CODEX_HOME=str(home), XDG_CONFIG_HOME=str(xdg), CXC_MODE="off")
    market = case.base / "market"
    (market / ".claude-plugin").mkdir(parents=True)
    entries = []
    for src in plugins:
        shutil.copytree(src, market / "plugins" / src.name)
        name = json.loads((src / ".codex-plugin" / "plugin.json").read_text())["name"]
        entries.append({"name": name, "source": f"./plugins/{src.name}", "version": "0.0.0", "description": "lab"})
    (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
        "name": "gate-lab", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0.0.0"},
        "plugins": entries}))
    case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], case.base, env)
    for entry in entries:
        case.run(f"plugin-add-{entry['name']}", ["codex", "plugin", "add", f"{entry['name']}@gate-lab"], case.base, env)
    model = case.run("resolve-luna", [sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"], case.base,
                     env).stdout.strip()
    return repo, home, env, model


def common(model):
    return ["--json", "--dangerously-bypass-hook-trust", "-m", model, "-c", 'model_reasoning_effort="medium"']


def collect(case, repo):
    log = repo / ".probe" / "gate.jsonl"
    case.notes["gate"] = [json.loads(l) for l in log.read_text().splitlines()] if log.exists() else []
    if log.exists():
        shutil.copy2(log, case.dir / "gate.jsonl")


def run_case(case):
    case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    home = None
    try:
        gate = plugin(TMP / f"{case.name}-plugins")
        shutil.copytree(gate, case.dir / "gate-probe")
        threshold = 99 if case.name == "R3" else 0
        repo, home, env, model = setup(case, [gate], threshold)
        case.notes.update(model=model, threshold=threshold)
        boot = parse(case.run("bootstrap", ["codex", "exec", *common(model), "-s", "workspace-write", "-C", str(repo),
                                            "Reply with the word ok."], repo, env))
        case.notes["bootstrap_thread"] = boot["thread_id"]
        word = {"R1": "echo after-yes", "R2": "echo after-no", "R3": "echo open"}[case.name]
        fresh = parse(case.run("fresh", ["codex", "exec", *common(model), "-s", "workspace-write", "-C", str(repo),
                                         PROMPT.format(word)], repo, env))
        case.notes["fresh"] = fresh
        if case.name != "R3":
            answer = "예" if case.name == "R1" else "아니오"
            case.notes["answer"] = answer
            case.notes["resume"] = parse(case.run("resume", ["codex", "exec", "resume", fresh["thread_id"], answer,
                                                             *common(model), "-c", 'sandbox_mode="workspace-write"'],
                                                  repo, env))
        state = case.base / "xdg" / "because-i-needed"
        case.notes["state_files"] = sorted(str(p.relative_to(state)) for p in state.rglob("*") if p.is_file())
        collect(case, repo)
    finally:
        case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
        if home is not None:
            shutil.rmtree(home, ignore_errors=True)
            case.notes["codex_home_removed"] = not home.exists()


def main():
    for name in sys.argv[1:] or ["V00", "R1", "R2", "R3"]:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            for label, argv in (("codex-version", ["codex", "--version"]),):
                case.run(label, argv, LAB, dict(os.environ))
        else:
            run_case(case)
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
