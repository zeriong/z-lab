#!/usr/bin/env python3
"""Run SPEC.md's cases. Usage: python3 run.py [M01 M02 M03 M04 M05 M06]

State-aware: a case directory holding DONE is skipped, an existing one without DONE is refused. Fixture, server,
rename and snapshots come from the sibling ../marketplace-rename-2.1.285/run.py, imported read-only.
"""
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile

LAB = Path(__file__).resolve().parent
RUNS = LAB / "runs"
_spec = importlib.util.spec_from_file_location("rename_lab", LAB.parent / "marketplace-rename-2.1.285" / "run.py")
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)
OLD, NEW = R.OLD, R.NEW


class Case(R.Case):
    def __init__(self, name):
        super().__init__(name)
        self.dir = RUNS / name


def bump(src, version="1.0.1"):
    root = src / "plugins" / "probe-a"
    for manifest in (root / ".claude-plugin" / "plugin.json", root / ".codex-plugin" / "plugin.json"):
        data = json.loads(manifest.read_text())
        data["version"] = version
        R.write_json(manifest, data)
    catalog = src / ".claude-plugin" / "marketplace.json"
    data = json.loads(catalog.read_text())
    for entry in data["plugins"]:
        if entry["name"] == "probe-a":
            entry["version"] = version
    R.write_json(catalog, data)
    R.git("commit", "-qam", f"probe-a {version}", cwd=src)
    R.git("push", "-q", "origin", "main", cwd=src)


def codex_snapshot(case, label, home, cwd):
    R.codex_snapshot(case, label, home, cwd)
    text = (case.dir / f"{case.n:02d}-{label}-prompt-input.out").read_text()
    roots = dict(re.findall(r"- `(r\d+)` = `([^`]*)`", text))
    skills = re.findall(r"- (probe-[ab]:\w+): .*?\(file: (r\d+)/([^)]*)\)", text)
    case.snaps[label]["probe_skills"] = [{"skill": s, "root": roots.get(r), "file": f} for s, r, f in skills]


def claude_setup(case, base, server, name):
    cfg, project = base / f"{name}-cfg", base / f"{name}-project"
    project.mkdir()
    R.git("init", "-q", cwd=project)
    src = R.make_probe(base, server, name)
    env = R.base_env(CLAUDE_CONFIG_DIR=str(cfg))
    return cfg, project, src, (lambda label, *args: case.run(label, ["claude", "plugin", *args], env, project))


def codex_setup(case, base, server, name, source):
    home, cwd = base / f"{name}-codex", base / f"{name}-cwd"
    home.mkdir()
    cwd.mkdir()
    src = R.make_probe(base, server, name)
    where = server.url(name) if source == "git" else str(src)
    env = R.base_env(CODEX_HOME=str(home))
    return home, cwd, src, where, (lambda label, *args: case.run(label, ["codex", "plugin", *args], env, cwd))


def m01(case, base, server):
    cfg, project, src, c = claude_setup(case, base, server, "m01")
    c("add", "marketplace", "add", server.url("m01"))
    c("install-a-old", "install", f"probe-a@{OLD}")
    R.claude_snapshot(case, "1-installed", cfg, project)
    R.rename(src)
    bump(src)
    c("update-old", "marketplace", "update", OLD)
    R.claude_snapshot(case, "2-after-marketplace-update", cfg, project)
    c("update-a-old", "update", f"probe-a@{OLD}")
    R.claude_snapshot(case, "3-after-plugin-update", cfg, project)


def m02(case, base, server):
    home, cwd, src, where, c = codex_setup(case, base, server, "m02", "git")
    c("add", "marketplace", "add", where)
    c("add-a-old", "add", f"probe-a@{OLD}")
    codex_snapshot(case, "1-installed", home, cwd)
    R.rename(src)
    bump(src)
    c("upgrade-named", "marketplace", "upgrade", OLD)
    c("upgrade-all", "marketplace", "upgrade")
    codex_snapshot(case, "2-after-upgrade", home, cwd)


def codex_two_installed(case, home, cwd, where, c):
    c("add", "marketplace", "add", where)
    c("add-a-old", "add", f"probe-a@{OLD}")
    c("add-b-old", "add", f"probe-b@{OLD}")
    with (home / "config.toml").open("a") as f:
        f.write(f'\n[plugins."probe-a@{OLD}".mcp_servers.probe-mcp]\nenabled = false\n')
    codex_snapshot(case, "1-installed", home, cwd)


def m03(case, base, server):
    home, cwd, src, where, c = codex_setup(case, base, server, "m03", "git")
    codex_two_installed(case, home, cwd, where, c)
    R.rename(src)
    c("remove-a-old", "remove", f"probe-a@{OLD}")
    c("remove-b-old", "remove", f"probe-b@{OLD}")
    codex_snapshot(case, "2-after-plugin-remove", home, cwd)
    c("remove-marketplace-old", "marketplace", "remove", OLD)
    c("readd", "marketplace", "add", where)
    c("add-a-new", "add", f"probe-a@{NEW}")
    codex_snapshot(case, "3-migrated", home, cwd)


def m04(case, base, server):
    home, cwd, src, where, c = codex_setup(case, base, server, "m04", "git")
    codex_two_installed(case, home, cwd, where, c)
    R.rename(src)
    c("remove-marketplace-old", "marketplace", "remove", OLD)
    codex_snapshot(case, "2-after-marketplace-remove", home, cwd)
    c("remove-a-old", "remove", f"probe-a@{OLD}")
    c("remove-b-old", "remove", f"probe-b@{OLD}")
    codex_snapshot(case, "3-after-plugin-remove", home, cwd)
    c("readd", "marketplace", "add", where)
    c("add-a-new", "add", f"probe-a@{NEW}")
    codex_snapshot(case, "4-migrated", home, cwd)


def m05(case, base, server):
    home, cwd, src, where, c = codex_setup(case, base, server, "m05", "path")
    c("add", "marketplace", "add", where)
    c("add-a-old", "add", f"probe-a@{OLD}")
    codex_snapshot(case, "1-installed", home, cwd)
    R.rename(src)
    c("remove-a-old", "remove", f"probe-a@{OLD}")
    codex_snapshot(case, "2-after-plugin-remove", home, cwd)
    c("remove-marketplace-old", "marketplace", "remove", OLD)
    c("readd", "marketplace", "add", where)
    c("add-a-new", "add", f"probe-a@{NEW}")
    codex_snapshot(case, "3-migrated", home, cwd)


def m06(case, base, server):
    cfg, project, src, c = claude_setup(case, base, server, "m06")
    url = server.url("m06")
    c("add", "marketplace", "add", url)
    c("install-a-project", "install", f"probe-a@{OLD}", "--scope", "project")
    c("install-b-local", "install", f"probe-b@{OLD}", "--scope", "local")
    path = project / ".claude" / "settings.json"
    data = json.loads(path.read_text()) if path.exists() else {}
    data.setdefault("extraKnownMarketplaces", {})[OLD] = {"source": {"source": "git", "url": url}}
    data.setdefault("enabledPlugins", {})[f"probe-a@{OLD}"] = True
    R.write_json(path, data)
    R.claude_snapshot(case, "1-installed", cfg, project)
    R.rename(src)
    c("remove-old", "marketplace", "remove", OLD)
    c("readd", "marketplace", "add", url)
    c("install-a-new-project", "install", f"probe-a@{NEW}", "--scope", "project")
    c("install-b-new-local", "install", f"probe-b@{NEW}", "--scope", "local")
    R.claude_snapshot(case, "2-migrated", cfg, project)


CASES = {"M01": m01, "M02": m02, "M03": m03, "M04": m04, "M05": m05, "M06": m06}


def main():
    names = sys.argv[1:] or list(CASES)
    base = Path(tempfile.mkdtemp(prefix="mkt-migrate-")).resolve()
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
            case.finish({"base": str(base)})
            print(f"{name}: done", flush=True)
    finally:
        server.stop()


if __name__ == "__main__":
    main()
