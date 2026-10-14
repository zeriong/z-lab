#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 V cA cB cC xA xB xC]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Each Codex case deletes
its temporary CODEX_HOME (it holds a copy of auth.json) in a finally block.
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
TMP = Path(tempfile.gettempdir()).resolve() / "mod-dual-host-2299"
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
LATEST = LAB.parents[1] / "free-hands-lab" / "run-0.3.0" / "subject" / "free-hands" / "scripts" / "latest-model.py"
PROMPT = "Run exactly this shell command once and report its output: `echo probe`"
EVENTS = ["SessionStart", "UserPromptSubmit", "PreToolUse", "Stop"]
PROBE = r'''#!/usr/bin/env python3
import json, sys
from pathlib import Path
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    data = {"unparsed": raw[:500]}
repo = Path(data.get("cwd") or ".")
log = repo / ".probe" / "command.jsonl"
log.parent.mkdir(exist_ok=True)
with open(log, "a") as out:
    out.write(json.dumps({"event": sys.argv[1], "input": {k: data.get(k) for k in
        ("hook_event_name", "session_id", "tool_name", "source")}}) + "\n")
'''
MODULE = r'''import type { Register } from 'claude-code'

const LOG = __LOG__
const OUTSIDE = __OUTSIDE__
const rows: string[] = []

type Writer = { fs: { write: (path: string, text: string) => Promise<void> } }

async function put($: Writer, row: Record<string, unknown>): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), ...row }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

async function attempt<T>(work: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await work()
  } catch (error) {
    return { error: String(error) }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const home = await attempt(() => $.env.get('HOME'))
    await put($, {
      event: 'session.start',
      root: $.plugin.root,
      enabledPlugins: await attempt(async () => Object.keys((await $.settings.read()).enabledPlugins ?? {})),
      home,
      outside: await attempt(() => $.fs.read(OUTSIDE)),
      peerCodingFlag: await attempt(() => $.fs.exists(`${typeof home === 'string' ? home : ''}/.config/claude-x-codex/mode`)),
      process: await attempt(async () => {
        const ran = await $.process.run(['python3', '-c', 'print(42)'])
        return { exitCode: ran.exitCode, stdout: ran.stdout }
      }),
    })
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    await put($, { event: 'prompt.submit', length: e.text.length })
    return next(e)
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await put($, { event: 'tool.call', command: e.command })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await put($, { event: 'session.measure', rateLimits: e.rateLimits, changed: e.changed })
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const usage = await attempt(async () => (await $.session.usage()).rateLimits)
    await put($, { event: 'session.end', rateLimits: usage })
    return next(e)
  })
}
'''


def command_hooks():
    return {e: [{"hooks": [{"type": "command", "command": f'python3 "${{CLAUDE_PLUGIN_ROOT}}/scripts/probe.py" {e}'}]}]
            for e in EVENTS}


def build(layout, dest, repo, outside):
    (dest / "scripts").mkdir(parents=True)
    (dest / "scripts" / "probe.py").write_text(PROBE)
    (dest / "skills" / "noop").mkdir(parents=True)
    (dest / "skills" / "noop" / "SKILL.md").write_text('---\nname: noop\ndescription: "lab placeholder"\n---\nok\n')
    module = MODULE.replace("__LOG__", json.dumps(str(repo / ".probe" / "module.jsonl"))).replace(
        "__OUTSIDE__", json.dumps(str(outside)))
    manifest = {"name": "mod-probe", "version": "0.0.0", "description": "lab: mod and command hooks in one plugin",
                "author": {"name": "lab"}}
    claude, codex = dict(manifest), dict(manifest, skills="./skills/")
    (dest / "hooks").mkdir()
    if layout == "A":
        (dest / "hooks" / "register.ts").write_text(module)
        (dest / "hooks" / "hooks.json").write_text(json.dumps({"hooks": command_hooks(), "modules": ["./register.ts"]},
                                                              indent=1))
    elif layout == "B":
        (dest / "hooks" / "hooks.json").write_text(json.dumps({"hooks": command_hooks()}, indent=1))
        (dest / "mods").mkdir()
        (dest / "mods" / "register.ts").write_text(module)
        (dest / "mods" / "hooks.json").write_text(json.dumps({"modules": ["./register.ts"]}, indent=1))
        claude["hooks"] = "./mods/hooks.json"
    else:
        (dest / "hooks" / "register.ts").write_text(module)
        (dest / "hooks" / "hooks.json").write_text(json.dumps({"modules": ["./register.ts"]}, indent=1))
        (dest / "hooks" / "codex.json").write_text(json.dumps({"hooks": command_hooks()}, indent=1))
        codex["hooks"] = "./hooks/codex.json"
    for folder, data in ((".claude-plugin", claude), (".codex-plugin", codex)):
        (dest / folder).mkdir()
        (dest / folder / "plugin.json").write_text(json.dumps(data, indent=1))


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

    def setup(self, layout):
        self.base.mkdir(parents=True)
        repo = self.base / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
        (repo / ".git" / "info" / "exclude").write_text(".probe/\n")
        outside = self.base / "outside.txt"
        outside.write_text("outside the repository\n")
        plugin = self.base / "mod-probe"
        build(layout, plugin, repo, outside)
        shutil.copytree(plugin, self.dir / "plugin")  # the specimen as it ran
        return repo, plugin

    def collect(self, repo):
        for name in ("command.jsonl", "module.jsonl"):
            path = repo / ".probe" / name
            self.notes[name] = [json.loads(l) for l in path.read_text().splitlines()] if path.exists() else None
            if path.exists():
                shutil.copy2(path, self.dir / name)

    def finish(self):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(self.notes, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def claude_case(case, layout):
    repo, plugin = case.setup(layout)
    proc = case.run(layout, ["claude", "-p", PROMPT, "--plugin-dir", str(plugin), "--model", "sonnet",
                             "--output-format", "stream-json", "--verbose", "--include-hook-events",
                             "--permission-mode", "acceptEdits", "--allowedTools", "Bash"], repo,
                    dict(os.environ, CXC_MODE="off"))
    hooks, result = [], {}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "system" and event.get("subtype") in ("hook_started", "hook_response"):
            hooks.append({k: event.get(k) for k in ("subtype", "hook_event", "hook_name", "exit_code", "outcome")})
        elif event.get("type") == "result":
            result = {"result": event.get("result"), "cost": event.get("total_cost_usd"), "usage": event.get("usage")}
    case.notes.update(hook_events=hooks, **result)
    case.rows[-1]["tokens"] = True
    case.collect(repo)


def codex_case(case, layout):
    repo, plugin = case.setup(layout)
    home = case.base / "codex-home"
    home.mkdir()
    try:
        shutil.copy2(AUTH, home / "auth.json")
        case.notes["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
        env = dict(os.environ, CODEX_HOME=str(home), CXC_MODE="off")
        market = case.base / "market"
        (market / ".claude-plugin").mkdir(parents=True)
        shutil.copytree(plugin, market / "plugins" / "mod-probe")
        (market / ".claude-plugin" / "marketplace.json").write_text(json.dumps({
            "name": "mod-lab", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0.0.0"},
            "plugins": [{"name": "mod-probe", "source": "./plugins/mod-probe", "version": "0.0.0", "description": "lab"}]}))
        case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], case.base, env)
        add = case.run("plugin-add", ["codex", "plugin", "add", "mod-probe@mod-lab"], case.base, env)
        case.notes["plugin_add"] = {"exit": add.returncode, "stdout": add.stdout[-800:], "stderr": add.stderr[-800:]}
        model = case.run("resolve-luna", [sys.executable, str(LATEST), "codex", "luna", "--effort", "medium"],
                         case.base, env).stdout.strip()
        proc = case.run(layout, ["codex", "exec", "--json", "--dangerously-bypass-hook-trust", "-m", model, "-c",
                                 'model_reasoning_effort="medium"', "-s", "workspace-write", "-C", str(repo), PROMPT],
                        repo, env)
        items, usage = [], []
        for line in proc.stdout.splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            item = event.get("item") or {}
            if event.get("type") == "item.completed":
                items.append({"type": item.get("type"), "text": (item.get("text") or item.get("message") or
                                                                 item.get("command") or "")[:300]})
            elif event.get("type") == "turn.completed":
                usage.append(event.get("usage"))
        case.notes.update(items=items, usage=usage, stderr_tail=proc.stderr[-1500:])
        case.rows[-1]["tokens"] = True
        case.collect(repo)
        case.notes["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    finally:
        shutil.rmtree(home, ignore_errors=True)
        case.notes["codex_home_removed"] = not home.exists()


def validate_case(case):
    for layout in "ABC":
        dest = case.base / f"layout-{layout}"
        build(layout, dest, case.base / "repo", case.base / "outside.txt")
        proc = case.run(f"validate-{layout}", ["claude", "plugin", "validate", str(dest)], case.base, dict(os.environ))
        case.notes[layout] = {"exit": proc.returncode, "output": (proc.stdout + proc.stderr)[-2000:]}


def main():
    for name in sys.argv[1:] or ["V00", "V", "cA", "cB", "cC", "xA", "xB", "xC"]:
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
        elif name == "V":
            case.base.mkdir(parents=True)
            validate_case(case)
        elif name[0] == "c":
            claude_case(case, name[1])
        else:
            codex_case(case, name[1])
        case.finish()
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
