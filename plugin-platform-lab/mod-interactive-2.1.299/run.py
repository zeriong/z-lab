#!/usr/bin/env python3
"""Run SPEC.md's cases in tmux. Usage: python3 run.py [V00 K1 K2 K3 K4 K5]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused.
"""
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
TMP = Path(tempfile.gettempdir()).resolve() / "mod-interactive-2299"
FREE_HANDS = Path("/Users/jeonjelyong/WorkSpace/Z-Work/because-i-needed/plugins/free-hands")
QUESTION = "probe: continue?"
PROMPTS = {
    "K1": "Reply with the word ok.",
    "K2": "Run exactly this shell command once and report its output: `echo one`",
    "K3": "Run exactly this shell command once and report its output: `echo two`",
    "K4": ("In one message, start two general-purpose subagents with the Agent tool. The first runs exactly `echo sub-a` "
           "with Bash, the second exactly `echo sub-b`. Report both outputs."),
    "K5": "Run exactly this shell command once and report its output: `echo fh`",
}
MODULE = r'''import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const LOG = __LOG__
const five = atom({ plugin: 'ask-probe', key: 'five' } as const, 'n/a')
const rows: string[] = []

type Writer = { fs: { write: (path: string, text: string) => Promise<void> } }

async function put($: Writer, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

export const register: Register = on => {
  let turnId: string | undefined
  let asking: Promise<string> | undefined

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await put($, { event: 'session.start' })
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const value = await read($, five)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>probe-band five_hour={value}</Text>
      </Box>
    )
  })

  on('session.measure', async ($, e, next) => {
    const window = e.rateLimits.find(r => r.kind === 'five_hour')
    const value = window ? String(window.percentUsed) : 'none'
    await update($, five, () => value)
    $.ui.status(`probe-status ${value}`)
    await put($, { event: 'session.measure', rateLimits: e.rateLimits })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    turnId = e.turnId
    await put($, { event: 'turn.start', turnId })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await put($, { event: 'turn.complete' })
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    asking ??= $.ui.ask('probe: continue?', ['예', '아니오'])
    let answer: string
    try {
      answer = await asking
    } catch (error) {
      answer = `rejected: ${String(error)}`
    }
    await put($, { event: 'tool.call', command: e.command, agentId: e.agentId ?? null, answer })
    if (answer === '아니오') {
      if (turnId) {
        try {
          await $.turn.abort({ turnId })
          await put($, { event: 'abort', ok: true })
        } catch (error) {
          await put($, { event: 'abort', error: String(error) })
        }
      }
      return { deny: 'ask-probe: the user answered no' }
    }
    return next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'ask-probe: its guard failed' }))
}
'''
TYPES = """export type Five = string

declare module 'claude-code' {
  interface PluginState {
    'ask-probe': { five: Five }
  }
}
"""


def tmux(*args):
    return subprocess.run(["tmux", *args], capture_output=True, text=True)


class Case:
    def __init__(self, name):
        self.name, self.dir, self.notes, self.shots = name, RUNS / name, {}, 0
        self.base, self.session = TMP / name, f"mi-{name.lower()}"

    def shot(self, label):
        self.shots += 1
        screen = tmux("capture-pane", "-p", "-t", self.session).stdout
        (self.dir / f"screen-{self.shots:02d}-{label}.txt").write_text(screen)
        return screen

    def rows(self):
        log = self.base / "repo" / ".probe" / "module.jsonl"
        return [json.loads(l) for l in log.read_text().splitlines()] if log.exists() else []

    def wait(self, test, timeout, step=1.0):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            screen = tmux("capture-pane", "-p", "-t", self.session).stdout
            if test(screen, self.rows()):
                return True
            time.sleep(step)
        return False


def build(case, repo):
    plugin = case.base / "ask-probe"
    (plugin / ".claude-plugin").mkdir(parents=True)
    (plugin / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "ask-probe", "version": "0.0.0", "description": "lab: interactive mod probe", "author": {"name": "lab"},
         "types": "./types/index.d.ts"}, indent=1))
    (plugin / "hooks").mkdir()
    (plugin / "hooks" / "hooks.json").write_text(json.dumps({"modules": ["./register.tsx"]}))
    (plugin / "hooks" / "register.tsx").write_text(
        MODULE.replace("__LOG__", json.dumps(str(repo / ".probe" / "module.jsonl"))))
    (plugin / "types").mkdir()
    (plugin / "types" / "index.d.ts").write_text(TYPES)
    shutil.copytree(plugin, case.dir / "plugin")
    return plugin


def run_case(case):
    kind = case.name
    case.base.mkdir(parents=True)
    repo = case.base / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
    (repo / ".git" / "info" / "exclude").write_text(".probe/\n")
    plugin = build(case, repo)
    argv = ["claude", "--plugin-dir", str(plugin)]
    sid = None
    if kind == "K5":
        snapshot = case.base / "free-hands"
        shutil.copytree(FREE_HANDS, snapshot)
        shutil.copytree(snapshot, case.dir / "free-hands", ignore=shutil.ignore_patterns("README*", "CHANGELOG.md"))
        argv += ["--plugin-dir", str(snapshot)]
        sid = str(uuid.uuid4())
        argv += ["--session-id", sid]
        (repo / ".free-hands").mkdir()
        (repo / ".free-hands" / ".gitignore").write_text("*\n")
        goal = "\n".join(["status: active", "max_iterations: 3", "iterations: 0", f"owner: {sid}",
                          "default_branch: main", "## Goal", "lab goal", "## Checklist",
                          "- [ ] run the command the user gives", "## Decisions", "## Resume", ""])
        (repo / ".free-hands" / "goal.md").write_text(goal)
        case.notes["goal_before"] = goal
    argv += ["--model", "sonnet", "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "Agent"]
    case.notes.update(argv=argv, session_id=sid)
    env_prefix = "CXC_MODE=off "
    command = env_prefix + " ".join(subprocess.list2cmdline([a]) if " " in a else a for a in argv)
    start = time.monotonic()
    tmux("new-session", "-d", "-s", case.session, "-x", "200", "-y", "50", "-c", str(repo), command)
    try:
        trusted = case.wait(lambda s, r: "trust" in s.lower() or any(x["event"] == "session.start" for x in r), 60)
        screen = case.shot("start")
        if "trust" in screen.lower():  # the dialog's default is "No, exit" (deviation D1)
            tmux("send-keys", "-t", case.session, "Down")
            time.sleep(0.5)
            tmux("send-keys", "-t", case.session, "Enter")
            case.notes["trust_dialog"] = True
        case.wait(lambda s, r: any(x["event"] == "session.start" for x in r), 60)
        time.sleep(4)
        case.shot("ready")
        tmux("send-keys", "-t", case.session, "-l", PROMPTS[kind])
        time.sleep(0.5)
        tmux("send-keys", "-t", case.session, "Enter")
        dialogs = 0
        if kind != "K1":
            end = time.monotonic() + 240
            while time.monotonic() < end:
                done = case.wait(lambda s, r: QUESTION in s or any(x["event"] == "turn.complete" for x in r), 15)
                screen = tmux("capture-pane", "-p", "-t", case.session).stdout
                if QUESTION in screen:
                    dialogs += 1
                    case.shot(f"dialog-{dialogs}")
                    if kind == "K3":
                        tmux("send-keys", "-t", case.session, "Down")
                        time.sleep(0.5)
                    tmux("send-keys", "-t", case.session, "Enter")
                    time.sleep(3)
                    case.shot(f"after-dialog-{dialogs}")
                    continue
                if any(x["event"] in ("turn.complete", "abort") for x in case.rows()):
                    break
        case.notes["dialogs_answered"] = dialogs
        case.wait(lambda s, r: any(x["event"] in ("turn.complete", "abort") for x in r), 240)
        time.sleep(5)
        case.shot("end")
    finally:
        case.notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("send-keys", "-t", case.session, "-l", "/exit")
        tmux("send-keys", "-t", case.session, "Enter")
        time.sleep(3)
        tmux("kill-session", "-t", case.session)
        case.notes["rows"] = case.rows()
        goal = repo / ".free-hands" / "goal.md"
        if goal.exists():
            case.notes["goal_after"] = goal.read_text()
        log = repo / ".probe" / "module.jsonl"
        if log.exists():
            shutil.copy2(log, case.dir / "module.jsonl")


def main():
    for name in sys.argv[1:] or ["V00", "K1", "K2", "K3", "K4", "K5"]:
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists() or case.base.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            for tool in (["claude", "--version"], ["tmux", "-V"]):
                case.notes[tool[0]] = subprocess.run(tool, capture_output=True, text=True).stdout.strip()
        else:
            run_case(case)
        (case.dir / "summary.json").write_text(json.dumps(case.notes, indent=1, ensure_ascii=False) + "\n")
        (case.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
