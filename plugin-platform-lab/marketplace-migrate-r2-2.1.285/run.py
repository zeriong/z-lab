#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [V00 N01 N02 N03 N04 N05]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Fixture, server,
rename and bump come from the siblings ../marketplace-rename-2.1.285/run.py and ../marketplace-migrate-2.1.285/run.py,
imported read-only.
"""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


R = load("rename_lab_r2", LAB.parent / "marketplace-rename-2.1.285" / "run.py")
MG = load("migrate_lab_r2", LAB.parent / "marketplace-migrate-2.1.285" / "run.py")
OLD, NEW = R.OLD, R.NEW
SESSION = ["claude", "-p", "hi", "--output-format", "stream-json", "--verbose", "--include-hook-events"]


class Case(R.Case):
    def __init__(self, name):
        super().__init__(name)
        self.dir = RUNS / name
        self.sessions = {}


def session(case, label, cfg, cwd):
    proc = case.run(f"{label}-{Path(cwd).name}-session", SESSION, R.base_env(CLAUDE_CONFIG_DIR=str(cfg)), cwd)
    out = {"exit": proc.returncode, "plugins": [], "skills": [], "slash_commands": [], "mcp_servers": [], "hooks": [],
           "version": None, "tokens": None, "result": None, "unparsed_lines": 0}
    for line in proc.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            out["unparsed_lines"] += 1
            continue
        if event.get("type") == "system" and event.get("subtype") == "init":
            out["version"] = event.get("claude_code_version")
            out["plugins"] = [p for p in event.get("plugins", []) if p.get("name", "").startswith("probe")]
            out["skills"] = [s for s in event.get("skills", []) if s.startswith("probe")]
            out["slash_commands"] = [s for s in event.get("slash_commands", []) if s.startswith("probe")]
            out["mcp_servers"] = [m for m in event.get("mcp_servers", []) if "probe" in m.get("name", "")]
        elif event.get("type") == "system" and event.get("subtype") == "hook_response" and "probe" in str(event.get("output")):
            out["hooks"].append({k: event.get(k) for k in ("hook_event", "output", "exit_code", "outcome")})
        elif event.get("type") == "result":
            usage = event.get("usage") or {}
            out["tokens"] = {"input": usage.get("input_tokens"), "output": usage.get("output_tokens")}
            out["result"] = event.get("result")
    case.sessions[f"{label}@{Path(cwd).name}"] = out


def cli(case, label, cfg, cwd, projects):
    env = R.base_env(CLAUDE_CONFIG_DIR=str(cfg))
    mk = case.run(f"{label}-{Path(cwd).name}-marketplaces", ["claude", "plugin", "marketplace", "list", "--json"], env, cwd)
    pl = case.run(f"{label}-{Path(cwd).name}-plugins", ["claude", "plugin", "list", "--json"], env, cwd)

    def parse(proc):
        try:
            return json.loads(proc.stdout)
        except ValueError:
            return {"unparsed": proc.stdout[-2000:], "stderr": proc.stderr[-1000:]}
    case.snaps[f"{label}@{Path(cwd).name}"] = {
        "marketplaces": parse(mk), "plugins": parse(pl),
        "config_files": R.files_under(cfg, ["settings.json", "settings.local.json", "plugins/*.json"]),
        "project_files": {p.name: R.files_under(p, [".claude/settings.json", ".claude/settings.local.json"]) for p in projects},
        "cache_tree": R.tree(Path(cfg) / "plugins" / "cache", 3)}


def project(base, name):
    path = base / name
    path.mkdir()
    R.git("init", "-q", cwd=path)
    return path


def setup(case, base, server, name):
    cfg = base / f"{name}-cfg"
    src = R.make_probe(base, server, name)
    env = R.base_env(CLAUDE_CONFIG_DIR=str(cfg))
    return cfg, src, server.url(name), (lambda label, cwd, *args: case.run(label, ["claude", "plugin", *args], env, cwd))


def v00(case, base, server):
    env = R.base_env()
    case.run("claude-version", ["claude", "--version"], env, base)
    case.run("codex-version", ["codex", "--version"], env, base)


def n01(case, base, server):
    cfg, src, url, c = setup(case, base, server, "n01")
    p = project(base, "n01-project")
    c("add", p, "marketplace", "add", url)
    c("install-a-old", p, "install", f"probe-a@{OLD}")
    session(case, "1-installed", cfg, p)
    R.rename(src)
    MG.bump(src)
    c("update-marketplace-old", p, "marketplace", "update", OLD)
    c("update-a-old", p, "update", f"probe-a@{OLD}")
    session(case, "2-updated", cfg, p)
    for verb in ("update", "disable", "enable", "uninstall"):
        c(f"{verb}-a-new", p, verb, f"probe-a@{NEW}")
    cli(case, "3-after-new-id-commands", cfg, p, [p])
    session(case, "3-after-new-id-commands", cfg, p)


def n02(case, base, server):
    cfg, src, url, c = setup(case, base, server, "n02")
    p = project(base, "n02-project")
    c("add", p, "marketplace", "add", url)
    c("install-a-old", p, "install", f"probe-a@{OLD}")
    c("install-b-old", p, "install", f"probe-b@{OLD}")
    session(case, "1-installed", cfg, p)
    R.rename(src)
    c("remove-old", p, "marketplace", "remove", OLD)
    c("readd", p, "marketplace", "add", url)
    c("install-a-new", p, "install", f"probe-a@{NEW}")
    cli(case, "2-migrated", cfg, p, [p])
    session(case, "2-migrated", cfg, p)


def n03(case, base, server):
    cfg, src, url, c = setup(case, base, server, "n03")
    p1, p2 = project(base, "n03-p1"), project(base, "n03-p2")
    neutral = base / "n03-neutral"
    neutral.mkdir()

    def snapshot(label):
        for cwd in (p1, p2, neutral):
            cli(case, label, cfg, cwd, [p1, p2])
        for cwd in (p1, p2, neutral):
            session(case, label, cfg, cwd)
    c("add", neutral, "marketplace", "add", url)
    c("install-a-old-p1-project", p1, "install", f"probe-a@{OLD}", "--scope", "project")
    c("install-b-old-p1-local", p1, "install", f"probe-b@{OLD}", "--scope", "local")
    c("install-a-old-p2-project", p2, "install", f"probe-a@{OLD}", "--scope", "project")
    c("install-b-old-user", neutral, "install", f"probe-b@{OLD}")
    snapshot("1-installed")
    R.rename(src)
    c("remove-old-from-p1", p1, "marketplace", "remove", OLD)
    snapshot("2-after-remove")
    c("readd", neutral, "marketplace", "add", url)
    c("install-b-new-user", neutral, "install", f"probe-b@{NEW}")
    c("install-a-new-p1-project", p1, "install", f"probe-a@{NEW}", "--scope", "project")
    c("install-b-new-p1-local", p1, "install", f"probe-b@{NEW}", "--scope", "local")
    c("install-a-new-p2-project", p2, "install", f"probe-a@{NEW}", "--scope", "project")
    snapshot("3-migrated")


def declared(case, base, server, name, scope):
    cfg, src, url, c = setup(case, base, server, name)
    p = project(base, f"{name}-project")

    def snapshot(label):
        cli(case, label, cfg, p, [p])
        session(case, label, cfg, p)
    c("add", p, "marketplace", "add", url, "--scope", scope)
    c("install-a-old", p, "install", f"probe-a@{OLD}", "--scope", scope)
    snapshot("1-installed")
    R.rename(src)
    c("update-marketplace-old", p, "marketplace", "update", OLD)
    session(case, "2-after-update", cfg, p)
    c("remove-old", p, "marketplace", "remove", OLD)
    snapshot("3-after-remove")
    c("readd", p, "marketplace", "add", url, "--scope", scope)
    c("install-a-new", p, "install", f"probe-a@{NEW}", "--scope", scope)
    snapshot("4-migrated")


CASES = {"V00": v00, "N01": n01, "N02": n02, "N03": n03,
         "N04": lambda case, base, server: declared(case, base, server, "n04", "project"),
         "N05": lambda case, base, server: declared(case, base, server, "n05", "local")}


def main():
    names = sys.argv[1:] or list(CASES)
    base = Path(tempfile.mkdtemp(prefix="mkt-migrate-r2-")).resolve()
    server = R.Server(base)
    try:
        for name in names:
            case = Case(name)
            if (case.dir / "DONE").exists():
                print(f"{name}: DONE, skipped")
                continue
            if case.dir.exists():
                sys.exit(f"{name}: incomplete directory exists; use a new sibling experiment")
            case.dir.mkdir(parents=True)
            print(f"{name}: running", flush=True)
            CASES[name](case, base, server)
            case.finish({"sessions": case.sessions, "base": str(base)})
            print(f"{name}: done", flush=True)
    finally:
        server.stop()


if __name__ == "__main__":
    main()
