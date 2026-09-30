#!/usr/bin/env python3
"""Run this experiment's SPEC.md cases. Usage: python3 run.py <product-checkout> [CASE ...]

One runner, copied unchanged into the four `latest-model` wired experiments; it picks its cases from
the directory it sits in. A case directory holding DONE is skipped; an existing one without DONE is
refused. The subject (the plugin folder) is copied once with a sha256 manifest and verified on every run.
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
SERIES = {"claude-x-codex-lab": "claude-x-codex", "plan-smith-lab": "plan-smith",
          "ux-ui-lab": "ux-ui", "harness-lab": "harness"}
PLUGIN = SERIES[LAB.parent.name]
SUBJECT = LAB / "subject" / PLUGIN
MANIFEST = LAB / "subject" / "MANIFEST.sha256"
RUNS = LAB / "runs"
HAIKU = "claude-haiku-4-5-20251001"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PLAN_TASK = ("a short decision plan: JSON file versus SQLite for an offline single-user note app "
             "(title and body records, no sync, no concurrency)")


def manifest_lines(root):
    return [f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root)}"
            for p in sorted(root.rglob("*")) if p.is_file()]


def ensure_subject(product):
    if not SUBJECT.exists():
        shutil.copytree(product / "plugins" / PLUGIN, SUBJECT)
        MANIFEST.write_text("\n".join(manifest_lines(SUBJECT)) + "\n")
    if manifest_lines(SUBJECT) != MANIFEST.read_text().splitlines():
        sys.exit("subject does not match subject/MANIFEST.sha256")


def env_with(**changes):
    env = dict(os.environ)
    env["CXC_MODE"] = "off"
    for key, value in changes.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return env


class Case:
    def __init__(self, name):
        self.dir = RUNS / name
        self.rows = []
        self.n = 0

    def run(self, label, argv, env=None, cwd=None, stdin_text=None, timeout=3600):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env or env_with(), capture_output=True, text=True,
                              input=stdin_text, stdin=None if stdin_text is not None else subprocess.DEVNULL,
                              timeout=timeout)
        row = {"label": stem, "argv": argv if len(" ".join(argv)) < 4000 else argv[:3] + ["…"],
               "cwd": str(cwd) if cwd else None, "exit": proc.returncode,
               "elapsed_ms": round((time.monotonic() - start) * 1000)}
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        self.rows.append(row)
        return proc, row

    def finish(self, summary):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def fixture(prefix):
    root = Path(tempfile.mkdtemp(prefix=prefix)).resolve()
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    subprocess.run(["git", "-C", str(root), "-c", "user.name=lab", "-c", "user.email=lab@example.invalid",
                    "commit", "-q", "--allow-empty", "-m", "fixture"], check=True)
    (root / "AGENTS.md").write_text("Do not commit. Work only on what the prompt asks for.\n")
    return root


def keep(case, root, label):
    """Copy the fixture's files (not .git) into the case directory as the specimen."""
    dest = case.dir / f"specimen-{label}"
    for f in sorted(root.rglob("*")):
        if f.is_file() and ".git" not in f.relative_to(root).parts and "chrome-profile" not in f.parts:
            target = dest / f.relative_to(root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, target)


def slugs_in(text):
    counts = {}
    for m in re.findall(r"\bgpt-\d+(?:\.\d+)*-[a-z]+\b|\bclaude-(?:opus|sonnet|haiku|fable)-[0-9][0-9a-z-]*", text):
        counts[m] = counts.get(m, 0) + 1
    return counts


def codex_agent(case, label, prompt, root, main_model, env=None, sandbox="workspace-write"):
    argv = ["codex", "exec", "--ignore-user-config", "--ephemeral", "--json", "-m", main_model,
            "-s", sandbox, "-c", "features.hooks=false", "-c", "agents.enabled=true", "-C", str(root), "-"]
    proc, row = case.run(label, argv, env=env, stdin_text=prompt)
    usage = [json.loads(l).get("usage") for l in proc.stdout.splitlines() if l.startswith("{") and '"usage"' in l]
    usage = [u for u in usage if u]
    row["usage"] = usage[-1] if usage else None
    final = ""
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        item = event.get("item") or {}
        if item.get("type") == "agent_message":
            final = item.get("text", final)
    return {"exit": proc.returncode, "main_model": main_model, "ids_seen_in_events": slugs_in(proc.stdout),
            "resolver_calls": proc.stdout.count("latest-model.py"), "final_message": final,
            "elapsed_ms": row["elapsed_ms"], "usage": row["usage"]}


def claude_agent(case, label, prompt, root, main_model, env=None, allowed=()):
    argv = ["claude", "-p", prompt, "--plugin-dir", str(SUBJECT), "--setting-sources", "project",
            "--model", main_model, "--output-format", "stream-json", "--verbose",
            "--permission-mode", "acceptEdits", "--allowedTools", *allowed]
    proc, row = case.run(label, argv, env=env, cwd=root)
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            pass
    result = next((e for e in reversed(events) if e.get("type") == "result"), {})
    agent_calls, bash_calls = [], []
    for e in events:
        message = e.get("message") if isinstance(e.get("message"), dict) else {}
        content = message.get("content")
        for block in content if isinstance(content, list) else []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                if block.get("name") in ("Task", "Agent"):
                    agent_calls.append({k: block["input"].get(k) for k in ("subagent_type", "model", "description")})
                elif block.get("name") == "Bash":
                    bash_calls.append(block["input"].get("command", "")[:300])
    row["usage"] = result.get("usage")
    return {"exit": proc.returncode, "main_model": main_model, "model_usage": list((result.get("modelUsage") or {}).keys()),
            "agent_calls": agent_calls, "resolver_bash_calls": [c for c in bash_calls if "latest-model.py" in c],
            "final_message": result.get("result"), "elapsed_ms": row["elapsed_ms"]}


# ---------------------------------------------------------------- claude-x-codex

def blocks_after(markdown, heading):
    start = markdown.index(heading)
    fence = markdown.index("```bash\n", start) + len("```bash\n")
    return markdown[fence:markdown.index("```", fence)]


def cxc_fixture(tag):
    root = fixture(f"cxc-{tag}-")
    doc = (SUBJECT / "skills/run/references/transport-standalone.md").read_text()
    worktree = blocks_after(doc, "## Worktrees").split("# cleanup")[0]
    feature = root / ".claude-x-codex" / "probe"
    for sub in ("tasks", "returns", "reviews"):
        (feature / sub).mkdir(parents=True)
    task = ("# Task w1: create one file\nCreate `hello.txt` containing the single line `hi`. Change nothing else.\n"
            "## Return format\n### Changed files\n### Gate result\n")
    (feature / "tasks" / "w1.md").write_text(task)
    (feature / "tasks" / "w2.md").write_text(task.replace("w1", "w2"))
    (root / "note.txt").write_text("one line\n")
    subprocess.run(["git", "-C", str(root), "add", "note.txt"], check=True)
    (feature / "reviews" / "p1-prompt.md").write_text(
        "You are reviewing a one-line diff. Run `git diff --cached` and review it. Report findings only.\n"
        "Output only JSON matching the provided schema.\n")
    return root, doc, worktree


def fill(block, n):
    return (block.replace("<plugin>", str(SUBJECT)).replace("<feature>", "probe").replace("<id>", "w1")
            .replace("<phase>", "p1").replace("<n>", str(n)))


def w01(case, product):
    root, doc, worktree = cxc_fixture("w01")
    env = env_with(CXC_WORKER_MODEL="gpt-5.6-luna", CXC_REVIEW_MODEL="gpt-6-sol",
                   CXC_CLAUDE_WORKER="claude-sonnet-5-5", CXC_CLAUDE_REVIEWER=None,
                   CXC_WORKER_EFFORT="low", CXC_REVIEW_EFFORT="low")
    out = {}
    case.run("worktree", ["bash", "-c", fill(worktree, 1)], env=env, cwd=root)
    for label, heading, n in (("codex-worker", "## Codex worker", 1), ("codex-reviewer", "## Codex reviewer", 1),
                              ("claude-worker", "## Claude worker", 1), ("claude-reviewer", "## Claude reviewer", 2)):
        script = fill(blocks_after(doc, heading), n)
        if label == "claude-worker":
            script = script.replace("w1", "w2").replace(".claude-x-codex/wt/w2", ".claude-x-codex/wt/w1")
        proc, row = case.run(label, ["bash", "-c", script], env=env, cwd=root)
        feature = root / ".claude-x-codex" / "probe"
        log = {"codex-worker": feature / "returns/w1.log", "codex-reviewer": feature / "reviews/p1-r1.log"}.get(label)
        header = None
        if log and log.exists():
            m = re.search(r"^model:\s*(\S+)", log.read_text(), re.M)
            header = m.group(1) if m else None
        out[label] = {"exit": proc.returncode, "stderr": proc.stderr.strip()[-600:], "stdout": proc.stdout.strip()[-300:],
                      "run_header_model": header, "elapsed_ms": row["elapsed_ms"]}
    keep(case, root, "w01")
    return out


def w02(case, product):
    root, doc, worktree = cxc_fixture("w02")
    case.run("worktree", ["bash", "-c", fill(worktree, 1)], cwd=root)
    out = {}
    with tempfile.TemporaryDirectory(prefix="w02-empty-home-") as empty:
        proc, _ = case.run("codex-worker-empty-home", ["bash", "-c", fill(blocks_after(doc, "## Codex worker"), 1)],
                           env=env_with(CODEX_HOME=empty), cwd=root)
        out["codex-worker-empty-home"] = {"exit": proc.returncode, "stderr": proc.stderr.strip(),
                                          "child_started": (root / ".claude-x-codex/probe/returns/w1.log").exists()}
    proc, _ = case.run("claude-worker-alias-redirected", ["bash", "-c", fill(blocks_after(doc, "## Claude worker"), 1)],
                       env=env_with(ANTHROPIC_DEFAULT_SONNET_MODEL=HAIKU), cwd=root)
    out["claude-worker-alias-redirected"] = {"exit": proc.returncode, "stderr": proc.stderr.strip(),
                                             "child_started": (root / ".claude-x-codex/probe/returns/w1.raw.json").exists()}
    return out


def w03(case, product):
    root = fixture("cxc-w03-")
    (root / "note.txt").write_text("one line\n")
    prompt = (f"The user explicitly asks you to orchestrate this task with the claude-x-codex run skill: "
              f"add a second line `two` to note.txt. Read and follow the actual skill at {SUBJECT}/skills/run/SKILL.md "
              f"(its plugin root, <plugin>, is {SUBJECT}). For this probe, perform only Setup and the 'Newest model per "
              "family' step, then stop before planning or dispatching anything. Report: every command you ran, the "
              "model id you resolved for yourself (main), the codex-bulk worker, the Codex reviewer and the Claude "
              "reviewer, and anything you would tell the user about the models. Do not edit files or commit.")
    return codex_agent(case, "codex-main", prompt, root, "gpt-6-sol")


# ---------------------------------------------------------------- plan-smith

def n01(case, product):
    root = fixture("ps-n01-")
    (root / "source.txt").write_text("A local offline note app for one person; title and body records, no sync and no concurrency.\n")
    prompt = (f"Use the actual plan-smith forge skill at {SUBJECT}/skills/forge/SKILL.md (its plugin root, <plugin>, is "
              f"{SUBJECT}) and its Codex adapter for {PLAN_TASK}. I confirm the task, no sync/concurrency, human "
              "implementer, rejected hosted database, frame=backward and style=opus. These inputs are already approved; "
              "do not ask again. Keep the plan under 250 words. Execute the real isolated writer route; the main agent "
              "must not write the plan itself. Read source.txt. Do not implement application code or commit. Report the "
              "packet's run stamp, the plan, the command you used to choose the writer's model and its output, and "
              "the id the writer actually ran with and where you read it.")
    out = codex_agent(case, "codex-main", prompt, root, "gpt-6-sol",
                      env=env_with(PLAN_SMITH_CODEX_MODEL=None, PLAN_SMITH_CODEX_EFFORT="medium"))
    keep(case, root, "n01")
    return out


def n02(case, product):
    root = fixture("ps-n02-")
    (root / "source.txt").write_text("A local offline note app for one person; title and body records, no sync and no concurrency.\n")
    prompt = (f"/plan-smith:forge frame=backward style=opus {PLAN_TASK}. I confirm the task, no sync/concurrency, human "
              "implementer, rejected hosted database; these inputs are already approved, so skip the confirmation "
              "question. Keep the plan under 250 words. Read source.txt. Do not implement code or commit.")
    out = claude_agent(case, "claude-main", prompt, root, "opus",
                       allowed=("Bash(python3:*)", "Bash(wc:*)", "Bash(mkdir:*)", "Read", "Write", "Glob", "Grep"))
    keep(case, root, "n02")
    return out


# ---------------------------------------------------------------- ux-ui

def ui_fixture(tag):
    root = fixture(f"ui-{tag}-")
    measure = root / ".ux-ui/measure/probe"
    measure.mkdir(parents=True)
    html = root / "screen.html"
    html.write_text('<!doctype html><meta charset="utf-8"><title>Review fixture</title><style>body{font:16px sans-serif;'
                    'background:#fff;color:#aaa}button{width:24px;height:18px;font-size:8px}main{width:220px;overflow:hidden}'
                    '</style><main><h1>Account</h1><p>550e8400-e29b-41d4-a716-446655440000</p><button>Save</button></main>')
    try:  # headless Chrome sometimes writes the PNG and then fails to exit (codex-parity-1.3.0 saw the same)
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                        f"--user-data-dir={root / 'chrome-profile'}", f"--screenshot={measure / 'default__desktop.png'}",
                        "--window-size=1440,900", html.as_uri()], capture_output=True, timeout=60)
    except subprocess.TimeoutExpired:
        pass
    if not (measure / "default__desktop.png").exists():
        raise RuntimeError("Chrome capture failed")
    (measure / "context.md").write_text("Web account screen, real Chrome headless render, default desktop only.\n")
    (measure / "signals.md").write_text("No accessibility, network or console audit was performed.\n")
    (measure / "snapshots.md").write_text("No structure snapshot captured.\n")
    return root


def r01(case, product):
    root = ui_fixture("r01")
    prompt = (f"Use the actual ux-ui build skill at {SUBJECT}/skills/build/SKILL.md (its plugin root, <plugin>, is {SUBJECT}) "
              "and its Codex adapter. The measurement for the screen in screen.html is already captured in "
              ".ux-ui/measure/probe. Perform only the art-director dispatch step for it, exactly as the adapter says, "
              "then stop: no new captures, no source edits, no approval, no commit. Report the command you used to "
              "choose the director's model and its output, the id the director actually ran with and where you read "
              "it, and the director's verdict.")
    out = codex_agent(case, "codex-main", prompt, root, "gpt-6-sol",
                      env=env_with(UX_UI_CODEX_REVIEW_MODEL=None, UX_UI_CODEX_REVIEW_EFFORT="medium"))
    keep(case, root, "r01")
    return out


def r02(case, product):
    root = ui_fixture("r02")
    prompt = ("/ux-ui:build The measurement for the screen in screen.html is already captured in .ux-ui/measure/probe. "
              "Perform only the art-director dispatch step for it, exactly as the skill says, then stop: no new "
              "captures, no source edits, no approval, no commit. Report what you ran and the outcome.")
    out = claude_agent(case, "claude-main", prompt, root, "sonnet", env=env_with(ANTHROPIC_DEFAULT_OPUS_MODEL=HAIKU),
                       allowed=("Bash(python3:*)", "Read", "Glob", "Grep"))
    keep(case, root, "r02")
    return out


# ---------------------------------------------------------------- harness

def m01(case, product):
    installer = SUBJECT / "skills/build/scripts/install-hooks.py"
    resolver = (SUBJECT / "scripts/latest-model.py").read_bytes()
    out = {}
    for host in ("claude", "codex", "both"):
        root = fixture(f"hn-m01-{host}-")
        steps = {}
        for step, extra in (("dry-run", ["--dry-run"]), ("install", []), ("check", ["--check"]), ("reinstall", [])):
            proc, _ = case.run(f"{host}-{step}", [sys.executable, str(installer), "--project", str(root), "--host", host] + extra)
            steps[step] = {"exit": proc.returncode, "stdout": proc.stdout.strip()[-400:], "stderr": proc.stderr.strip()[-300:]}
        copies = {}
        for h in ("claude", "codex"):
            p = root / f".{h}/scripts/latest-model.py"
            copies[h] = {"exists": p.exists(), "identical": p.exists() and p.read_bytes() == resolver,
                         "executable": p.exists() and os.access(p, os.X_OK)}
        out[host] = {"steps": steps, "copies": copies,
                     "files": sorted(str(f.relative_to(root)) for f in root.rglob("*") if f.is_file() and ".git" not in f.relative_to(root).parts)}
        if host == "codex":
            out["_codex_fixture"] = str(root)
    return out


def m02(case, product):
    m01 = json.loads((RUNS / "M01" / "summary.json").read_text())
    root = Path(m01["_codex_fixture"])
    doc = (SUBJECT / "skills/build/references/host-codex.md").read_text()
    match = re.search(r'^python3 "\$\(git rev-parse --show-toplevel\)/\.codex/scripts/latest-model\.py".*$', doc, re.M)
    if not match:
        return {"recipe_found": False}
    recipe = match.group(0).replace("<main session model id>", "gpt-6-sol").replace("<effort>", "low")
    proc, _ = case.run("recipe", ["bash", "-c", recipe], env=env_with(HARNESS_CODEX_ARCH_MODEL="gpt-6-sol"), cwd=root)
    out = {"recipe": recipe, "exit": proc.returncode, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()}
    if proc.returncode == 0:
        run, row = case.run("review", ["codex", "exec", "-m", proc.stdout.strip(), "-c", 'model_reasoning_effort="low"',
                                       "-s", "read-only", "--ephemeral", "Reply with the single word OK."], cwd=root)
        both = run.stdout + "\n" + run.stderr
        header = re.search(r"^model:\s*(\S+)", both, re.M)
        tokens = re.search(r"tokens used\s*\n\s*([\d,]+)", both)
        row["total_tokens"] = int(tokens.group(1).replace(",", "")) if tokens else None
        out["review"] = {"exit": run.returncode, "run_header_model": header.group(1) if header else None,
                         "tokens_used": row["total_tokens"]}
    return out


CASES = {"claude-x-codex": {"W01": w01, "W02": w02, "W03": w03},
         "plan-smith": {"N01": n01, "N02": n02},
         "ux-ui": {"R01": r01, "R02": r02},
         "harness": {"M01": m01, "M02": m02}}[PLUGIN]


def summarize_raw(name):
    """Derive a Claude case's summary from its saved raw stdout without rerunning it."""
    case = Case(name)
    raw = sorted(case.dir.glob("*-claude-main.stdout"))[0]

    class Saved:
        returncode = 0
        stdout = raw.read_text()

    def replay(label, argv, env=None, cwd=None, **_):
        row = {"label": raw.stem, "argv": ["(replayed from saved stdout)"], "cwd": None, "exit": 0, "elapsed_ms": None}
        case.rows.append(row)
        return Saved, row

    case.run = replay
    out = claude_agent(case, "claude-main", "", Path("."), "(see stdout)")
    out["note"] = "summary derived after a runner parse error from the saved raw stdout; the agent run was not repeated"
    case.finish(out)
    return out


def main():
    if sys.argv[1] == "--summarize-raw":
        print(json.dumps(summarize_raw(sys.argv[2]), indent=1, ensure_ascii=False)[:3000])
        return
    product = Path(sys.argv[1]).resolve()
    ensure_subject(product)
    for name in sys.argv[2:] or list(CASES):
        case = Case(name)
        if (case.dir / "DONE").exists():
            print(f"{name}: DONE, skipped")
            continue
        if case.dir.exists():
            sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
        case.dir.mkdir(parents=True)
        print(f"{name}: running", flush=True)
        case.finish(CASES[name](case, product))
        print(f"{name}: done", flush=True)


if __name__ == "__main__":
    main()
