#!/usr/bin/env python3
"""State-aware runner for SPEC.md. Skips any case whose runs/<case>/summary.json exists.

usage: python3 run.py <scratch-dir> [case ...]
"""
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe_hook.py"
RUNS = HERE / "runs"
AUTH = Path.home() / ".codex" / "auth.json"
TAIL = ("Then end your reply with exactly one line: `SEEN:` followed by every string of the form `ZQ-` plus 8 hex "
        "characters that you received in this session from anything other than this prompt (for example hook or "
        "system context), separated by spaces — or `SEEN: none`.")
READ = "Use the Read tool to read src/alpha.ts."
XB = "Run exactly this shell command: `cat src/alpha.ts`"
SUB = ("Use the Agent tool with subagent_type general-purpose. Tell the subagent to use the Read tool on src/alpha.ts "
       "and to return, verbatim, every string of the form `ZQ-` plus 8 hex characters it received from anything other "
       "than its prompt. Report what it returned.")
CASES = {
    "cR1": ("claude", [("PostToolUse", ["Read"], 400)], READ),
    "cB1": ("claude", [("PostToolUse", ["Bash"], 400)], "Use the Bash tool to run exactly: `cat src/alpha.ts`"),
    "cF1": ("claude", [("PostToolUse", ["Bash"], 400), ("PostToolUseFailure", ["Bash"], 400)],
            "Use the Bash tool to run exactly: `cat src/alpha.ts && ls does-not-exist`"),
    "cD1": ("claude", [("PostToolUse", ["Bash"], 400)], "Use the Bash tool to run exactly: `cd src && cat alpha.ts`"),
    "cE1": ("claude", [("PostToolUse", ["Edit"], 400)],
            "Read src/alpha.ts, then use the Edit tool to change `1` to `2` in it."),
    "cS1": ("claude", [("PostToolUse", ["Read"], 400)], SUB),
    "cC1": ("claude", [("PostToolUse", ["Read"], 9990)], READ),
    "cC2": ("claude", [("PostToolUse", ["Read"], 10050)], READ),
    "cU1": ("claude", [("UserPromptSubmit", None, 9990)], "Reply with ok."),
    "cU2": ("claude", [("UserPromptSubmit", None, 10050)], "Reply with ok."),
    "xB1": ("codex", [("PostToolUse", None, 400)], XB),
    "xF1": ("codex", [("PostToolUse", None, 400)],
            "Run exactly this shell command: `cat src/alpha.ts && ls does-not-exist`"),
    "xE1": ("codex", [("PostToolUse", None, 400)], "Change `1` to `2` in src/alpha.ts."),
    "xC1": ("codex", [("PostToolUse", None, 9990)], XB),
    "xC2": ("codex", [("PostToolUse", None, 10050)], XB),
    "xC3": ("codex", [("PostToolUse", None, 30000)], XB),
    "xU1": ("codex", [("UserPromptSubmit", None, 400)], "Reply with ok."),
}


def token():
    return "ZQ-" + secrets.token_hex(4)


def sh(argv, cwd, env=None, timeout=600):
    return subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout)


def fixture(path):
    (path / "src").mkdir(parents=True)
    (path / "src" / "alpha.ts").write_text("export const alpha = 1;\n")
    (path / "README.md").write_text("# probe fixture\n")
    sh(["git", "init", "-q"], path)
    sh(["git", "add", "-A"], path)
    sh(["git", "-c", "user.name=lab", "-c", "user.email=lab@example.invalid", "commit", "-qm", "fixture"], path)


def hook_cmd(case_json, event):
    return f"python3 '{PROBE}' '{case_json}' {event}"


def claude_settings(repo, case_json, events):
    hooks = {}
    for ev in events:
        entry = {"hooks": [{"type": "command", "command": hook_cmd(case_json, ev)}]}
        if ev != "UserPromptSubmit":
            entry["matcher"] = "Read|Edit|Write|MultiEdit|Bash"
        hooks[ev] = [entry]
    (repo / ".claude").mkdir()
    (repo / ".claude" / "settings.json").write_text(json.dumps({"hooks": hooks}, indent=1))


def codex_hooks(repo, case_json, events):
    hooks = {ev: [{"hooks": [{"type": "command", "command": hook_cmd(case_json, ev)}]}] for ev in events}
    (repo / ".codex").mkdir()
    (repo / ".codex" / "hooks.json").write_text(json.dumps({"hooks": hooks}, indent=1))


def last_seen(text):
    lines = [l for l in (text or "").splitlines() if "SEEN:" in l]
    return lines[-1] if lines else ""


def run_claude(name, repo, prompt, out):
    t0 = time.time()
    p = sh(["claude", "-p", prompt, "--model", "sonnet", "--setting-sources", "project", "--permission-mode",
            "bypassPermissions", "--output-format", "stream-json", "--verbose", "--include-hook-events",
            "--max-turns", "8", "--max-budget-usd", "1"], repo)
    (out / "stream.jsonl").write_text(p.stdout)
    (out / "stderr.txt").write_text(p.stderr)
    info = {"rc": p.returncode, "seconds": round(time.time() - t0, 1), "session_id": None, "model": None,
            "answer": "", "cost_usd": None}
    for line in p.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("type") == "system" and ev.get("subtype") == "init":
            info["session_id"], info["model"] = ev.get("session_id"), ev.get("model")
        if ev.get("type") == "result":
            info["answer"], info["cost_usd"] = ev.get("result", ""), ev.get("total_cost_usd")
    roots = [Path(os.environ.get("CLAUDE_CONFIG_DIR", Path.home() / ".claude")) / "projects",
             Path.home() / ".claude" / "projects"]
    key = re.sub(r"[^A-Za-z0-9]", "-", str(repo.resolve()))
    files, rendered = 0, []
    for root in roots:
        d = root / key
        if not d.is_dir():
            continue
        for f in d.rglob("*.jsonl"):
            files += 1
            for line in f.read_text(errors="replace").splitlines():
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                att = rec.get("attachment") or {}
                if att.get("type") == "hook_additional_context":
                    rendered.append(json.dumps(rec.get("rendered"), ensure_ascii=False))
    # only what the transcript rendered to the model counts; stream-json hook events carry raw hook stdout
    info["transcript_files"], info["hook_context_records"] = files, len(rendered)
    return info, "\n".join(rendered)


def run_codex(name, repo, prompt, out, scratch):
    home = scratch / f"{name}-codex-home"
    home.mkdir()
    shutil.copy2(AUTH, home / "auth.json")
    (home / "config.toml").write_text(f'[projects."{repo.resolve()}"]\ntrust_level = "trusted"\n')
    env = dict(os.environ, CODEX_HOME=str(home), CXC_MODE="off")
    t0 = time.time()
    p = sh(["codex", "exec", "--json", "--dangerously-bypass-hook-trust", "-s", "workspace-write", "-C", str(repo),
            "-c", 'model_reasoning_effort="low"', prompt], repo, env)
    (out / "codex.jsonl").write_text(p.stdout)
    (out / "stderr.txt").write_text(p.stderr)
    info = {"rc": p.returncode, "seconds": round(time.time() - t0, 1), "answer": "", "model": None}
    for line in p.stdout.splitlines():
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        item = ev.get("item") or {}
        if item.get("type") == "agent_message":
            info["answer"] = item.get("text", "")
    rollouts = [f.read_text(errors="replace") for f in (home / "sessions").rglob("*.jsonl")] \
        if (home / "sessions").is_dir() else []
    m = re.search(r'"model"\s*:\s*"([^"]+)"', "\n".join(rollouts))
    info["model"] = m.group(1) if m else None
    info["rollout_files"] = len(rollouts)
    items, kinds = [], {}
    for line in "\n".join(rollouts).splitlines():
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        kinds[rec.get("type")] = kinds.get(rec.get("type"), 0) + 1
        if rec.get("type") == "response_item":  # model-visible history only, not hook run events
            items.append(line)
    info["rollout_types"] = kinds
    blob = "\n".join(items)
    shutil.rmtree(home)
    info["codex_home_removed"] = not home.exists()
    return info, blob


def main():
    scratch = Path(sys.argv[1]).resolve()
    only = set(sys.argv[2:])
    auth_before = hashlib.sha256(AUTH.read_bytes()).hexdigest() if AUTH.exists() else None
    for name, (host, emits, action) in CASES.items():
        out = RUNS / name
        if (only and name not in only) or (out / "summary.json").exists():
            continue
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        repo = scratch / name / "repo"
        if repo.parent.exists():
            shutil.rmtree(repo.parent)
        fixture(repo)
        case = {"log": str(out / "probe.jsonl"),
                "emit": [{"event": ev, "tools": tools, "size": size, "start": token(), "end": token()}
                         for ev, tools, size in emits]}
        case_json = out / "case.json"
        case_json.write_text(json.dumps(case, indent=1))
        events = sorted({e[0] for e in emits})
        prompt = f"{action} {TAIL}"
        (out / "prompt.txt").write_text(prompt + "\n")
        if host == "claude":
            claude_settings(repo, case_json, events)
            info, blob = run_claude(name, repo, prompt, out)
        else:
            codex_hooks(repo, case_json, events)
            info, blob = run_codex(name, repo, prompt, out, scratch)
        emitted = json.loads((out / "emitted.json").read_text()) if (out / "emitted.json").exists() else []
        seen = last_seen(info["answer"])
        verdicts = []
        for i, e in enumerate(case["emit"]):
            a_s, a_e = e["start"] in seen, e["end"] in seen
            t_s, t_e = blob.count(e["start"]), blob.count(e["end"])
            if i not in emitted:
                v = "not-fired"
            elif (a_s or t_s) and (a_e or t_e):
                v = "delivered"
            elif a_s or t_s:
                v = "truncated"
            else:
                v = "dropped"
            verdicts.append({"event": e["event"], "size": e["size"], "verdict": v, "answer_start": a_s,
                             "answer_end": a_e, "record_start_hits": t_s, "record_end_hits": t_e})
        probe = [json.loads(l) for l in (out / "probe.jsonl").read_text().splitlines()] \
            if (out / "probe.jsonl").exists() else []
        summary = {"case": name, "host": host, "cli": sh([host, "--version"], scratch).stdout.strip(),
                   "seen_line": seen, "verdicts": verdicts,
                   "probe_events": [{k: r.get(k) for k in ("hook_event_name", "event_arg", "tool_name", "cwd",
                                                           "agent_id", "agent_type", "emitted")} for r in probe],
                   **{k: v for k, v in info.items() if k != "answer"}}
        (out / "answer.txt").write_text(info["answer"] + "\n")
        (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
        print(name, [v["verdict"] for v in verdicts], info.get("rc"), flush=True)
    if AUTH.exists():
        after = hashlib.sha256(AUTH.read_bytes()).hexdigest()
        print("codex auth.json unchanged:", after == auth_before)


if __name__ == "__main__":
    main()
