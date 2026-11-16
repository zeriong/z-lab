#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 Q4]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused.
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
import uuid

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
TMP = Path(tempfile.gettempdir()).resolve() / "fh-eta-probes-r3"
FREE_HANDS = Path("/Users/jeonjelyong/WorkSpace/Z-Work/because-i-needed/plugins/free-hands")
TMUX = shutil.which("tmux") or "/opt/homebrew/bin/tmux"
CHECKLIST = "## Checklist\n- [ ] one\n- [ ] two\n- [ ] three\n- [ ] four\n"
PROMPTS = {
    "Q1": ("Do these steps in order, each with exactly the tool named, then reply with one short sentence.\n"
           "1. Bash: sed -i '' 's/- \\[ \\] one/- [x] one/' notes.md\n"
           "2. Edit tool: in notes.md change `- [ ] two` to `- [x] two`.\n"
           "3. Bash: python3 -c \"import pathlib; p=pathlib.Path('notes.md'); "
           "p.write_text(p.read_text().replace('- [ ] three','- [x] three'))\"\n"
           "4. Write tool: rewrite notes.md with its current content but `- [ ] four` changed to `- [x] four`.\n"
           "5. Agent tool with subagent_type general-purpose: tell the subagent to run exactly `echo sub` with Bash and "
           "return the output."),
    "Q2": ("List the absolute path of every CLAUDE.md or memory file whose contents were given to you in this session, "
           "one per line, or the word none. Then stop."),
    "Q4": "Read .free-hands/goal.md. Do only the first open item, then end your turn.",
}
PROMPTS["Q3"] = PROMPTS["Q2"]
ISOLATION = {"Q1": ["--setting-sources", "project,local"], "Q2": ["--safe-mode"],
             "Q3": ["--setting-sources", "project,local"]}
PROBE = r'''#!/usr/bin/env python3
import hashlib, json, os, sys, time
event = sys.argv[1]
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    data = {"unparsed": raw[:300]}
def cut(value):
    if isinstance(value, str):
        return value[:300]
    if isinstance(value, dict):
        return {k: cut(v) for k, v in value.items()}
    if isinstance(value, list):
        return [cut(v) for v in value[:20]]
    return value
watch = None
path = os.environ.get("PROBE_WATCH")
if path and os.path.exists(path):
    body = open(path, "rb").read()
    watch = [os.stat(path).st_mtime_ns, hashlib.sha256(body).hexdigest()[:12], body.decode("utf-8", "replace")]
row = {"at": time.time(), "event": event, "keys": sorted(data) if isinstance(data, dict) else None, "input": cut(data),
       "watch": watch}
with open(os.environ["PROBE_LOG"], "a") as log:
    log.write(json.dumps(row) + "\n")
'''
MODULE = r'''import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const LOG = __LOG__
const GOAL = __GOAL__
const calls = atom({ plugin: 'eta-probe', key: 'calls' } as const, 0)
const rows: string[] = []

type Host = {
  fs: { write: (path: string, text: string) => Promise<void>; read: (path: string) => Promise<string> }
}

async function put($: Host, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

async function goalText($: Host): Promise<string> {
  try {
    return await $.fs.read(GOAL)
  } catch (error) {
    return `unreadable: ${String(error)}`
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await put($, { event: 'session.start' })
    return result
  })

  on('turn.start', async ($, e, next) => {
    await put($, { event: 'turn.start', turnId: e.turnId })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await put($, { event: 'turn.complete' })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await put($, { event: 'session.measure', changed: e.changed })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const before = Date.now()
    const result = await next(e)
    const after = Date.now()
    const goal = await goalText($)
    const n = (await read($, calls)) + 1
    await update($, calls, () => n)
    const spawnStart = Date.now()
    let spawnMs: number | string
    try {
      await $.process.run(['python3', '-c', 'pass'])
      spawnMs = Date.now() - spawnStart
    } catch (error) {
      spawnMs = `failed: ${String(error)}`
    }
    await put($, { event: 'tool.call', tool: e.tool, agentId: e.agentId ?? null, before, after, n, spawnMs,
      goalOpen: (goal.match(/^- \[ \]/gm) ?? []).length, goalDone: (goal.match(/^- \[x\]/gm) ?? []).length })
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const n = await read($, calls)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>probe-band calls={n}</Text>
      </Box>
    )
  })
}
'''
TYPES = """declare module 'claude-code' {
  interface PluginState {
    'eta-probe': { calls: number }
  }
}

export {}
"""


def tmux(*args):
    return subprocess.run([TMUX, *args], capture_output=True, text=True)


def git(*args, cwd):
    subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", *args], cwd=cwd, check=True,
                   capture_output=True, text=True)


class Case:
    def __init__(self, name):
        self.name, self.dir, self.notes, self.rows, self.n = name, RUNS / name, {}, [], 0
        self.base = TMP / name

    def repo(self):
        repo = self.base / "repo"
        repo.mkdir(parents=True)
        git("init", "-q", "-b", "main", str(repo), cwd=self.base)
        git("commit", "-q", "--allow-empty", "-m", "init", cwd=repo)
        (repo / ".git" / "info" / "exclude").write_text(".probe/\n")
        (repo / ".probe").mkdir()
        return repo

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


def hook_probe(base):
    plugin = base / "hook-probe"
    (plugin / ".claude-plugin").mkdir(parents=True)
    (plugin / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "hook-probe", "version": "0.0.0", "description": "lab: log hook inputs", "author": {"name": "lab"},
         "hooks": "./hooks/hooks.json"}, indent=1))
    (plugin / "probe.py").write_text(PROBE)
    command = 'python3 "${CLAUDE_PLUGIN_ROOT}/probe.py" '
    hooks = {}
    for event in ("SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop", "SubagentStop"):
        entry = {"hooks": [{"type": "command", "command": command + event}]}
        if event in ("PreToolUse", "PostToolUse"):
            entry["matcher"] = "*"
        hooks[event] = [entry]
    (plugin / "hooks").mkdir()
    (plugin / "hooks" / "hooks.json").write_text(json.dumps({"hooks": hooks}, indent=1))
    return plugin


def parse_stream(stdout):
    info = {"init": None, "hook_events": [], "tools": [], "texts": [], "result": None, "usage": None, "cost": None}
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        kind, sub = event.get("type"), event.get("subtype")
        if kind == "system" and sub == "init" and info["init"] is None:
            info["init"] = event
        elif kind == "system" and sub and sub.startswith("hook"):
            info["hook_events"].append({k: (str(v)[:300] if isinstance(v, str) else v) for k, v in event.items()
                                        if k in ("subtype", "hook_event", "hook_name", "exit_code", "outcome",
                                                 "output")})
        elif kind == "assistant":
            for block in (event.get("message") or {}).get("content") or []:
                if block.get("type") == "tool_use":
                    info["tools"].append({"name": block.get("name"), "input": block.get("input")})
                elif block.get("type") == "text":
                    info["texts"].append(block.get("text"))
        elif kind == "result":
            info.update(result=event.get("result"), usage=event.get("usage"), cost=event.get("total_cost_usd"),
                        model_usage=event.get("modelUsage"), num_turns=event.get("num_turns"),
                        duration_ms=event.get("duration_ms"))
    return info


def read_rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []


def run_print(case):
    repo = case.repo()
    plugin = hook_probe(case.base)
    shutil.copytree(plugin, case.dir / "hook-probe")
    log = repo / ".probe" / "hooks.jsonl"
    env = dict(os.environ, CXC_MODE="off", PROBE_LOG=str(log))
    if case.name == "Q1":
        (repo / "notes.md").write_text(CHECKLIST)
        env["PROBE_WATCH"] = str(repo / "notes.md")
    argv = ["claude", "-p", PROMPTS[case.name], *ISOLATION[case.name], "--plugin-dir", str(plugin), "--model",
            "sonnet", "--effort", "xhigh", "--output-format", "stream-json", "--verbose", "--include-hook-events",
            "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "Read", "Write", "Edit", "Agent"]
    case.notes["argv"] = argv
    proc, row = case.run(case.name, argv, repo, env)
    info = parse_stream(proc.stdout)
    row["tokens"] = True
    case.notes[row["step"]] = info
    rows = read_rows(log)
    shutil.copy2(log, case.dir / "hooks.jsonl") if log.exists() else None
    case.notes["hook_rows"] = len(rows)
    case.notes["hook_keys"] = {}
    for r in rows:
        case.notes["hook_keys"].setdefault(r["event"], sorted(set(r["keys"] or [])))
    transcripts = {r["input"].get("transcript_path") for r in rows if isinstance(r.get("input"), dict)} - {None}
    case.notes["transcripts"] = sorted(transcripts)
    models = {}
    for i, path in enumerate(sorted(transcripts)):
        if Path(path).exists():
            shutil.copy2(path, case.dir / f"transcript-{i}.jsonl")
            for line in Path(path).read_text().splitlines():
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                if entry.get("type") == "assistant":
                    model = (entry.get("message") or {}).get("model")
                    models[model] = models.get(model, 0) + 1
    case.notes["transcript_models"] = models
    if case.name == "Q1":
        case.notes["notes_after"] = (repo / "notes.md").read_text()


def run_tmux(case):
    repo = case.repo()
    sid = str(uuid.uuid4())
    goal_dir = repo / ".free-hands"
    goal_dir.mkdir()
    (goal_dir / ".gitignore").write_text("*\n")
    goal = "\n".join(["status: active", "max_iterations: 6", "iterations: 0", f"owner: {sid}", "default_branch: main",
                      "## Goal", "lab goal", "## Checklist"] +
                     [f"- [ ] item {x}: run `sleep 6`, then mark this item `- [x]`" for x in "abc"] +
                     ["## Decisions", "## Resume", ""])
    (goal_dir / "goal.md").write_text(goal)
    case.notes["goal_before"] = goal
    mod = case.base / "mod-probe"
    (mod / ".claude-plugin").mkdir(parents=True)
    (mod / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "mod-probe", "version": "0.0.0", "description": "lab: mod events", "author": {"name": "lab"},
         "types": "./types/index.d.ts"}, indent=1))
    (mod / "hooks").mkdir()
    (mod / "hooks" / "hooks.json").write_text(json.dumps({"modules": ["./register.tsx"]}))
    (mod / "hooks" / "register.tsx").write_text(MODULE.replace("__LOG__", json.dumps(str(repo / ".probe" /
                                                                                         "module.jsonl")))
                                                .replace("__GOAL__", json.dumps(str(goal_dir / "goal.md"))))
    (mod / "types").mkdir()
    (mod / "types" / "index.d.ts").write_text(TYPES)
    shutil.copytree(mod, case.dir / "mod-probe")
    snapshot = case.base / "free-hands"
    shutil.copytree(FREE_HANDS, snapshot, ignore=shutil.ignore_patterns("__pycache__"))
    case.notes["free_hands_commit"] = subprocess.run(["git", "-C", str(FREE_HANDS), "rev-parse", "HEAD"],
                                                     capture_output=True, text=True).stdout.strip()
    case.notes["free_hands_version"] = json.loads((snapshot / ".claude-plugin" / "plugin.json").read_text())["version"]
    argv = ["claude", "--plugin-dir", str(mod), "--plugin-dir", str(snapshot), "--session-id", sid, "--setting-sources",
            "project,local", "--model", "sonnet", "--effort", "xhigh", "--permission-mode", "acceptEdits",
            "--allowedTools", "Bash", "Read", "Write", "Edit"]
    case.notes.update(argv=argv, session_id=sid)
    command = "CXC_MODE=off " + " ".join(subprocess.list2cmdline([a]) for a in argv)
    session = f"fh-eta-r3-{case.name.lower()}"
    log = repo / ".probe" / "module.jsonl"
    shots = []

    def shot(label):
        screen = tmux("capture-pane", "-p", "-t", session).stdout
        shots.append({"at": time.time(), "label": label, "screen": screen})
        return screen

    def rows():
        return read_rows(log)

    def wait(test, timeout, step=1.0):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            if test(tmux("capture-pane", "-p", "-t", session).stdout, rows()):
                return True
            time.sleep(step)
        return False

    start = time.monotonic()
    tmux("new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo), command)
    try:
        wait(lambda s, r: "trust" in s.lower() or any(x["event"] == "session.start" for x in r), 60)
        screen = shot("start")
        if "trust" in screen.lower():  # default "No, exit"; keys sent too early are lost (r1, r2 deviations)
            case.notes["trust_dialog"] = True
            selected = False
            for attempt in range(3):
                time.sleep(2)
                tmux("send-keys", "-t", session, "Down")
                selected = wait(lambda s, r: "❯ Yes, I trust this folder" in s, 5, 0.5)
                if selected:
                    break
            case.notes["trust_yes_selected"] = selected
            shot("trust-selected")
            if not selected:
                raise RuntimeError("trust dialog: Yes was never selected; Enter not sent")
            tmux("send-keys", "-t", session, "Enter")
            time.sleep(2)
            shot("after-trust")
        wait(lambda s, r: any(x["event"] == "session.start" for x in r), 60)
        time.sleep(4)
        shot("ready")
        tmux("send-keys", "-t", session, "-l", PROMPTS["Q4"])
        time.sleep(0.5)
        tmux("send-keys", "-t", session, "Enter")
        end = time.monotonic() + 240
        while time.monotonic() < end:
            time.sleep(2)
            shot("tick")
            text = (goal_dir / "goal.md").read_text() if (goal_dir / "goal.md").exists() else ""
            if "- [ ]" not in text and any(x["event"] == "turn.complete" for x in rows()):
                break
        time.sleep(5)
        shot("end")
    finally:
        case.notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("send-keys", "-t", session, "-l", "/exit")
        tmux("send-keys", "-t", session, "Enter")
        time.sleep(3)
        tmux("kill-session", "-t", session)
        case.notes["module_rows"] = rows()
        if (goal_dir / "goal.md").exists():
            case.notes["goal_after"] = (goal_dir / "goal.md").read_text()
        if log.exists():
            shutil.copy2(log, case.dir / "module.jsonl")
        (case.dir / "screens.json").write_text(json.dumps(shots, indent=1, ensure_ascii=False) + "\n")


def main():
    for name in sys.argv[1:] or ["V00", "Q4"]:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            for tool in (["claude", "--version"], [TMUX, "-V"], ["python3", "--version"], ["node", "--version"]):
                case.notes[Path(tool[0]).name] = subprocess.run(tool, capture_output=True, text=True).stdout.strip()
        elif name == "Q4":
            run_tmux(case)
        else:
            run_print(case)
        (case.dir / "metrics.json").write_text(json.dumps(case.rows, indent=1) + "\n")
        (case.dir / "summary.json").write_text(json.dumps(case.notes, indent=1, ensure_ascii=False) + "\n")
        (case.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
