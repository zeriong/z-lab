#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py <because-i-needed checkout> [CASE ...]

State-aware: runs/<case>/DONE is skipped; a case directory without DONE is refused. The subject is copied once with a
sha256 list and verified on every run.
"""
import hashlib
import itertools
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
SUBJECT = LAB / "subject" / "peer-coding"
MANIFEST = LAB / "subject" / "MANIFEST.sha256"
CASES = ("M01", "M02", "M03", "M04")
AUTH = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex") / "auth.json"
INSTALLED = "peer-coding@because-i-needed"


def manifest_lines(root):
    return [f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root)}"
            for p in sorted(root.rglob("*")) if p.is_file()]


def ensure_subject(product):
    if not SUBJECT.exists():
        shutil.copytree(product / "plugins" / "peer-coding", SUBJECT, ignore=shutil.ignore_patterns("__pycache__"))
        MANIFEST.write_text("\n".join(manifest_lines(SUBJECT)) + "\n")
    if manifest_lines(SUBJECT) != MANIFEST.read_text().splitlines():
        sys.exit("subject does not match subject/MANIFEST.sha256")


class Case:
    def __init__(self, name):
        self.dir = RUNS / name
        self.rows = []
        self.n = 0

    def run(self, label, argv, env, cwd, timeout=900):
        self.n += 1
        stem = f"{self.n:02d}-{label}"
        start = time.monotonic()
        proc = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, stdin=subprocess.DEVNULL,
                              timeout=timeout)
        self.rows.append({"label": stem, "argv": argv if len(" ".join(argv)) < 3000 else argv[:4] + ["…"],
                          "cwd": str(cwd), "exit": proc.returncode,
                          "elapsed_ms": round((time.monotonic() - start) * 1000)})
        (self.dir / f"{stem}.stdout").write_text(proc.stdout)
        (self.dir / f"{stem}.stderr").write_text(proc.stderr)
        return proc

    def finish(self, summary):
        (self.dir / "metrics.json").write_text(json.dumps(self.rows, indent=1) + "\n")
        (self.dir / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n")
        (self.dir / "DONE").write_text(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n")


def sandbox(prefix):
    """A temporary git repository plus isolated HOME, XDG_CONFIG_HOME and CLAUDE_CONFIG_DIR."""
    base = Path(tempfile.mkdtemp(prefix=prefix)).resolve()
    repo = base / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    env = {k: v for k, v in os.environ.items() if not k.startswith("CXC_") and k != "BECAUSE_I_NEEDED_PLUGIN_DIRS"}
    for key, name in (("HOME", "home"), ("XDG_CONFIG_HOME", "xdg"), ("CLAUDE_CONFIG_DIR", "claude")):
        (base / name).mkdir()
        env[key] = str(base / name)
    env["CXC_MODE"] = "off"
    return base, repo, env


def installed_copy(base):
    root = base / "plugins" / "cache" / "because-i-needed" / "peer-coding" / "1.2.0"
    (root / "scripts").mkdir(parents=True)
    for name in ("settings.py", "latest-model.py"):
        shutil.copy2(SUBJECT / "scripts" / name, root / "scripts" / name)
    return root


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def config(env, plugin_id, options):
    write(Path(env["CLAUDE_CONFIG_DIR"]) / "settings.json", json.dumps({"pluginConfigs": {plugin_id: {"options": options}}}))


def m01(case, product):
    base, repo, env = sandbox("m01-")
    root = installed_copy(base)
    levels = ("env", "project", "config", "file")
    values = {"env": "gamma", "project": "terra", "config": "astra", "file": "luna"}
    rows = []
    for present in itertools.product((False, True), repeat=4):
        on = dict(zip(levels, present))
        child = dict(env)
        if on["env"]:
            child["CXC_REVIEW_MODEL"] = values["env"]
        project = repo / ".claude-x-codex" / "settings"
        user = Path(env["XDG_CONFIG_HOME"]) / "claude-x-codex" / "settings"
        settings_json = Path(env["CLAUDE_CONFIG_DIR"]) / "settings.json"
        for path, level, text in ((project, "project", "codex_reviewer=terra\n"), (user, "file", "codex_reviewer=luna\n")):
            write(path, text) if on[level] else path.unlink(missing_ok=True)
        config(env, INSTALLED, {"codex_reviewer": "astra"}) if on["config"] else settings_json.unlink(missing_ok=True)
        label = "-".join(level for level in levels if on[level]) or "none"
        got = case.run(f"get-{label}", ["python3", str(root / "scripts/settings.py"), "get", "codex-reviewer"], child, repo)
        status = case.run(f"status-{label}", ["python3", str(root / "scripts/settings.py"), "status", "--json"], child, repo)
        store = json.loads(status.stdout)["settings"]["codex-reviewer"]["store"] if status.returncode == 0 else None
        expected = next((values[level] for level in levels if on[level]), "sol")
        rows.append({"present": label, "value": got.stdout.strip(), "store": store, "expected": expected,
                     "ok": got.stdout.strip() == expected})
    for path in (repo / ".claude-x-codex" / "settings", Path(env["XDG_CONFIG_HOME"]) / "claude-x-codex" / "settings"):
        path.unlink(missing_ok=True)
    config(env, "peer-coding@inline", {"codex_reviewer": "astra"})
    dev = case.run("inline-dev", ["python3", str(SUBJECT / "scripts/settings.py"), "get", "codex-reviewer"], env, repo)
    inst = case.run("inline-installed", ["python3", str(root / "scripts/settings.py"), "get", "codex-reviewer"], env, repo)
    case.finish({"base": str(base), "matrix": rows, "matched": sum(r["ok"] for r in rows), "of": len(rows),
                 "inline_read_by_dev_copy": dev.stdout.strip(), "inline_read_by_installed_copy": inst.stdout.strip()})


def m02(case, product):
    dashboard = product / "plugins" / "dashboard" / "scripts" / "dashboard.py"
    out = {}
    for variant in ("a-defaults", "b-project", "c-config"):
        base, repo, env = sandbox(f"m02{variant[0]}-")
        env.pop("CXC_MODE")  # the mode entry then shows its default, as a user without the variable sees it
        env["BECAUSE_I_NEEDED_PLUGIN_DIRS"] = str(SUBJECT)
        env["CODEX_HOME"] = str(base / "codex")
        if variant == "b-project":
            write(repo / ".claude-x-codex" / "settings", "codex_reviewer=astra\nreview_effort=max\n")
        if variant == "c-config":
            config(env, "peer-coding@inline", {"codex_worker": "luna"})
        out[variant] = {}
        for host in ("claude", "codex"):
            args = ["python3", str(dashboard), "--host", host, "--cwd", str(repo), "--json"]
            args += ["--enabled", ""] if host == "claude" else []
            proc = case.run(f"{variant}-{host}", args, env, repo)
            data = json.loads(proc.stdout) if proc.returncode == 0 else {}
            out[variant][host] = {"exit": proc.returncode, "line": data.get("line"),
                                  "entries": [{k: e.get(k) for k in ("label", "value", "where", "detail", "source",
                                                                     "project", "global")}
                                              for e in data.get("entries", []) if e.get("label", "").startswith("peer ")]}
    base, repo, env = sandbox("m02t-")
    timing = {}
    for role in ("worker", "reviewer"):
        timing[role] = []
        for i in range(5):
            start = time.monotonic()
            case.run(f"time-{role}-{i}", ["python3", str(SUBJECT / "scripts/settings.py"), "status", "--json", "--role",
                                          role], env, repo)
            timing[role].append(round((time.monotonic() - start) * 1000))
    case.finish({**out, "status_ms": timing})


def files(repo, env):
    project = repo / ".claude-x-codex" / "settings"
    user = Path(env["XDG_CONFIG_HOME"]) / "claude-x-codex" / "settings"
    return {"project": project.read_text() if project.exists() else None,
            "global": user.read_text() if user.exists() else None}


def m03(case, product):
    base, repo, env = sandbox("m03-")
    claude_env = dict(env)
    for key in ("HOME", "CLAUDE_CONFIG_DIR"):  # the login lives in the user's real Claude config
        claude_env[key] = os.environ.get(key) or ""
        if not claude_env[key]:
            claude_env.pop(key)
    claude_env.pop("CXC_MODE")
    out = {}
    for label, prompt in (("a-set", "/peer-coding:mode codex-reviewer astra"),
                          ("b-reviewer-global", "/peer-coding:mode reviewer astra --global"),
                          ("c-status", "/peer-coding:mode status")):
        proc = case.run(f"claude-{label}", ["claude", "-p", prompt, "--model", "sonnet", "--plugin-dir", str(SUBJECT),
                                            "--setting-sources", "project", "--permission-mode", "bypassPermissions",
                                            "--output-format", "json"], claude_env, repo, timeout=600)
        try:
            data = json.loads(proc.stdout)
        except ValueError:
            data = {}
        out[f"claude-{label}"] = {"exit": proc.returncode, "result": data.get("result"),
                                  "models": sorted((data.get("modelUsage") or {}).keys()), "usage": data.get("usage"),
                                  "files_after": files(repo, env)}
    home = base / "codex-home"
    home.mkdir()
    out["auth_sha256_before"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    try:
        shutil.copy2(AUTH, home / "auth.json")
        codex_env = dict(env, CODEX_HOME=str(home))
        codex_env.pop("CXC_MODE")
        market = base / "market"
        shutil.copytree(SUBJECT, market / "plugins" / "peer-coding")
        write(market / ".claude-plugin" / "marketplace.json", json.dumps({
            "name": "because-i-needed", "owner": {"name": "lab"}, "metadata": {"description": "lab", "version": "0"},
            "plugins": [{"name": "peer-coding", "source": "./plugins/peer-coding", "version": "0", "description": "lab"}]}))
        case.run("marketplace-add", ["codex", "plugin", "marketplace", "add", str(market)], codex_env, base)
        case.run("plugin-add", ["codex", "plugin", "add", "peer-coding@because-i-needed"], codex_env, base)
        model = case.run("resolve-sol", ["python3", str(SUBJECT / "scripts/latest-model.py"), "codex", "sol", "--effort",
                                         "medium"], codex_env, base).stdout.strip()
        for label, prompt in (("d-set", "$peer-coding:mode codex-worker luna"), ("e-status", "$peer-coding:mode status")):
            proc = case.run(f"codex-{label}", ["codex", "exec", "--json", "--dangerously-bypass-hook-trust", "-m", model,
                                               "-c", 'model_reasoning_effort="medium"', "-s", "workspace-write", "-C",
                                               str(repo), prompt], codex_env, repo, timeout=900)
            info = {"model_requested": model, "exit": proc.returncode, "commands": [], "messages": [], "usage": []}
            for line in proc.stdout.splitlines():
                try:
                    event = json.loads(line)
                except ValueError:
                    continue
                item = event.get("item") or {}
                if event.get("type") == "turn.completed":
                    info["usage"].append(event.get("usage"))
                elif event.get("type") == "item.completed" and item.get("type") == "command_execution":
                    info["commands"].append({"command": item.get("command"), "exit_code": item.get("exit_code"),
                                             "output": (item.get("aggregated_output") or "")[-1500:]})
                elif event.get("type") == "item.completed" and item.get("type") == "agent_message":
                    info["messages"].append(item.get("text"))
            info["files_after"] = files(repo, env)
            out[f"codex-{label}"] = info
    finally:
        shutil.rmtree(home, ignore_errors=True)
        out["codex_home_removed"] = not home.exists()
        out["auth_sha256_after"] = hashlib.sha256(AUTH.read_bytes()).hexdigest()
    case.finish({"base": str(base), "repo": str(repo), **out})


def block(doc, heading):
    lines = doc.splitlines()
    start = lines.index(next(l for l in lines if l.startswith(heading)))
    fence = next(i for i in range(start, len(lines)) if lines[i].startswith("```")) + 1
    end = next(i for i in range(fence, len(lines)) if "latest-model.py" in lines[i])
    return "\n".join(lines[fence:end + 1])


def m04(case, product):
    doc = (SUBJECT / "skills/run/references/transport-standalone.md").read_text()
    blocks = {"codex-worker": (block(doc, "## Codex worker"), "CXC_WORKER_EFFORT"),
              "codex-reviewer": (block(doc, "## Codex reviewer"), "CXC_REVIEW_EFFORT"),
              "claude-worker": (block(doc, "## Claude worker"), "CXC_WORKER_EFFORT")}
    out = {"blocks": {k: v[0] for k, v in blocks.items()}}
    for variant in ("a-defaults", "b-project", "c-config", "d-env"):
        base, repo, env = sandbox(f"m04{variant[0]}-")
        env.pop("CODEX_HOME", None)
        if os.environ.get("CODEX_HOME"):
            env["CODEX_HOME"] = os.environ["CODEX_HOME"]  # the real catalog for the resolver
        root = installed_copy(base)
        (repo / ".claude-x-codex" / "wt" / "T1").mkdir(parents=True)
        if variant == "b-project":
            write(repo / ".claude-x-codex" / "settings", "codex_worker=luna\nworker_effort=max\nclaude_worker=haiku\n")
        if variant in ("c-config", "d-env"):
            config(env, INSTALLED, {"codex_reviewer": "astra"})
        if variant == "d-env":
            env["CXC_REVIEW_MODEL"] = "sol"
        out[variant] = {}
        for name, (text, effort) in blocks.items():
            script = text.replace("<plugin>", str(root)).replace("<id>", "T1").replace("<feature>", "f")
            script = script + f'\necho "M=$M EFFORT=${effort}"\n)'
            proc = case.run(f"{variant}-{name}", ["bash", "-c", script], env, repo)
            out[variant][name] = {"exit": proc.returncode, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()[-300:]}
    case.finish(out)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    product = Path(sys.argv[1]).resolve()
    wanted = sys.argv[2:] or list(CASES)
    RUNS.mkdir(exist_ok=True)
    stamp = RUNS / "PRODUCT"
    if not stamp.exists():
        head = subprocess.run(["git", "-C", str(product), "rev-parse", "HEAD"], capture_output=True, text=True).stdout
        stamp.write_text(f"{product}\n{head.strip()}\n")
        (RUNS / "VERSIONS").write_text(subprocess.run(["sh", "-c", "claude --version; codex --version; sw_vers -productVersion"],
                                                      capture_output=True, text=True).stdout)
    ensure_subject(product)
    for name in wanted:
        case_dir = RUNS / name
        if (case_dir / "DONE").exists():
            print(f"{name}: done, skipped")
            continue
        if case_dir.exists():
            sys.exit(f"{name}: incomplete run directory exists; inspect and remove it to rerun")
        case_dir.mkdir()
        globals()[name.lower()](Case(name), product)
        print(f"{name}: done")


if __name__ == "__main__":
    main()
