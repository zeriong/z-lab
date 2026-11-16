#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 K1 B1]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. subject/ and control/
are copied for every case and never edited.
"""
import json
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
TMP = Path(tempfile.gettempdir()).resolve() / "dashboard-run-030"
TMUX = shutil.which("tmux") or "/opt/homebrew/bin/tmux"
DASHBOARD = {"K1": LAB / "control" / "dashboard-0.2.0", "B1": LAB / "subject" / "dashboard"}
FREE_HANDS = LAB / "subject" / "free-hands"
PROMPT = "Read .free-hands/goal.md and work through its checklist."
ENTRY = re.compile(r"🙌free-hands: (.*?)(?:   |$)", re.MULTILINE)
MODULE = r'''import type { Register } from 'claude-code'

const LOG = __LOG__
const rows: string[] = []

async function put($: { fs: { write: (path: string, text: string) => Promise<void> } }, event: string): Promise<void> {
  rows.push(JSON.stringify({ at: Date.now(), event }))
  await $.fs.write(LOG, rows.join('\n') + '\n')
}

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    await put($, 'turn.start')
    return next(e)
  })
  on('turn.complete', async ($, e, next) => {
    await put($, 'turn.complete')
    return next(e)
  })
}
'''


def tmux(*args):
    return subprocess.run([TMUX, *args], capture_output=True, text=True)


def read_rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []


def run_case(name, out):
    base = TMP / name
    repo = base / "repo"
    repo.mkdir(parents=True)
    subprocess.run(["git", "init", "-q", "-b", "main", str(repo)], check=True)
    subprocess.run(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-q",
                    "--allow-empty", "-m", "init"], cwd=repo, check=True)
    sid = str(uuid.uuid4())
    goal_dir = repo / ".free-hands"
    goal_dir.mkdir()
    (goal_dir / ".gitignore").write_text("*\n")
    goal = "\n".join(["status: active", "max_iterations: 10", "iterations: 0", f"owner: {sid}", "default_branch: main",
                      "## Goal", "lab goal", "## Checklist"] +
                     [f"- [ ] item {x}: run `sleep 20`, then mark this item `- [x]` (~2m ops)" for x in "abc"] +
                     ["## Decisions", "## Resume", ""])
    (goal_dir / "goal.md").write_text(goal)
    copies = base / "plugins"
    shutil.copytree(DASHBOARD[name], copies / "dashboard")
    shutil.copytree(FREE_HANDS, copies / "free-hands")
    log = base / "turn-log.jsonl"
    turn_log = copies / "turn-log"
    (turn_log / ".claude-plugin").mkdir(parents=True)
    (turn_log / ".claude-plugin" / "plugin.json").write_text(json.dumps(
        {"name": "turn-log", "version": "0.0.0", "description": "lab: log turn boundaries", "author": {"name": "lab"}}))
    (turn_log / "hooks").mkdir()
    (turn_log / "hooks" / "hooks.json").write_text(json.dumps({"modules": ["./register.tsx"]}))
    (turn_log / "hooks" / "register.tsx").write_text(MODULE.replace("__LOG__", json.dumps(str(log))))
    shutil.copytree(turn_log, out / "turn-log")
    xdg = base / "xdg"
    xdg.mkdir()
    argv = ["claude", "--plugin-dir", str(copies / "dashboard"), "--plugin-dir", str(copies / "free-hands"),
            "--plugin-dir", str(turn_log), "--session-id", sid, "--setting-sources", "project,local", "--model",
            "sonnet", "--effort", "xhigh", "--permission-mode", "acceptEdits", "--allowedTools", "Bash", "Read",
            "Write", "Edit"]
    notes = {"case": name, "argv": argv, "session_id": sid, "goal_before": goal}
    command = (f"env -u CXC_MODE XDG_CONFIG_HOME='{xdg}' BECAUSE_I_NEEDED_PLUGIN_DIRS='{copies / 'free-hands'}' "
               + " ".join(argv))
    session = f"dash030-{name.lower()}"
    shots = []

    def shot(label):
        screen = tmux("capture-pane", "-p", "-t", session).stdout
        found = ENTRY.findall(screen)
        shots.append({"at": time.time(), "label": label, "entry": found[-1].strip() if found else None,
                      "screen": screen})
        return screen

    def wait(test, timeout, step=0.5):
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            if test(tmux("capture-pane", "-p", "-t", session).stdout):
                return True
            time.sleep(step)
        return False

    start = time.monotonic()
    tmux("new-session", "-d", "-s", session, "-x", "200", "-y", "50", "-c", str(repo), command)
    try:
        wait(lambda s: "trust" in s.lower(), 60)
        if "trust" in shot("start").lower():
            selected = False
            for _ in range(3):
                time.sleep(2)
                tmux("send-keys", "-t", session, "Down")
                selected = wait(lambda s: "❯ Yes, I trust this folder" in s, 5)
                if selected:
                    break
            notes["trust_yes_selected"] = selected
            if not selected:
                raise RuntimeError("trust dialog: Yes was never selected; Enter not sent")
            tmux("send-keys", "-t", session, "Enter")
        time.sleep(8)
        shot("ready")
        tmux("send-keys", "-t", session, "-l", PROMPT)
        time.sleep(0.5)
        tmux("send-keys", "-t", session, "Enter")
        notes["prompt_at"] = time.time()
        end = time.monotonic() + 300
        while time.monotonic() < end:
            time.sleep(2)
            shot("tick")
            text = (goal_dir / "goal.md").read_text()
            if "- [ ]" not in text and any(r["event"] == "turn.complete" for r in read_rows(log)):
                break
        time.sleep(5)
        shot("end")
    finally:
        notes["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        tmux("send-keys", "-t", session, "-l", "/exit")
        tmux("send-keys", "-t", session, "Enter")
        time.sleep(3)
        tmux("kill-session", "-t", session)
        notes["turn_log"] = read_rows(log)
        notes["goal_after"] = (goal_dir / "goal.md").read_text()
        for name_ in ("eta.json", "timings.jsonl"):
            if (goal_dir / name_).exists():
                notes[name_] = (goal_dir / name_).read_text()
        complete = next((r["at"] / 1000 for r in notes["turn_log"] if r["event"] == "turn.complete"), None)
        before = [s["entry"] for s in shots if s["entry"] and (complete is None or s["at"] < complete)]
        notes["values_before_turn_complete"] = list(dict.fromkeys(before))
        (out / "screens.json").write_text(json.dumps(shots, indent=1, ensure_ascii=False) + "\n")
    return notes


def main():
    for name in sys.argv[1:] or ["V00", "K1", "B1"]:
        out = RUNS / name
        if (out / "DONE").exists():
            print(f"{name}: DONE, skipped", flush=True)
            continue
        if out.exists() or (TMP / name).exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        out.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        if name == "V00":
            notes = {Path(t[0]).name: subprocess.run(t, capture_output=True, text=True).stdout.strip()
                     for t in (["claude", "--version"], [TMUX, "-V"], ["python3", "--version"])}
        else:
            notes = run_case(name, out)
        (out / "summary.json").write_text(json.dumps(notes, indent=1, ensure_ascii=False) + "\n")
        (out / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
